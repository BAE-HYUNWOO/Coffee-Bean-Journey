import {
  getColorBuckets,
  getCategoryLabel,
  getDisplayName,
  getOrderedCategories,
  getQuartileAssignments,
} from "./data.js";
import { chartFrame, getSvg } from "../../components/chartFrame.js";

const BAR_MARGINS = {
  top: 24,
  right: 28,
  bottom: 48,
  left: 182,
};

const SCATTER_MARGINS = {
  top: 24,
  right: 28,
  bottom: 48,
  left: 62,
};

const STACK_MARGINS = {
  top: 24,
  right: 28,
  bottom: 52,
  left: 62,
};

const MEASURE_CONFIGS = {
  coffee: {
    label: "Coffee intake",
    unit: "cups/day",
    title: "Which countries drink more on average?",
    description: "Countries are ordered by average coffee intake per person. Use the buttons to switch the ranking to sleep hours or caffeine intake.",
    palette: ["#5b3a26", "#7a4a2e", "#955f36", "#b07342", "#c6874e", "#d49b64", "#ddb07f", "#e6c39a"],
  },
  sleep: {
    label: "Sleep hours",
    unit: "hours",
    title: "Which countries sleep more on average?",
    description: "This view reorders the same countries by average sleep time, which helps compare how lifestyle differences travel with coffee habits.",
    palette: ["#6f4e37", "#8c5a38", "#a87044", "#c48953", "#d9a56f", "#e6bf93"],
  },
  caffeine: {
    label: "Caffeine",
    unit: "mg/day",
    title: "Which countries consume more caffeine?",
    description: "This ordering uses average caffeine intake instead of coffee cups, which is useful when drinks vary in strength.",
    palette: ["#7a4a2e", "#955f36", "#b07342", "#c6874e", "#d49b64", "#ddb07f", "#e6c39a"],
  },
};

const AGE_CONFIG = {
  coffee: {
    label: "Life stage",
    title: "Does coffee intake change across life stages?",
    description: "Averages are grouped into age bands to see whether the habit tilts younger or older.",
  },
  caffeine: {
    label: "Life stage",
    title: "Does caffeine intake change across life stages?",
    description: "Averages are grouped into age bands to compare caffeine intensity across adulthood.",
  },
};

const SCATTER_CONFIGS = {
  Sleep_Quality: {
    label: "Sleep quality",
    title: "Coffee intake vs. sleep hours",
    description: "Every dot is one person. Color shows how people rate their sleep.",
    colors: {
      Excellent: "#5b3a26",
      Good: "#9b6840",
      Fair: "#c78a56",
      Poor: "#e2c19d",
    },
  },
  Stress_Level: {
    label: "Stress level",
    title: "Coffee intake vs. sleep hours",
    description: "Every dot is one person. Color shows reported stress.",
    colors: {
      Low: "#5b3a26",
      Medium: "#9b6840",
      High: "#e2c19d",
    },
  },
  Gender: {
    label: "Gender",
    title: "Coffee intake vs. sleep hours",
    description: "Every dot is one person. Color shows gender category.",
    colors: {
      Female: "#8c5a38",
      Male: "#5b3a26",
      Other: "#c78a56",
    },
  },
};

const STACK_CONFIGS = {
  Sleep_Quality: {
    label: "Sleep quality",
    title: "What changes as coffee intake rises?",
    description: "People are split into coffee-intake quartiles. Each bar shows how sleep quality is distributed inside that quartile.",
    favorable: ["Excellent", "Good"],
  },
  Stress_Level: {
    label: "Stress level",
    title: "What changes as coffee intake rises?",
    description: "People are split into coffee-intake quartiles. Each bar shows how stress is distributed inside that quartile.",
    favorable: ["Low"],
  },
  Health_Issues: {
    label: "Health issues",
    title: "What changes as coffee intake rises?",
    description: "People are split into coffee-intake quartiles. Each bar shows how self-reported health issues are distributed inside that quartile.",
    favorable: ["None"],
  },
};

function clearContainer(containerSelector) {
  d3.select(containerSelector).html("");
}

function makeFrame(containerSelector, { title, description, tag = "Panel", wide = false }) {
  clearContainer(containerSelector);
  const { frame, body } = chartFrame(containerSelector, {
    title,
    description,
    tag,
    wide,
  });
  frame.select(".chart-frame-header").remove();
  frame.select(".chart-frame-description").remove();
  return { frame, body };
}

function formatValue(value, unit) {
  if (unit === "hours") return `${d3.format(".2f")(value)} h`;
  if (unit === "mg/day") return `${d3.format(",.0f")(value)} mg`;
  if (unit === "cups/day") return `${d3.format(".2f")(value)} cups`;
  return d3.format(".2f")(value);
}

function formatAxisValue(value) {
  return d3.format(".2f")(value);
}

function linearRegression(rows, xAccessor, yAccessor) {
  const pairs = rows
    .map((row) => [xAccessor(row), yAccessor(row)])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const n = pairs.length || 1;
  const sumX = d3.sum(pairs, (d) => d[0]);
  const sumY = d3.sum(pairs, (d) => d[1]);
  const sumXY = d3.sum(pairs, (d) => d[0] * d[1]);
  const sumXX = d3.sum(pairs, (d) => d[0] * d[0]);
  const slope = (n * sumXY - sumX * sumY) / ((n * sumXX - sumX * sumX) || 1);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function getCoffeeQuartiles(rows) {
  const values = [...rows].map((row) => row.coffee).sort(d3.ascending);
  return {
    q1: d3.quantileSorted(values, 0.25) ?? 0,
    q2: d3.quantileSorted(values, 0.5) ?? 0,
    q3: d3.quantileSorted(values, 0.75) ?? 0,
  };
}

function buildQuartileSummary(rows) {
  const assignedRows = getQuartileAssignments(rows);
  return ["Q1", "Q2", "Q3", "Q4"].map((quartile) => {
    const values = assignedRows.filter((row) => row.quartile === quartile);
    const total = values.length;
    return {
      quartile,
      total,
      avgSleep: total ? d3.mean(values, (d) => d.sleep) : 0,
      avgCoffee: total ? d3.mean(values, (d) => d.coffee) : 0,
      goodSleepShare: total ? values.filter((d) => d.sleepQuality === "Good" || d.sleepQuality === "Excellent").length / total : 0,
    };
  });
}

function formatScatterTooltip(row, colorBy) {
  return `<strong>${row.country}</strong><br>${getDisplayName(colorBy)}: ${row[colorBy]}<br>Coffee: ${d3.format(".2f")(row.coffee)} cups<br>Sleep: ${d3.format(".2f")(row.sleep)} h<br>Caffeine: ${d3.format(",.0f")(row.caffeine)} mg`;
}

export function renderWorldConsumptionTrend(containerSelector, trend) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "World total",
    title: "Global domestic coffee consumption",
    description: "",
  });
  const height = 330;
  const { svg, width } = getSvg(body, height);
  const margins = { top: 22, right: 30, bottom: 52, left: 64 };
  const data = trend.map((row) => ({
    ...row,
    roastedMillions: row.roasted / 1000,
    solubleMillions: row.soluble / 1000,
    totalMillions: row.total / 1000,
  }));
  const x = d3.scaleLinear()
    .domain(d3.extent(data, (row) => row.year))
    .range([margins.left, width - margins.right]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (row) => row.totalMillions)])
    .nice()
    .range([height - margins.bottom, margins.top]);
  const stack = d3.stack().keys(["roastedMillions", "solubleMillions"])(data);
  const colors = {
    roastedMillions: "#6f452c",
    solubleMillions: "#d7a36d",
  };
  const area = d3.area()
    .x((point) => x(point.data.year))
    .y0((point) => y(point[0]))
    .y1((point) => y(point[1]))
    .curve(d3.curveMonotoneX);

  svg.append("g")
    .selectAll("line")
    .data(y.ticks(5))
    .join("line")
    .attr("x1", margins.left)
    .attr("x2", width - margins.right)
    .attr("y1", (value) => y(value))
    .attr("y2", (value) => y(value))
    .attr("stroke", "rgba(91, 58, 38, 0.10)");

  svg.append("g")
    .selectAll("path")
    .data(stack)
    .join("path")
    .attr("d", area)
    .attr("fill", (series) => colors[series.key])
    .attr("opacity", 0.94);

  const totalLine = d3.line()
    .x((row) => x(row.year))
    .y((row) => y(row.totalMillions))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(data)
    .attr("d", totalLine)
    .attr("fill", "none")
    .attr("stroke", "#2e1a12")
    .attr("stroke-width", 2.2);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .attr("transform", `translate(${margins.left}, 0)`)
    .call(d3.axisLeft(y).ticks(5))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").style("font-size", "10px"));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Marketing year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Million 60 kg bags");

  const last = data.at(-1);
  svg.append("circle")
    .attr("cx", x(last.year))
    .attr("cy", y(last.totalMillions))
    .attr("r", 4)
    .attr("fill", "#2e1a12");
  svg.append("text")
    .attr("class", "value-label")
    .attr("x", x(last.year) - 6)
    .attr("y", y(last.totalMillions) - 10)
    .attr("text-anchor", "end")
    .text(`${d3.format(".1f")(last.totalMillions)}m`);

  const hoverPoints = svg.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (row) => x(row.year))
    .attr("cy", (row) => y(row.totalMillions))
    .attr("r", 8)
    .attr("fill", "transparent");

  hoverPoints.append("title")
    .text((row) => `${row.year}\nTotal: ${d3.format(".1f")(row.totalMillions)} million bags\nRoasted & ground: ${d3.format(".1f")(row.roastedMillions)} million\nSoluble: ${d3.format(".1f")(row.solubleMillions)} million`);

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [
    ["Roasted & ground", colors.roastedMillions],
    ["Soluble", colors.solubleMillions],
    ["Domestic total", "#2e1a12"],
  ].forEach(([label, color], index) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", `chapter4-legend-swatch ${index === 2 ? "is-total-line" : ""}`)
      .style("background", color);
    item.append("span").text(label);
  });

  return { frame, body };
}

export function renderDomesticConsumption(containerSelector, consumptionByYear, selectedYear) {
  const yearData = consumptionByYear.find((entry) => String(entry.year) === String(selectedYear)) ?? consumptionByYear.at(-1);
  const topCountries = yearData.countries.slice(0, 9);
  const remaining = yearData.countries.slice(9);
  const other = {
    country: "Other",
    roasted: d3.sum(remaining, (row) => row.roasted),
    soluble: d3.sum(remaining, (row) => row.soluble),
    total: d3.sum(remaining, (row) => row.total),
  };
  const data = [...topCountries, other];
  const { frame, body } = makeFrame(containerSelector, {
    tag: String(yearData.year),
    title: "Domestic coffee consumption",
    description: "",
  });
  const height = 360;
  const { svg, width } = getSvg(body, height);
  const margins = { top: 18, right: 54, bottom: 54, left: 122 };
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, (row) => row.total) / 1000])
    .nice()
    .range([margins.left, width - margins.right]);
  const y = d3.scaleBand()
    .domain(data.map((row) => row.country))
    .range([margins.top, height - margins.bottom])
    .padding(0.28);
  const colors = {
    roasted: "#6f452c",
    soluble: "#d7a36d",
  };

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(x).ticks(5))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .attr("transform", `translate(${margins.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

  const rows = svg.append("g")
    .selectAll("g.consumption-row")
    .data(data)
    .join("g")
    .attr("class", "consumption-row")
    .attr("transform", (row) => `translate(0, ${y(row.country)})`);

  rows.append("rect")
    .attr("x", x(0))
    .attr("width", (row) => Math.max(0, x(row.roasted / 1000) - x(0)))
    .attr("height", y.bandwidth())
    .attr("rx", 7)
    .attr("fill", colors.roasted);

  rows.append("rect")
    .attr("x", (row) => x(row.roasted / 1000))
    .attr("width", (row) => Math.max(0, x(row.total / 1000) - x(row.roasted / 1000)))
    .attr("height", y.bandwidth())
    .attr("rx", 7)
    .attr("fill", colors.soluble);

  rows.append("circle")
    .attr("cx", (row) => x(row.total / 1000))
    .attr("cy", y.bandwidth() / 2)
    .attr("r", 3.5)
    .attr("fill", "#2e1a12");

  rows.append("text")
    .attr("class", "value-label")
    .attr("x", (row) => x(row.total / 1000) + 7)
    .attr("y", y.bandwidth() / 2 + 4)
    .text((row) => d3.format(".1f")(row.total / 1000));

  rows.append("title")
    .text((row) => `${row.country}\nTotal: ${d3.format(",.0f")(row.total)} thousand bags\nRoasted & ground: ${d3.format(",.0f")(row.roasted)}\nSoluble: ${d3.format(",.0f")(row.soluble)}`);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Domestic consumption (million 60 kg bags)");

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [
    ["Roasted & ground", colors.roasted],
    ["Soluble", colors.soluble],
    ["Domestic total", "#2e1a12"],
  ].forEach(([label, color], index) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", `chapter4-legend-swatch ${index === 2 ? "is-total-dot" : ""}`)
      .style("background", color);
    item.append("span").text(label);
  });

  return { frame, body };
}

export function renderCountryRanking(containerSelector, countries, measure = "coffee") {
  const config = MEASURE_CONFIGS[measure];
  const { frame, body } = makeFrame(containerSelector, {
    tag: config.label,
    title: config.title,
    description: config.description,
  });

  const data = [...countries].sort((a, b) => d3.descending(a[measure], b[measure]) || d3.ascending(a.country, b.country));
  const height = Math.max(300, data.length * 16 + 48);
  const { svg, width } = getSvg(body, height);
  const minValue = d3.min(data, (d) => d[measure]) ?? 0;
  const maxValue = d3.max(data, (d) => d[measure]) ?? 0;
  const xDomainStart = minValue > 0 ? minValue * 0.98 : 0;
  const xDomainEnd = maxValue * 1.02;
  const x = d3.scaleLinear()
    .domain([xDomainStart, xDomainEnd])
    .nice()
    .range([BAR_MARGINS.left, width - BAR_MARGINS.right]);
  const y = d3.scaleBand()
    .domain(data.map((d) => d.country))
    .range([BAR_MARGINS.top, height - BAR_MARGINS.bottom])
    .padding(0.24);
  const color = d3.scaleSequential(d3.interpolateRgbBasis(config.palette))
    .domain([0, Math.max(1, data.length - 1)]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - BAR_MARGINS.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat((d) => formatAxisValue(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .attr("transform", `translate(${BAR_MARGINS.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "650"));

  svg.append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", xDomainStart > 0 ? x(xDomainStart) : BAR_MARGINS.left)
    .attr("y", (d) => y(d.country))
    .attr("width", (d) => Math.max(4, x(d[measure]) - (xDomainStart > 0 ? x(xDomainStart) : BAR_MARGINS.left)))
    .attr("height", y.bandwidth())
    .attr("rx", 8)
    .attr("fill", (_, index) => color(index));

  svg.append("g")
    .selectAll("text.value")
    .data(data)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d[measure]) + 8)
    .attr("y", (d) => y(d.country) + y.bandwidth() / 2 + 4)
    .text((d) => formatValue(d[measure], config.unit));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 6)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text(`Average ${config.label.toLowerCase()} by country`);

  return { frame, body };
}

export function renderAgeProfile(containerSelector, ageProfiles, metric = "coffee") {
  const config = AGE_CONFIG[metric] ?? AGE_CONFIG.coffee;
  const { frame, body } = makeFrame(containerSelector, {
    tag: config.label,
    title: config.title,
    description: config.description,
  });

  const width = Math.max(520, body.node()?.getBoundingClientRect().width || 640);
  const height = 250;
  const { svg } = getSvg(body, height);
  const values = ageProfiles.map((d) => d[metric]).filter((value) => Number.isFinite(value));
  const extent = d3.extent(values);
  const range = (extent[1] ?? 0) - (extent[0] ?? 0);
  const pad = metric === "caffeine" ? Math.max(4, range * 0.7) : Math.max(0.04, range * 0.5);
  const x = d3.scaleBand()
    .domain(ageProfiles.map((d) => d.label))
    .range([58, width - 22])
    .padding(0.3);
  const y = d3.scaleLinear()
    .domain([
      Math.max(0, (extent[0] ?? 0) - pad),
      (extent[1] ?? 0) + pad,
    ])
    .nice()
    .range([height - 44, 24]);
  const line = d3.line()
    .x((d) => x(d.label) + x.bandwidth() / 2)
    .y((d) => y(d[metric]))
    .curve(d3.curveMonotoneX);

  svg.append("g")
    .attr("transform", `translate(0, ${height - 44})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "650"));

  svg.append("g")
    .attr("transform", `translate(58, 0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat((d) => formatAxisValue(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .selectAll("line")
    .data(y.ticks(4))
    .join("line")
    .attr("x1", 58)
    .attr("x2", width - 22)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.08)");

  svg.append("path")
    .datum(ageProfiles)
    .attr("fill", "none")
    .attr("stroke", "#5b3a26")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("d", line);

  svg.append("g")
    .selectAll("circle")
    .data(ageProfiles)
    .join("circle")
    .attr("cx", (d) => x(d.label) + x.bandwidth() / 2)
    .attr("cy", (d) => y(d[metric]))
    .attr("r", 4.5)
    .attr("fill", "#8c5a38");

  svg.append("g")
    .selectAll("text.value")
    .data(ageProfiles)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.label) + x.bandwidth() / 2)
    .attr("y", (d) => y(d[metric]) - 10)
    .attr("text-anchor", "middle")
    .text((d) => formatValue(d[metric], metric === "caffeine" ? "mg/day" : "cups/day"));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Age band");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text(metric === "caffeine" ? "Average caffeine intake" : "Average coffee intake");

  return { frame, body };
}

function buildGroupStats(rows, field, metric, categories, labelMap = {}, sortMetric = null) {
  const stats = categories.map((category) => {
    const metricValues = rows
      .filter((row) => String(row[field]).trim() === String(category))
      .map((row) => Number(row[metric]))
      .filter((value) => Number.isFinite(value))
      .sort(d3.ascending);
    const sortValues = sortMetric
      ? rows
          .filter((row) => String(row[field]).trim() === String(category))
          .map((row) => Number(row[sortMetric]))
          .filter((value) => Number.isFinite(value))
      : [];
    return {
      category,
      label: labelMap[category] ?? getCategoryLabel(field, category),
      values: metricValues,
      count: metricValues.length,
      min: metricValues[0] ?? 0,
      q1: d3.quantileSorted(metricValues, 0.25) ?? 0,
      median: d3.quantileSorted(metricValues, 0.5) ?? 0,
      q3: d3.quantileSorted(metricValues, 0.75) ?? 0,
      max: metricValues[metricValues.length - 1] ?? 0,
      mean: metricValues.length ? d3.mean(metricValues) : 0,
      orderValue: sortMetric ? (sortValues.length ? d3.mean(sortValues) : 0) : 0,
    };
  });

  if (!sortMetric) {
    return stats;
  }

  return stats.sort((a, b) => d3.descending(a.orderValue, b.orderValue) || d3.ascending(a.label, b.label));
}

function buildViolinStats(rows, field, metric, categories, labelMap = {}) {
  return categories.map((category) => {
    const values = rows
      .filter((row) => String(row[field]).trim() === String(category))
      .map((row) => Number(row[metric]))
      .filter((value) => Number.isFinite(value))
      .sort(d3.ascending);
    return {
      category,
      label: labelMap[category] ?? getCategoryLabel(field, category),
      values,
      count: values.length,
      min: values[0] ?? 0,
      q1: d3.quantileSorted(values, 0.25) ?? 0,
      median: d3.quantileSorted(values, 0.5) ?? 0,
      q3: d3.quantileSorted(values, 0.75) ?? 0,
      max: values[values.length - 1] ?? 0,
      mean: values.length ? d3.mean(values) : 0,
    };
  });
}

function renderViolinComparison(containerSelector, rows, { field, metric, title, tag, description, categories, labelMap = {}, horizontal = true }) {
  const { frame, body } = makeFrame(containerSelector, {
    tag,
    title,
    description,
  });

  const stats = buildViolinStats(rows, field, metric, categories, labelMap)
    .sort((a, b) => d3.descending(a.median, b.median) || d3.ascending(a.label, b.label));
  const width = Math.max(horizontal ? 620 : 920, body.node()?.getBoundingClientRect().width || 920);
  const height = horizontal ? Math.max(240, stats.length * 44 + 52) : 282;
  const { svg } = getSvg(body, height);
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  const allValues = stats.flatMap((d) => d.values);
  const sortedValues = [...allValues].sort(d3.ascending);
  const extent = [
    d3.quantileSorted(sortedValues, 0.05) ?? 0,
    d3.quantileSorted(sortedValues, 0.95) ?? 0,
  ];
  const range = (extent[1] ?? 0) - (extent[0] ?? 0);
  const pad = metric === "caffeine" ? Math.max(8, range * 0.3) : Math.max(0.08, range * 0.3);
  const axisTitle = metric === "caffeine" ? (horizontal ? "Caffeine intake (mg/day)" : "Caffeine intake (mg/day)") : (horizontal ? "Coffee intake (cups/day)" : "Coffee intake (cups/day)");
  const warmScale = d3.scaleSequential(d3.interpolateRgbBasis(["#f1d7bd", "#ddb07f", "#b07342", "#5b3a26"])).domain([0, Math.max(1, stats.length - 1)]);

  if (horizontal) {
    const x = d3.scaleLinear()
      .domain([
        Math.max(0, (extent[0] ?? 0) - pad),
        (extent[1] ?? 0) + pad,
      ])
      .nice()
      .range([78, width - 28]);
    const y = d3.scaleBand()
      .domain(stats.map((d) => d.label))
      .range([24, height - 42])
      .padding(0.28);
    const violinScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, y.bandwidth() * 0.44]);

    svg.append("g")
      .selectAll("line.grid")
      .data(x.ticks(5))
      .join("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 24)
      .attr("y2", height - 42)
      .attr("stroke", "rgba(70,40,24,0.08)");

    svg.append("g")
      .attr("transform", `translate(0, ${height - 42})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatAxisValue(d)))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "10px"));

    svg.append("g")
      .attr("transform", "translate(78, 0)")
      .call(d3.axisLeft(y).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

    const layer = svg.append("g");
    stats.forEach((stat, index) => {
      const centerY = y(stat.label) + y.bandwidth() / 2;
      const bins = d3.bin().domain(x.domain()).thresholds(18)(stat.values);
      const maxBin = d3.max(bins, (d) => d.length) || 1;
      const density = bins.map((bin) => ({
        value: (bin.x0 + bin.x1) / 2,
        density: bin.length / maxBin,
      }));
      const area = d3.area()
        .x((d) => x(d.value))
        .y0((d) => centerY - violinScale(d.density))
        .y1((d) => centerY + violinScale(d.density))
        .curve(d3.curveCatmullRom.alpha(0.6));

      layer.append("path")
        .datum(density)
        .attr("d", area)
        .attr("fill", warmScale(index))
        .attr("fill-opacity", 0.9)
        .attr("stroke", "#8c5a38")
        .attr("stroke-width", 1.2);

      layer.append("line")
        .attr("x1", x(stat.median))
        .attr("x2", x(stat.median))
        .attr("y1", centerY - y.bandwidth() * 0.16)
        .attr("y2", centerY + y.bandwidth() * 0.16)
        .attr("stroke", "#2e1a12")
        .attr("stroke-width", 2.2);

      layer.append("circle")
        .attr("cx", x(stat.mean))
        .attr("cy", centerY)
        .attr("r", 4.5)
        .attr("fill", "#2e1a12");

      svg.append("text")
        .attr("class", "value-label")
        .attr("x", x(stat.median) + 8)
        .attr("y", centerY + 4)
        .text(metric === "caffeine" ? `${d3.format(",.0f")(stat.median)} mg` : `${d3.format(".2f")(stat.median)} cups`);
    });

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 6)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text("Groups");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text(axisTitle);
  } else {
    const x = d3.scaleBand()
      .domain(stats.map((d) => d.label))
      .range([68, width - 18])
      .padding(0.34);
    const y = d3.scaleLinear()
      .domain([
        Math.max(0, (extent[0] ?? 0) - pad),
        (extent[1] ?? 0) + pad,
      ])
      .nice()
      .range([height - 42, 38]);
    const violinScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, x.bandwidth() * 0.34]);

    svg.append("g")
      .selectAll("line.grid")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 68)
      .attr("x2", width - 18)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "rgba(70,40,24,0.08)");

    svg.append("g")
      .attr("transform", `translate(0, ${height - 42})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

    svg.append("g")
      .attr("transform", "translate(68, 0)")
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatAxisValue(d)))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "10px"));

    const layer = svg.append("g");
    stats.forEach((stat, index) => {
      const center = x(stat.label) + x.bandwidth() / 2;
      const bins = d3.bin().domain(y.domain()).thresholds(18)(stat.values);
      const maxBin = d3.max(bins, (d) => d.length) || 1;
      const density = bins.map((bin) => ({
        value: (bin.x0 + bin.x1) / 2,
        density: bin.length / maxBin,
      }));
      const area = d3.area()
        .y((d) => y(d.value))
        .x0((d) => center - violinScale(d.density))
        .x1((d) => center + violinScale(d.density))
        .curve(d3.curveCatmullRom.alpha(0.6));

      layer.append("path")
        .datum(density)
        .attr("d", area)
        .attr("fill", warmScale(index))
        .attr("fill-opacity", 0.9)
        .attr("stroke", "#8c5a38")
        .attr("stroke-width", 1.2);

      layer.append("line")
        .attr("x1", center - x.bandwidth() * 0.15)
        .attr("x2", center + x.bandwidth() * 0.15)
        .attr("y1", y(stat.median))
        .attr("y2", y(stat.median))
        .attr("stroke", "#2e1a12")
        .attr("stroke-width", 2.2);

      layer.append("circle")
        .attr("cx", center)
        .attr("cy", y(stat.mean))
        .attr("r", 4.5)
        .attr("fill", "#2e1a12");

      svg.append("text")
        .attr("class", "value-label")
        .attr("x", center)
        .attr("y", y(stat.median) - 10)
        .attr("text-anchor", "middle")
        .text(metric === "caffeine" ? `${d3.format(",.0f")(stat.median)} mg` : `${d3.format(".2f")(stat.median)} cups`);
    });

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 6)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text("Groups");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text(axisTitle);
  }

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [["Median", "#2e1a12"], ["Mean", "#5b3a26"]].forEach(([label, swatch]) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", `chapter4-legend-swatch is-${label.toLowerCase()}`)
      .style("background", swatch);
    item.append("span").text(label);
  });

  return { frame, body };
}

function renderCategoryComparisonChart(containerSelector, rows, { field, metric, title, tag, description, categories, labelMap, sortMetric = "coffee", horizontal = true }) {
  const { frame, body } = makeFrame(containerSelector, {
    tag,
    title,
    description,
  });
  const stats = buildGroupStats(rows, field, metric, categories, labelMap, sortMetric);
  const width = Math.max(620, body.node()?.getBoundingClientRect().width || 860);
  const height = horizontal ? Math.max(240, stats.length * 34 + 52) : 260;
  const { svg } = getSvg(body, height);
  const warmScale = d3.scaleSequential(d3.interpolateRgbBasis(["#f1d7bd", "#ddb07f", "#b07342", "#5b3a26"])).domain([0, Math.max(1, stats.length - 1)]);
  const valueMax = d3.max(stats, (d) => d.max) * 1.08;

  if (horizontal) {
    const x = d3.scaleLinear()
      .domain([0, valueMax])
      .nice()
      .range([78, width - 28]);
    const y = d3.scaleBand()
      .domain(stats.map((d) => d.label))
      .range([24, height - 42])
      .padding(0.28);

    svg.append("g")
      .selectAll("line.grid")
      .data(x.ticks(5))
      .join("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 24)
      .attr("y2", height - 42)
      .attr("stroke", "rgba(70,40,24,0.08)");

    svg.append("g")
      .attr("transform", `translate(0, ${height - 42})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatAxisValue(d)))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "10px"));

    svg.append("g")
      .attr("transform", "translate(78, 0)")
      .call(d3.axisLeft(y).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

    const layer = svg.append("g");
    layer.selectAll("line.whisker")
      .data(stats)
      .join("line")
      .attr("x1", (d) => x(d.min))
      .attr("x2", (d) => x(d.max))
      .attr("y1", (d) => y(d.label) + y.bandwidth() / 2)
      .attr("y2", (d) => y(d.label) + y.bandwidth() / 2)
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 2);

    layer.selectAll("rect.iqr")
      .data(stats)
      .join("rect")
      .attr("x", (d) => x(d.q1))
      .attr("y", (d) => y(d.label))
      .attr("width", (d) => Math.max(0, x(d.q3) - x(d.q1)))
      .attr("height", y.bandwidth())
      .attr("rx", 10)
      .attr("fill", (d, index) => warmScale(index))
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 1.2);

    layer.selectAll("line.median")
      .data(stats)
      .join("line")
      .attr("x1", (d) => x(d.median))
      .attr("x2", (d) => x(d.median))
      .attr("y1", (d) => y(d.label) - 3)
      .attr("y2", (d) => y(d.label) + y.bandwidth() + 3)
      .attr("stroke", "#2e1a12")
      .attr("stroke-width", 2);

    layer.selectAll("circle.mean")
      .data(stats)
      .join("circle")
      .attr("cx", (d) => x(d.mean))
      .attr("cy", (d) => y(d.label) + y.bandwidth() / 2)
      .attr("r", 4.5)
      .attr("fill", "#2e1a12");

    svg.append("g")
      .selectAll("text.value")
      .data(stats)
      .join("text")
      .attr("class", "value-label")
      .attr("x", (d) => x(d.max) + 8)
      .attr("y", (d) => y(d.label) + y.bandwidth() / 2 + 4)
      .text((d) => metric === "caffeine" ? `${d3.format(",.0f")(d.median)} mg` : `${d3.format(".2f")(d.median)} cups`);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 6)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text(`${getDisplayName(field)} groups`);

    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text(metric === "caffeine" ? "Average caffeine intake" : "Average coffee intake");
  } else {
    // Vertical variant reserved for the gender panel.
    const x = d3.scaleBand()
      .domain(stats.map((d) => d.label))
      .range([76, width - 28])
      .padding(0.28);
    const y = d3.scaleLinear()
      .domain([0, valueMax])
      .nice()
      .range([height - 42, 24]);

    svg.append("g")
      .selectAll("line.grid")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 76)
      .attr("x2", width - 28)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "rgba(70,40,24,0.08)");

    svg.append("g")
      .attr("transform", `translate(0, ${height - 42})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

    svg.append("g")
      .attr("transform", "translate(76, 0)")
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatAxisValue(d)))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").style("font-size", "10px"));

    const layer = svg.append("g");
    layer.selectAll("line.whisker")
      .data(stats)
      .join("line")
      .attr("x1", (d) => x(d.label) + x.bandwidth() / 2)
      .attr("x2", (d) => x(d.label) + x.bandwidth() / 2)
      .attr("y1", (d) => y(d.min))
      .attr("y2", (d) => y(d.max))
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 2);

    layer.selectAll("rect.iqr")
      .data(stats)
      .join("rect")
      .attr("x", (d) => x(d.label))
      .attr("y", (d) => y(d.q3))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.max(0, y(d.q1) - y(d.q3)))
      .attr("rx", 10)
      .attr("fill", (d, index) => warmScale(index))
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 1.2);

    layer.selectAll("line.median")
      .data(stats)
      .join("line")
      .attr("x1", (d) => x(d.label))
      .attr("x2", (d) => x(d.label) + x.bandwidth())
      .attr("y1", (d) => y(d.median))
      .attr("y2", (d) => y(d.median))
      .attr("stroke", "#2e1a12")
      .attr("stroke-width", 2);

    layer.selectAll("circle.mean")
      .data(stats)
      .join("circle")
      .attr("cx", (d) => x(d.label) + x.bandwidth() / 2)
      .attr("cy", (d) => y(d.mean))
      .attr("r", 4.5)
      .attr("fill", "#2e1a12");

    svg.append("g")
      .selectAll("text.value")
      .data(stats)
      .join("text")
      .attr("class", "value-label")
      .attr("x", (d) => x(d.label) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.median) - 10)
      .attr("text-anchor", "middle")
      .text((d) => metric === "caffeine" ? `${d3.format(",.0f")(d.median)} mg` : `${d3.format(".2f")(d.median)} cups`);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 6)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text(`${getDisplayName(field)} groups`);

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text(metric === "caffeine" ? "Average caffeine intake (mg/day)" : "Average coffee intake (cups/day)");
  }

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [["Median", "#2e1a12"], ["Mean", "#5b3a26"]].forEach(([label, swatch]) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", `chapter4-legend-swatch is-${label.toLowerCase()}`)
      .style("background", swatch);
    item.append("span").text(label);
  });

  return { frame, body };
}

export function renderGenderCoffeeComparison(containerSelector, rows, metric = "coffee") {
  return renderViolinComparison(containerSelector, rows, {
    field: "Gender",
    metric,
    title: metric === "caffeine" ? "Does caffeine intake differ by gender?" : "Does coffee intake differ by gender?",
    tag: "Gender lens",
    description: metric === "caffeine"
      ? "A violin plot shows the full caffeine-intake shape for each gender."
      : "A violin plot shows the full coffee-intake shape for each gender.",
    categories: ["Female", "Male", "Other"],
    labelMap: {
      Female: "Female",
      Male: "Male",
      Other: "Other",
    },
    horizontal: false,
  });
}

export function renderCategoryMetricFlip(containerSelector, rows, { field, metric, title, tag, description, categories, labelMap, sortMetric = "coffee" }) {
  return renderViolinComparison(containerSelector, rows, {
    field,
    metric,
    title,
    tag,
    description,
    categories,
    labelMap,
    horizontal: false,
  });
}

export function renderCoffeeSleepScatter(containerSelector, rows) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Sleep distribution",
    title: "Does heavier intake travel with shorter sleep?",
    description: "Sleep hours are grouped by coffee-intake quartiles so the distribution can be compared directly.",
    wide: true,
  });

  const width = Math.max(620, body.node()?.getBoundingClientRect().width || 860);
  const height = 320;
  const svg = body.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const assigned = getQuartileAssignments(rows);
  const quartileRows = ["Q1", "Q2", "Q3", "Q4"].map((quartile) => {
    const values = assigned.filter((row) => row.quartile === quartile).map((row) => row.sleep).sort(d3.ascending);
    const q1 = d3.quantileSorted(values, 0.25) ?? 0;
    const median = d3.quantileSorted(values, 0.5) ?? 0;
    const q3 = d3.quantileSorted(values, 0.75) ?? 0;
    return {
      quartile,
      values,
      min: values[0] ?? 0,
      q1,
      median,
      q3,
      max: values[values.length - 1] ?? 0,
      mean: values.length ? d3.mean(values) : 0,
    };
  });
  const y = d3.scaleLinear()
    .domain([d3.min(quartileRows, (d) => d.min) - 0.25, d3.max(quartileRows, (d) => d.max) + 0.25])
    .nice()
    .range([height - 50, 24]);
  const x = d3.scaleBand()
    .domain(quartileRows.map((d) => d.quartile))
    .range([70, width - 26])
    .padding(0.34);
  const color = d3.scaleSequential(d3.interpolateRgbBasis(["#f1d7bd", "#ddb07f", "#b07342", "#5b3a26"]))
    .domain([0, 3]);
  const line = d3.line()
    .x((d) => x(d.quartile) + x.bandwidth() / 2)
    .y((d) => y(d.median))
    .curve(d3.curveMonotoneX);

  svg.append("g")
    .selectAll("line.grid")
    .data(y.ticks(5))
    .join("line")
    .attr("x1", 70)
    .attr("x2", width - 26)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - 50})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

  svg.append("g")
    .attr("transform", "translate(70, 0)")
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatAxisValue(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  const quartileGroup = svg.append("g");
  quartileGroup.selectAll("line.whisker")
    .data(quartileRows)
    .join("line")
    .attr("x1", (d) => x(d.quartile) + x.bandwidth() / 2)
    .attr("x2", (d) => x(d.quartile) + x.bandwidth() / 2)
    .attr("y1", (d) => y(d.min))
    .attr("y2", (d) => y(d.max))
    .attr("stroke", "#8c5a38")
    .attr("stroke-width", 2);

  quartileGroup.selectAll("rect.iqr")
    .data(quartileRows)
    .join("rect")
    .attr("x", (d) => x(d.quartile))
    .attr("y", (d) => y(d.q3))
    .attr("width", x.bandwidth())
    .attr("height", (d) => Math.max(0, y(d.q1) - y(d.q3)))
    .attr("rx", 10)
    .attr("fill", (d, index) => color(index))
    .attr("stroke", "#8c5a38")
    .attr("stroke-width", 1.2);

  quartileGroup.selectAll("line.median")
    .data(quartileRows)
    .join("line")
    .attr("x1", (d) => x(d.quartile))
    .attr("x2", (d) => x(d.quartile) + x.bandwidth())
    .attr("y1", (d) => y(d.median))
    .attr("y2", (d) => y(d.median))
    .attr("stroke", "#2e1a12")
    .attr("stroke-width", 2);

  quartileGroup.selectAll("circle.mean")
    .data(quartileRows)
    .join("circle")
    .attr("cx", (d) => x(d.quartile) + x.bandwidth() / 2)
    .attr("cy", (d) => y(d.mean))
    .attr("r", 4.5)
    .attr("fill", "#2e1a12");

  svg.append("path")
    .datum(quartileRows)
    .attr("fill", "none")
    .attr("stroke", "#5b3a26")
    .attr("stroke-width", 2.2)
    .attr("stroke-dasharray", "5 3")
    .attr("d", line);

  svg.append("g")
    .selectAll("text.median-label")
    .data(quartileRows)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.quartile) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.median) - 10)
    .attr("text-anchor", "middle")
    .text((d) => `${d3.format(".2f")(d.median)} h`);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .attr("class", "chapter4-axis-label")
      .text("Coffee intake quartiles");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Sleep hours");

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [["Quartile box", "#ddb07f"], ["Median", "#2e1a12"], ["Mean", "#5b3a26"]].forEach(([label, swatch]) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", `chapter4-legend-swatch is-${label.toLowerCase().replaceAll(" ", "-")}`)
      .style("background", swatch);
    item.append("span").text(label);
  });

  const q1 = quartileRows[0];
  const q4 = quartileRows[3];
  body.append("div")
    .attr("class", "chapter4-scatter-note")
    .html(`Median sleep falls from <strong>${d3.format(".2f")(q1.median)} h</strong> in Q1 to <strong>${d3.format(".2f")(q4.median)} h</strong> in Q4, so the story is easier to read as a distribution than as a raw point cloud.`);

  return { frame, body };
}

function buildQuartileComparison(rows, metric, quartile) {
  const assigned = getQuartileAssignments(rows);
  const values = assigned
    .filter((row) => row.quartile === quartile)
    .map((row) => Number(row[metric]))
    .filter((value) => Number.isFinite(value))
    .sort(d3.ascending);
  return {
    quartile,
    label: quartile === "Q1" ? "Low intake" : "High intake",
    values,
    min: values[0] ?? 0,
    q1: d3.quantileSorted(values, 0.25) ?? 0,
    median: d3.quantileSorted(values, 0.5) ?? 0,
    q3: d3.quantileSorted(values, 0.75) ?? 0,
    max: values[values.length - 1] ?? 0,
    mean: values.length ? d3.mean(values) : 0,
  };
}

function buildQuartileCategoryShares(rows, field, categories, labelMap = {}, quartile) {
  const assigned = getQuartileAssignments(rows);
  const subset = assigned.filter((row) => row.quartile === quartile);
  const total = subset.length || 1;
  const counts = new Map(categories.map((category) => [category, 0]));
  subset.forEach((row) => {
    counts.set(row[field], (counts.get(row[field]) ?? 0) + 1);
  });
  const entry = {
    quartile,
    label: quartile === "Q1" ? "Low intake" : "High intake",
    total: subset.length,
  };
  categories.forEach((category) => {
    entry[category] = (counts.get(category) ?? 0) / total;
  });
  return entry;
}

function renderOutcomeBoxFace(card, rows, { title, metric, quartile, quartileLabel }) {
  const width = 310;
  const height = 194;
  const svg = card.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const group = buildQuartileComparison(rows, metric, quartile);
  const values = group.values;
  const extent = d3.extent(values);
  const range = (extent[1] ?? 0) - (extent[0] ?? 0);
  const pad = Math.max(0.01, range * 0.24);
  const y = d3.scaleLinear()
    .domain([
      Math.max(0, (extent[0] ?? 0) - pad),
      (extent[1] ?? 0) + pad,
    ])
    .nice()
    .range([height - 34, 28]);
  const center = width / 2 + 8;

  svg.append("text")
    .attr("x", 12)
    .attr("y", 18)
    .attr("class", "chapter4-outcome-title")
    .text(title);

  svg.append("text")
    .attr("x", width - 12)
    .attr("y", 18)
    .attr("text-anchor", "end")
    .attr("class", "chapter4-outcome-subtitle")
    .text(quartileLabel);

  svg.append("g")
    .selectAll("line.grid")
    .data(y.ticks(4))
    .join("line")
    .attr("x1", 48)
    .attr("x2", width - 20)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.07)");

  svg.append("g")
    .attr("transform", "translate(48, 0)")
    .call(d3.axisLeft(y).ticks(4).tickFormat((d) => formatAxisValue(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "9px"));

  svg.append("line")
    .attr("x1", center)
    .attr("x2", center)
    .attr("y1", y(group.min))
    .attr("y2", y(group.max))
    .attr("stroke", quartile === "Q1" ? "#ddb07f" : "#8c5a38")
    .attr("stroke-width", 2);

  svg.append("rect")
    .attr("x", center - 44)
    .attr("y", y(group.q3))
    .attr("width", 88)
    .attr("height", Math.max(0, y(group.q1) - y(group.q3)))
    .attr("rx", 8)
    .attr("fill", quartile === "Q1" ? "#ddb07f" : "#8c5a38")
    .attr("stroke", "#8c5a38")
    .attr("stroke-width", 1.1);

  svg.append("line")
    .attr("x1", center - 44)
    .attr("x2", center + 44)
    .attr("y1", y(group.median))
    .attr("y2", y(group.median))
    .attr("stroke", "#2e1a12")
    .attr("stroke-width", 2);

  svg.append("circle")
    .attr("cx", center)
    .attr("cy", y(group.mean))
    .attr("r", 4)
    .attr("fill", "#2e1a12");

  svg.append("text")
    .attr("x", center)
    .attr("y", y(group.median) - 8)
    .attr("text-anchor", "middle")
    .attr("class", "value-label")
    .text(metric === "caffeine" ? `${d3.format(",.0f")(group.median)} mg` : `${d3.format(".2f")(group.median)}`);
}

function renderOutcomeShareFace(card, rows, { title, field, categories, labelMap = {}, colors, quartile, quartileLabel }) {
  const width = 310;
  const height = 194;
  const svg = card.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const group = buildQuartileCategoryShares(rows, field, categories, labelMap, quartile);
  const stack = d3.stack().keys(categories)([group]);
  const x = d3.scaleLinear().domain([0, 1]).range([48, width - 20]);
  const yBar = 112;

  svg.append("text")
    .attr("x", 12)
    .attr("y", 18)
    .attr("class", "chapter4-outcome-title")
    .text(title);

  svg.append("text")
    .attr("x", width - 12)
    .attr("y", 18)
    .attr("text-anchor", "end")
    .attr("class", "chapter4-outcome-subtitle")
    .text(quartileLabel);

  svg.append("g")
    .selectAll("line.grid")
    .data([0, 0.25, 0.5, 0.75, 1])
    .join("line")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", 54)
    .attr("y2", 142)
    .attr("stroke", "rgba(70,40,24,0.07)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - 30})`)
    .call(d3.axisBottom(x).tickValues([0, 0.5, 1]).tickFormat(d3.format(".0%")))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "9px"));

  const layer = svg.append("g");
  stack.forEach((series, seriesIndex) => {
    const segment = series[0];
    layer.append("rect")
      .attr("x", x(segment[0]))
      .attr("y", yBar - 18)
      .attr("width", Math.max(0, x(segment[1]) - x(segment[0])))
      .attr("height", 36)
      .attr("rx", 8)
      .attr("fill", colors[seriesIndex % colors.length]);
  });

  svg.append("text")
    .attr("x", 12)
    .attr("y", yBar + 34)
    .attr("class", "value-label")
    .text(quartile === "Q1" ? "Low intake group" : "High intake group");

  const legend = card.append("div").attr("class", "chapter4-mini-legend");
  categories.forEach((category, index) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span").attr("class", "chapter4-legend-swatch").style("background", colors[index % colors.length]);
    item.append("span").text(labelMap[category] ?? category);
  });
}

function renderFlipOutcomeCard(container, rows, config) {
  const card = container.append("div")
    .attr("class", "chapter4-outcome-card chapter4-flip-card")
    .attr("data-visible", "front")
    .attr("tabindex", "0")
    .attr("role", "button")
    .attr("aria-label", `${config.title} flip card`);

  const inner = card.append("div").attr("class", "chapter4-flip-inner");
  const front = inner.append("div").attr("class", "chapter4-flip-face is-front").attr("data-face", "front");
  const back = inner.append("div").attr("class", "chapter4-flip-face is-back").attr("data-face", "back");
  front.append("div").attr("class", "chapter4-outcome-face-slot");
  back.append("div").attr("class", "chapter4-outcome-face-slot");

  const flip = () => {
    const visible = card.attr("data-visible") === "front" ? "back" : "front";
    card.attr("data-visible", visible);
  };

  card.on("click", flip);
  card.on("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  });

  const frontSlot = front.select(".chapter4-outcome-face-slot");
  const backSlot = back.select(".chapter4-outcome-face-slot");

  if (config.kind === "box") {
    renderOutcomeBoxFace(frontSlot, rows, { title: config.title, metric: config.metric, quartile: "Q1", quartileLabel: "Low intake • Q1" });
    renderOutcomeBoxFace(backSlot, rows, { title: config.title, metric: config.metric, quartile: "Q4", quartileLabel: "High intake • Q4" });
  } else {
    renderOutcomeShareFace(frontSlot, rows, { title: config.title, field: config.field, categories: config.categories, labelMap: config.labelMap, colors: config.colors, quartile: "Q1", quartileLabel: "Low intake • Q1" });
    renderOutcomeShareFace(backSlot, rows, { title: config.title, field: config.field, categories: config.categories, labelMap: config.labelMap, colors: config.colors, quartile: "Q4", quartileLabel: "High intake • Q4" });
  }
}

function buildTimedFocusQuartileComparison(rows, timeFlag, quartile) {
  const subset = rows.filter((row) => row[timeFlag]);
  const caffeineValues = subset
    .map((row) => Number(row.caffeine))
    .filter((value) => Number.isFinite(value))
    .sort(d3.ascending);

  if (!subset.length || !caffeineValues.length) {
    return {
      quartile,
      label: quartile === "Q1" ? "Low caffeine" : "High caffeine",
      values: [],
      total: 0,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      mean: 0,
      focusExtent: [0, 1],
    };
  }

  const q1 = d3.quantileSorted(caffeineValues, 0.25) ?? 0;
  const q2 = d3.quantileSorted(caffeineValues, 0.5) ?? 0;
  const q3 = d3.quantileSorted(caffeineValues, 0.75) ?? 0;
  const selected = subset.filter((row) => {
    const value = Number(row.caffeine);
    if (!Number.isFinite(value)) return false;
    if (quartile === "Q1") return value <= q1;
    if (quartile === "Q2") return value > q1 && value <= q2;
    if (quartile === "Q3") return value > q2 && value <= q3;
    return value > q3;
  });
  const values = selected
    .map((row) => Number(row.focus))
    .filter((value) => Number.isFinite(value))
    .sort(d3.ascending);
  const focusValues = subset
    .map((row) => Number(row.focus))
    .filter((value) => Number.isFinite(value));

  return {
    quartile,
    label: quartile === "Q1" ? "Low caffeine" : "High caffeine",
    values,
    total: selected.length,
    min: values[0] ?? 0,
    q1: d3.quantileSorted(values, 0.25) ?? 0,
    median: d3.quantileSorted(values, 0.5) ?? 0,
    q3: d3.quantileSorted(values, 0.75) ?? 0,
    max: values[values.length - 1] ?? 0,
    mean: values.length ? d3.mean(values) : 0,
    focusExtent: d3.extent(focusValues),
  };
}

function renderFocusFace(card, rows, { title, timeFlag, quartile, quartileLabel }) {
  const width = 310;
  const height = 194;
  const svg = card.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const group = buildTimedFocusQuartileComparison(rows, timeFlag, quartile);
  const extent = group.focusExtent;
  const range = (extent[1] ?? 0) - (extent[0] ?? 0);
  const pad = Math.max(0.02, range * 0.24);
  const y = d3.scaleLinear()
    .domain([
      Math.max(0, (extent[0] ?? 0) - pad),
      (extent[1] ?? 0) + pad,
    ])
    .nice()
    .range([height - 34, 28]);
  const center = width / 2 + 8;

  svg.append("text")
    .attr("x", 12)
    .attr("y", 18)
    .attr("class", "chapter4-outcome-title")
    .text(title);

  svg.append("text")
    .attr("x", width - 12)
    .attr("y", 18)
    .attr("text-anchor", "end")
    .attr("class", "chapter4-outcome-subtitle")
    .text(quartileLabel);

  svg.append("g")
    .selectAll("line.grid")
    .data(y.ticks(4))
    .join("line")
    .attr("x1", 48)
    .attr("x2", width - 20)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.07)");

  svg.append("g")
    .attr("transform", "translate(48, 0)")
    .call(d3.axisLeft(y).ticks(4).tickFormat((d) => formatAxisValue(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "9px"));

  svg.append("line")
    .attr("x1", center)
    .attr("x2", center)
    .attr("y1", y(group.min))
    .attr("y2", y(group.max))
    .attr("stroke", quartile === "Q1" ? "#ddb07f" : "#8c5a38")
    .attr("stroke-width", 2);

  svg.append("rect")
    .attr("x", center - 44)
    .attr("y", y(group.q3))
    .attr("width", 88)
    .attr("height", Math.max(0, y(group.q1) - y(group.q3)))
    .attr("rx", 8)
    .attr("fill", quartile === "Q1" ? "#ddb07f" : "#8c5a38")
    .attr("stroke", "#8c5a38")
    .attr("stroke-width", 1.1);

  svg.append("line")
    .attr("x1", center - 44)
    .attr("x2", center + 44)
    .attr("y1", y(group.median))
    .attr("y2", y(group.median))
    .attr("stroke", "#2e1a12")
    .attr("stroke-width", 2);

  svg.append("circle")
    .attr("cx", center)
    .attr("cy", y(group.mean))
    .attr("r", 4)
    .attr("fill", "#2e1a12");

  svg.append("text")
    .attr("x", center)
    .attr("y", y(group.median) - 8)
    .attr("text-anchor", "middle")
    .attr("class", "value-label")
    .text(`${d3.format(".2f")(group.median)}`);

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Focus level");
}

function renderFocusFlipCard(container, rows, config) {
  const card = container.append("div")
    .attr("class", "chapter4-outcome-card chapter4-flip-card")
    .attr("data-visible", "front")
    .attr("tabindex", "0")
    .attr("role", "button")
    .attr("aria-label", `${config.title} flip card`);

  const inner = card.append("div").attr("class", "chapter4-flip-inner");
  const front = inner.append("div").attr("class", "chapter4-flip-face is-front").attr("data-face", "front");
  const back = inner.append("div").attr("class", "chapter4-flip-face is-back").attr("data-face", "back");
  front.append("div").attr("class", "chapter4-outcome-face-slot");
  back.append("div").attr("class", "chapter4-outcome-face-slot");

  const flip = () => {
    const visible = card.attr("data-visible") === "front" ? "back" : "front";
    card.attr("data-visible", visible);
  };

  card.on("click", flip);
  card.on("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  });

  const frontSlot = front.select(".chapter4-outcome-face-slot");
  const backSlot = back.select(".chapter4-outcome-face-slot");
  renderFocusFace(frontSlot, rows, { title: config.title, timeFlag: config.timeFlag, quartile: "Q1", quartileLabel: "Low caffeine • Q1" });
  renderFocusFace(backSlot, rows, { title: config.title, timeFlag: config.timeFlag, quartile: "Q4", quartileLabel: "High caffeine • Q4" });
}

export function renderFocusComparisonGrid(containerSelector, rows) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Timing lens",
    title: "Does caffeine timing change focus?",
    description: "Each card flips between low-dose and high-dose caffeine within a time slot so the focus contrast stays visible.",
    wide: true,
  });

  const grid = body.append("div").attr("class", "chapter4-focus-grid");
  const cards = [
    { title: "Morning", timeFlag: "time_of_day_morning" },
    { title: "Afternoon", timeFlag: "time_of_day_afternoon" },
    { title: "Evening", timeFlag: "time_of_day_evening" },
  ];

  cards.forEach((config) => renderFocusFlipCard(grid, rows, config));

  return { frame, body };
}

const OUTCOME_CONFIGS = {
  sleep: {
    kind: "box",
    tag: "Sleep hours",
    title: "How does sleep duration differ by intake?",
    metric: "sleep",
    axisLabel: "Sleep hours",
    valueFormat: (value) => `${d3.format(".2f")(value)} h`,
  },
  sleepQuality: {
    kind: "share",
    tag: "Sleep quality",
    title: "How does sleep quality differ by intake?",
    field: "Sleep_Quality",
    categories: ["Excellent", "Good", "Fair", "Poor"],
    colors: ["#5b3a26", "#8c5a38", "#b07342", "#ddb07f"],
  },
  stress: {
    kind: "share",
    tag: "Stress",
    title: "How does stress differ by intake?",
    field: "Stress_Level",
    categories: ["Low", "Medium", "High"],
    colors: ["#5b3a26", "#9b6840", "#ddb07f"],
  },
  bmi: {
    kind: "box",
    tag: "BMI",
    title: "How does BMI differ by intake?",
    metric: "bmi",
    axisLabel: "BMI",
    valueFormat: (value) => d3.format(".1f")(value),
  },
  activity: {
    kind: "box",
    tag: "Activity hours",
    title: "How does activity differ by intake?",
    metric: "activity",
    axisLabel: "Activity hours",
    valueFormat: (value) => `${d3.format(".2f")(value)} h`,
  },
  healthIssues: {
    kind: "share",
    tag: "Health issues",
    title: "How do health issues differ by intake?",
    field: "Health_Issues",
    categories: ["None", "Mild", "Moderate", "Severe"],
    colors: ["#5b3a26", "#8c5a38", "#b07342", "#ddb07f"],
  },
};

function renderQuartileBoxPlot(body, groups, { axisLabel, valueFormat, quartileLabel = "Intake quartiles: low to high" }) {
  const height = 300;
  const width = Math.max(560, body.node()?.getBoundingClientRect().width || 680);
  const { svg } = getSvg(body, height);
  const values = groups.flatMap((group) => group.values);
  const extent = d3.extent(values);
  const range = (extent[1] ?? 0) - (extent[0] ?? 0);
  const pad = Math.max(0.02, range * 0.14);
  const x = d3.scaleBand()
    .domain(groups.map((group) => group.label))
    .range([88, width - 32])
    .padding(0.48);
  const y = d3.scaleLinear()
    .domain([Math.max(0, (extent[0] ?? 0) - pad), (extent[1] ?? 0) + pad])
    .nice()
    .range([height - 50, 24]);
  const fills = ["#e6c39a", "#c99561", "#9d6843", "#5b3a26"];

  svg.append("g")
    .selectAll("line.grid")
    .data(y.ticks(5))
    .join("line")
    .attr("x1", 88)
    .attr("x2", width - 32)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - 50})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "12px").style("font-weight", "700"));

  svg.append("g")
    .attr("transform", "translate(88, 0)")
    .call(d3.axisLeft(y).ticks(5).tickFormat(formatAxisValue))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  groups.forEach((group, index) => {
    const center = x(group.label) + x.bandwidth() / 2;
    const boxWidth = Math.min(110, x.bandwidth() * 0.7);

    svg.append("line")
      .attr("x1", center)
      .attr("x2", center)
      .attr("y1", y(group.min))
      .attr("y2", y(group.max))
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 2);

    svg.append("rect")
      .attr("x", center - boxWidth / 2)
      .attr("y", y(group.q3))
      .attr("width", boxWidth)
      .attr("height", Math.max(0, y(group.q1) - y(group.q3)))
      .attr("rx", 10)
      .attr("fill", fills[index % fills.length])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 1.4);

    svg.append("line")
      .attr("x1", center - boxWidth / 2)
      .attr("x2", center + boxWidth / 2)
      .attr("y1", y(group.median))
      .attr("y2", y(group.median))
      .attr("stroke", "#2e1a12")
      .attr("stroke-width", 2.4);

    svg.append("circle")
      .attr("cx", center)
      .attr("cy", y(group.mean))
      .attr("r", 5)
      .attr("fill", "#2e1a12");

    svg.append("text")
      .attr("class", "value-label")
      .attr("x", center)
      .attr("y", y(group.median) - 12)
      .attr("text-anchor", "middle")
      .text(valueFormat(group.median));
  });

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text(axisLabel);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text(quartileLabel);
}

function renderQuartileShares(frame, body, rows, config) {
  const groups = ["Q1", "Q2", "Q3", "Q4"].map((quartile) => (
    buildQuartileCategoryShares(rows, config.field, config.categories, {}, quartile)
  ));
  groups.forEach((group) => {
    group.label = group.quartile;
  });

  const height = 280;
  const width = Math.max(560, body.node()?.getBoundingClientRect().width || 680);
  const { svg } = getSvg(body, height);
  const x = d3.scaleLinear().domain([0, 1]).range([130, width - 28]);
  const y = d3.scaleBand()
    .domain(groups.map((group) => group.label))
    .range([48, height - 62])
    .padding(0.42);
  const stack = d3.stack().keys(config.categories)(groups);

  svg.append("g")
    .selectAll("line.grid")
    .data([0, 0.25, 0.5, 0.75, 1])
    .join("line")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", 38)
    .attr("y2", height - 62)
    .attr("stroke", "rgba(70,40,24,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - 62})`)
    .call(d3.axisBottom(x).tickValues([0, 0.25, 0.5, 0.75, 1]).tickFormat(d3.format(".0%")))
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", "translate(130, 0)")
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "12px").style("font-weight", "700"));

  stack.forEach((series, seriesIndex) => {
    svg.append("g")
      .selectAll("rect")
      .data(series)
      .join("rect")
      .attr("x", (d) => x(d[0]))
      .attr("y", (d) => y(d.data.label))
      .attr("width", (d) => Math.max(0, x(d[1]) - x(d[0])))
      .attr("height", y.bandwidth())
      .attr("rx", 8)
      .attr("fill", config.colors[seriesIndex]);
  });

  const legend = frame.append("div").attr("class", "chapter4-legend");
  config.categories.forEach((category, index) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span").attr("class", "chapter4-legend-swatch").style("background", config.colors[index]);
    item.append("span").text(category);
  });
}

export function renderOutcomeMetric(containerSelector, rows, outcome = "sleep") {
  const config = OUTCOME_CONFIGS[outcome] ?? OUTCOME_CONFIGS.sleep;
  const { frame, body } = makeFrame(containerSelector, {
    tag: config.tag,
    title: config.title,
    description: "",
    wide: true,
  });

  if (config.kind === "box") {
    const groups = ["Q1", "Q2", "Q3", "Q4"].map((quartile) => buildQuartileComparison(rows, config.metric, quartile));
    groups.forEach((group) => {
      group.label = group.quartile;
    });
    renderQuartileBoxPlot(body, groups, config);

    const legend = frame.append("div").attr("class", "chapter4-legend");
    [["Median", "#2e1a12"], ["Mean", "#5b3a26"]].forEach(([label, color]) => {
      const item = legend.append("div").attr("class", "chapter4-legend-item");
      item.append("span")
        .attr("class", `chapter4-legend-swatch is-${label.toLowerCase()}`)
        .style("background", color);
      item.append("span").text(label);
    });
  } else {
    renderQuartileShares(frame, body, rows, config);
  }

  return { frame, body };
}

const FOCUS_TIMES = {
  Morning: { tag: "Morning", color: "#5b3a26" },
  Afternoon: { tag: "Afternoon", color: "#c6874e" },
  Evening: { tag: "Evening", color: "#ddb07f" },
};

function medianRegression(points) {
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (finite.length < 2) {
    const y = finite.length ? finite[0].y : 0;
    return { slope: 0, intercept: y };
  }

  const slopes = [];
  for (let i = 0; i < finite.length; i += 1) {
    for (let j = i + 1; j < finite.length; j += 1) {
      const dx = finite[j].x - finite[i].x;
      if (!dx) continue;
      slopes.push((finite[j].y - finite[i].y) / dx);
    }
  }

  const slope = slopes.length ? d3.median(slopes) ?? 0 : 0;
  const intercept = d3.median(finite.map((point) => point.y - slope * point.x)) ?? 0;
  return { slope, intercept };
}

function buildFocusQuartileStats(rows) {
  const assigned = getQuartileAssignments(rows, "caffeine").filter((row) => FOCUS_TIMES[row.timeOfDay] && Number.isFinite(row.focus));
  const quartiles = ["Q1", "Q2", "Q3", "Q4"];
  const times = Object.keys(FOCUS_TIMES);
  const groups = [];

  quartiles.forEach((quartile, quartileIndex) => {
    times.forEach((timeOfDay) => {
      const values = assigned
        .filter((row) => row.quartile === quartile && row.timeOfDay === timeOfDay)
        .map((row) => Number(row.focus))
        .filter((value) => Number.isFinite(value))
        .sort(d3.ascending);
      groups.push({
        quartile,
        quartileIndex: quartileIndex + 1,
        timeOfDay,
        values,
        min: values[0] ?? 0,
        q1: d3.quantileSorted(values, 0.25) ?? 0,
        median: d3.quantileSorted(values, 0.5) ?? 0,
        q3: d3.quantileSorted(values, 0.75) ?? 0,
        max: values[values.length - 1] ?? 0,
        mean: values.length ? d3.mean(values) : 0,
        count: values.length,
      });
    });
  });

  return groups;
}

export function renderFocusScatter(containerSelector, rows) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Time of day",
    title: "Does focus change with caffeine intake?",
    description: "Focus is shown by caffeine-intake quartile (Q1 to Q4). Morning, afternoon, and evening are color coded, each box marks the median, and the trend lines use median regression.",
    wide: true,
  });

  const width = Math.max(820, body.node()?.getBoundingClientRect().width || 960);
  const height = 330;
  const margins = { top: 24, right: 24, bottom: 50, left: 68 };
  const svg = body.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const groups = buildFocusQuartileStats(rows);
  const yExtent = d3.extent(groups.flatMap((group) => group.values));
  const yPad = Math.max(0.04, ((yExtent[1] ?? 0) - (yExtent[0] ?? 0)) * 0.18);
  const xOuter = d3.scaleBand()
    .domain(["Q1", "Q2", "Q3", "Q4"])
    .range([92, width - 32])
    .padding(0.22);
  const xInner = d3.scaleBand()
    .domain(Object.keys(FOCUS_TIMES))
    .range([0, xOuter.bandwidth()])
    .padding(0.12);
  const y = d3.scaleLinear()
    .domain([
      Math.max(0, (yExtent[0] ?? 0) - yPad),
      (yExtent[1] ?? 0) + yPad,
    ])
    .nice()
    .range([height - margins.bottom, margins.top]);

  svg.append("g")
    .selectAll("line.grid")
    .data(y.ticks(5))
    .join("line")
    .attr("x1", 92)
    .attr("x2", width - 32)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(xOuter))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

  svg.append("g")
    .attr("transform", `translate(92, 0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => d3.format(".2f")(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  const boxWidth = Math.min(66, Math.max(20, xInner.bandwidth() * 0.76));

  groups.forEach((group) => {
    if (!group.values.length) return;
    const config = FOCUS_TIMES[group.timeOfDay];
    const center = xOuter(group.quartile) + xInner(group.timeOfDay) + xInner.bandwidth() / 2;

    svg.append("line")
      .attr("x1", center)
      .attr("x2", center)
      .attr("y1", y(group.min))
      .attr("y2", y(group.max))
      .attr("stroke", config.color)
      .attr("stroke-width", 2);

    svg.append("rect")
      .attr("x", center - boxWidth / 2)
      .attr("y", y(group.q3))
      .attr("width", boxWidth)
      .attr("height", Math.max(0, y(group.q1) - y(group.q3)))
      .attr("rx", 8)
      .attr("fill", config.color)
      .attr("fill-opacity", 0.45)
      .attr("stroke", config.color)
      .attr("stroke-width", 1.2);

    svg.append("line")
      .attr("x1", center - boxWidth / 2)
      .attr("x2", center + boxWidth / 2)
      .attr("y1", y(group.median))
      .attr("y2", y(group.median))
      .attr("stroke", "#2e1a12")
      .attr("stroke-width", 2.4);

    svg.append("circle")
      .attr("cx", center)
      .attr("cy", y(group.mean))
      .attr("r", 4.3)
      .attr("fill", "#2e1a12");

    svg.append("text")
      .attr("class", "value-label")
      .attr("x", center)
      .attr("y", y(group.median) - 10)
      .attr("text-anchor", "middle")
      .text(d3.format(".2f")(group.median));
  });

  Object.entries(FOCUS_TIMES).forEach(([timeOfDay, config]) => {
    const points = groups
      .filter((group) => group.timeOfDay === timeOfDay && group.values.length)
      .map((group) => ({ x: group.quartileIndex, y: group.median }));
    if (points.length < 2) return;
    const fit = medianRegression(points);
    const x1 = xOuter("Q1") + xOuter.bandwidth() / 2;
    const x2 = xOuter("Q4") + xOuter.bandwidth() / 2;
    svg.append("line")
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y(fit.slope * 1 + fit.intercept))
      .attr("y2", y(fit.slope * 4 + fit.intercept))
      .attr("stroke", config.color)
      .attr("stroke-width", 2.2)
      .attr("stroke-dasharray", "6 4")
      .attr("opacity", 0.9);
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Caffeine intake quartiles");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Focus level");

  const legend = frame.append("div").attr("class", "chapter4-legend chapter4-focus-legend");
  Object.entries(FOCUS_TIMES).forEach(([timeOfDay, config]) => {
    const points = groups.filter((group) => group.timeOfDay === timeOfDay && group.values.length).map((group) => ({ x: group.quartileIndex, y: group.median }));
    const fit = points.length ? medianRegression(points) : { slope: 0 };
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", "chapter4-legend-swatch")
      .style("background", config.color);
    item.append("span").html(`<strong>${config.tag}</strong> median β=${d3.format("+.4f")(fit.slope)}`);
  });

  return { frame, body };
}

export function renderFocusTiming(containerSelector, rows, time = "morning") {
  return renderFocusScatter(containerSelector, rows, time);
}

export function renderOutcomeComparisonGrid(containerSelector, rows) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Aftereffects",
    title: "What changes as intake rises?",
    description: "Each card flips between the low-intake and high-intake quartile so the contrast stays visible.",
    wide: true,
  });

  const cards = [
    { kind: "box", title: "Sleep hours", metric: "sleep" },
    { kind: "share", title: "Sleep quality", field: "Sleep_Quality", categories: ["Excellent", "Good", "Fair", "Poor"], colors: ["#5b3a26", "#8c5a38", "#b07342", "#ddb07f"], labelMap: { Excellent: "Excellent", Good: "Good", Fair: "Fair", Poor: "Poor" } },
    { kind: "share", title: "Stress", field: "Stress_Level", categories: ["Low", "Medium", "High"], colors: ["#5b3a26", "#9b6840", "#ddb07f"], labelMap: { Low: "Low", Medium: "Medium", High: "High" } },
    { kind: "box", title: "BMI", metric: "bmi" },
    { kind: "box", title: "Activity hours", metric: "activity" },
    { kind: "share", title: "Health issues", field: "Health_Issues", categories: ["None", "Mild", "Moderate", "Severe"], colors: ["#5b3a26", "#8c5a38", "#b07342", "#ddb07f"], labelMap: { None: "None", Mild: "Mild", Moderate: "Moderate", Severe: "Severe" } },
  ];

  const picker = body.append("div").attr("class", "chapter4-outcome-picker");
  const viewer = body.append("div").attr("class", "chapter4-outcome-viewer");
  let activeIndex = 0;

  const renderActiveCard = () => {
    viewer.html("");
    renderFlipOutcomeCard(viewer, rows, cards[activeIndex]);
  };

  cards.forEach((config, index) => {
    picker.append("button")
      .attr("type", "button")
      .attr("class", "chapter4-chip chapter4-outcome-chip")
      .classed("is-active", index === activeIndex)
      .text(config.title)
      .on("click", () => {
        activeIndex = index;
        picker.selectAll("button").classed("is-active", (_, buttonIndex) => buttonIndex === activeIndex);
        renderActiveCard();
      });
  });

  renderActiveCard();

  return { frame, body };
}

export function renderQuartileBreakdown(containerSelector, rows, dimension = "Sleep_Quality") {
  const config = STACK_CONFIGS[dimension];
  const assignedRows = getQuartileAssignments(rows);
  const categories = getOrderedCategories(dimension);
  const colors = getColorBuckets(dimension);
  const { frame, body } = makeFrame(containerSelector, {
    tag: config.label,
    title: config.title,
    description: config.description,
    wide: true,
  });

  const grouped = d3.rollups(
    assignedRows,
    (values) => {
      const total = values.length;
      const counts = new Map(categories.map((category) => [category, 0]));
      values.forEach((row) => {
        counts.set(row[dimension], (counts.get(row[dimension]) ?? 0) + 1);
      });
      const result = { total };
      categories.forEach((category) => {
        result[category] = total ? (counts.get(category) ?? 0) / total : 0;
      });
      return result;
    },
    (d) => d.quartile,
  ).sort((a, b) => d3.ascending(a[0], b[0]));

  const quartileRows = grouped.map(([quartile, values]) => ({ quartile, ...values }));
  const height = 286;
  const width = Math.max(700, body.node()?.getBoundingClientRect().width || 900);
  const svg = body.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const x = d3.scaleBand()
    .domain(quartileRows.map((d) => d.quartile))
    .range([STACK_MARGINS.left, width - STACK_MARGINS.right])
    .padding(0.22);
  const y = d3.scaleLinear()
    .domain([0, 1])
    .range([height - STACK_MARGINS.bottom, STACK_MARGINS.top]);
  const stack = d3.stack().keys(categories)(quartileRows);

  svg.append("g")
    .attr("transform", `translate(0, ${height - STACK_MARGINS.bottom})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "650"));

  svg.append("g")
    .attr("transform", `translate(${STACK_MARGINS.left}, 0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")))
    .call((g) => g.select(".domain").remove());

  const layer = svg.append("g");
  stack.forEach((series, seriesIndex) => {
    layer.append("g")
      .selectAll("rect")
      .data(series)
      .join("rect")
      .attr("x", (d) => x(d.data.quartile))
      .attr("y", (d) => y(d[1]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])))
      .attr("rx", 6)
      .attr("fill", colors[seriesIndex % colors.length]);
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 6)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Coffee intake quartiles");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Share of people");

  const legend = frame.append("div").attr("class", "chapter4-legend");
  categories.forEach((category, index) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span").attr("class", "chapter4-legend-swatch").style("background", colors[index % colors.length]);
    item.append("span").text(category);
  });

  const q1 = quartileRows.find((d) => d.quartile === "Q1");
  const q4 = quartileRows.find((d) => d.quartile === "Q4");
  const favorableShare = config.favorable.reduce((sum, key) => sum + (q4?.[key] ?? 0), 0);
  const baselineShare = config.favorable.reduce((sum, key) => sum + (q1?.[key] ?? 0), 0);

  frame.append("div")
    .attr("class", "chapter4-callout")
    .html(`<strong>${d3.format(".0%")(baselineShare)}</strong> in Q1 versus <strong>${d3.format(".0%")(favorableShare)}</strong> in Q4 for ${config.favorable.join(" + ").toLowerCase()} share.`);

  return { frame, body };
}

const CQI_DIMENSION_LABELS = {
  Aroma: "Aroma",
  Flavor: "Flavor",
  Aftertaste: "Aftertaste",
  Acidity: "Acidity",
  Body: "Body",
  Balance: "Balance",
  CleanCup: "Clean Cup",
};

const BEAN_COLORS = { Arabica: "#5b3a26", Robusta: "#c6874e" };

export function renderBeanShare(containerSelector, data) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Species split",
    title: "Global coffee production by species",
    description: "Arabica dominates the market at roughly 65 %, while Robusta accounts for about 30 % and Liberica makes up the remainder. The two main species also differ sharply in caffeine content.",
  });
  const width = Math.max(340, body.node()?.getBoundingClientRect().width || 620);
  const height = 290;
  const svg = body.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto");
  const radius = Math.min(width, height) * 0.28;
  const centerX = width / 2;
  const centerY = height / 2 + 2;

  const pie = d3.pie().value((d) => d.value).sort(null);
  const arc = d3.arc().innerRadius(radius * 0.52).outerRadius(radius);
  const palette = ["#5b3a26", "#c6874e", "#ddb07f"];

  const pieLayer = svg.append("g")
    .attr("transform", `translate(${centerX}, ${centerY})`);

  const slices = pieLayer.append("g")
    .selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("d", arc)
    .attr("fill", (_, i) => palette[i])
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  slices.append("title")
    .text((d) => `${d.data.label}: ${d.data.value}%\nCaffeine: ${d.data.caffeine}`);

  const labelArc = d3.arc().innerRadius(radius + 12).outerRadius(radius + 12);
  pieLayer.append("g")
    .selectAll("text")
    .data(pie(data))
    .join("text")
    .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", "10px")
    .attr("font-weight", "700")
    .attr("fill", "#2e1a12")
    .text((d) => `${d.data.label} ${d.data.value}%`);

  svg.append("text")
    .attr("x", centerX)
    .attr("y", centerY + 6)
    .attr("text-anchor", "middle")
    .attr("font-size", "22px")
    .attr("font-weight", "800")
    .attr("fill", "#2e1a12")
    .text("Coffee");

  const legend = frame.append("div").attr("class", "chapter4-legend");
  data.forEach((d, i) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span").attr("class", "chapter4-legend-swatch").style("background", palette[i]);
    item.append("span").html(`<strong>${d.label}</strong> — caffeine ${d.caffeine}`);
  });

  return { frame, body };
}

export function renderSensoryRadar(containerSelector, arabica, robusta) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Sensory profile",
    title: "Arabica vs Robusta: sensory scores",
    description: "Averaged scores across 7 CQI dimensions. Arabica (n = " + arabica.count + ") leads Robusta (n = " + robusta.count + ") on every measure, with the widest gap in aroma, acidity, and flavour.",
    wide: true,
  });
  const dims = Object.keys(CQI_DIMENSION_LABELS);
  const width = Math.max(420, body.node()?.getBoundingClientRect().width || 760);
  const rowHeight = 30;
  const height = 78 + dims.length * rowHeight;
  const svg = body.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
    .style("overflow", "visible");

  const margins = { top: 24, right: 26, bottom: 18, left: 162 };
  const x = d3.scaleLinear()
    .domain([6, 10])
    .range([margins.left, width - margins.right]);
  const y = d3.scaleBand()
    .domain(dims)
    .range([margins.top, height - margins.bottom])
    .padding(0.34);
  const barHeight = Math.max(8, y.bandwidth() * 0.28);
  const offset = barHeight * 0.7;

  svg.append("g")
    .selectAll("line.grid")
    .data([6, 7, 8, 9, 10])
    .join("line")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", margins.top - 4)
    .attr("y2", height - margins.bottom + 2)
    .attr("stroke", "rgba(91,58,38,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom + 4})`)
    .call(d3.axisBottom(x).tickValues([6, 7, 8, 9, 10]).tickFormat((d) => d3.format(".0f")(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .selectAll("text.row")
    .data(dims)
    .join("text")
    .attr("x", margins.left - 12)
    .attr("y", (dim) => y(dim) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .attr("font-size", "10px")
    .attr("font-weight", "700")
    .attr("fill", "#2e1a12")
    .text((dim) => CQI_DIMENSION_LABELS[dim]);

  const rows = dims.map((dim) => ({
    dim,
    arabica: arabica.dimensions[dim],
    robusta: robusta.dimensions[dim],
  }));

  svg.append("g")
    .selectAll("rect.arabica")
    .data(rows)
    .join("rect")
    .attr("x", x(6))
    .attr("y", (d) => y(d.dim) + y.bandwidth() / 2 - offset - barHeight / 2)
    .attr("width", (d) => Math.max(2, x(d.arabica) - x(6)))
    .attr("height", barHeight)
    .attr("rx", 999)
    .attr("fill", BEAN_COLORS.Arabica)
    .attr("fill-opacity", 0.88);

  svg.append("g")
    .selectAll("rect.robusta")
    .data(rows)
    .join("rect")
    .attr("x", x(6))
    .attr("y", (d) => y(d.dim) + y.bandwidth() / 2 + offset - barHeight / 2)
    .attr("width", (d) => Math.max(2, x(d.robusta) - x(6)))
    .attr("height", barHeight)
    .attr("rx", 999)
    .attr("fill", BEAN_COLORS.Robusta)
    .attr("fill-opacity", 0.88);

  svg.append("g")
    .selectAll("text.arabica-value")
    .data(rows)
    .join("text")
    .attr("x", (d) => x(d.arabica) + 6)
    .attr("y", (d) => y(d.dim) + y.bandwidth() / 2 - offset + 4)
    .attr("font-size", "9px")
    .attr("font-weight", "700")
    .attr("fill", "rgba(46,26,18,0.72)")
    .text((d) => d3.format(".2f")(d.arabica));

  svg.append("g")
    .selectAll("text.robusta-value")
    .data(rows)
    .join("text")
    .attr("x", (d) => x(d.robusta) + 6)
    .attr("y", (d) => y(d.dim) + y.bandwidth() / 2 + offset + 4)
    .attr("font-size", "9px")
    .attr("font-weight", "700")
    .attr("fill", "rgba(46,26,18,0.72)")
    .text((d) => d3.format(".2f")(d.robusta));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 4)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("CQI score");

  frame.style("overflow", "visible");
  body.style("overflow", "visible");

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [arabica, robusta].forEach((species) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span").attr("class", "chapter4-legend-swatch").style("background", BEAN_COLORS[species.species]);
    item.append("span").html(`<strong>${species.species}</strong> — overall ${(species.species === "Arabica" ? arabica.totalScoreAvg : robusta.totalScoreAvg).toFixed(1)} pts (n=${species.count})`);
  });

  return { frame, body };
}

export function renderAltitudeQuality(containerSelector, data) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Altitude lens",
    title: "Altitude vs cup score",
    description: "Scores are grouped by altitude quartile (Q1 to Q4). Arabica and Robusta are color coded, each box marks the median, and the trend lines use median regression.",
    wide: true,
  });
  const width = Math.max(820, body.node()?.getBoundingClientRect().width || 960);
  const height = 330;
  const margins = { top: 24, right: 24, bottom: 50, left: 68 };
  const { svg } = getSvg(body, height);
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const assigned = getQuartileAssignments(data, "altitude").filter((row) => Number.isFinite(row.score));
  const groups = ["Q1", "Q2", "Q3", "Q4"].map((quartile, quartileIndex) => {
    const subset = assigned.filter((row) => row.quartile === quartile);
    const values = subset.map((row) => Number(row.score)).sort(d3.ascending);
    return {
      quartile,
      quartileIndex: quartileIndex + 1,
      values,
      arabica: subset.filter((row) => row.species === "Arabica"),
      robusta: subset.filter((row) => row.species === "Robusta"),
    };
  });

  const yExtent = d3.extent(groups.flatMap((group) => group.values));
  const yPad = Math.max(0.18, ((yExtent[1] ?? 0) - (yExtent[0] ?? 0)) * 0.18);
  const xOuter = d3.scaleBand()
    .domain(["Q1", "Q2", "Q3", "Q4"])
    .range([92, width - 32])
    .padding(0.22);
  const xInner = d3.scaleBand()
    .domain(["Arabica", "Robusta"])
    .range([0, xOuter.bandwidth()])
    .padding(0.12);
  const y = d3.scaleLinear()
    .domain([
      Math.max(0, (yExtent[0] ?? 0) - yPad),
      (yExtent[1] ?? 0) + yPad,
    ])
    .nice()
    .range([height - margins.bottom, 38]);

  svg.append("g")
    .selectAll("line.grid")
    .data(y.ticks(5))
    .join("line")
    .attr("x1", 92)
    .attr("x2", width - 32)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "rgba(70,40,24,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(xOuter))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "11px").style("font-weight", "700"));

  svg.append("g")
    .attr("transform", `translate(92, 0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatAxisValue(d)))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  const boxWidth = Math.min(66, Math.max(20, xInner.bandwidth() * 0.76));
  const speciesPoints = { Arabica: [], Robusta: [] };

  groups.forEach((group) => {
    ["Arabica", "Robusta"].forEach((species) => {
      const values = group[species.toLowerCase()];
      if (!values.length) return;
      const stats = values.map((row) => Number(row.score)).filter(Number.isFinite).sort(d3.ascending);
      const min = stats[0] ?? 0;
      const q1 = d3.quantileSorted(stats, 0.25) ?? 0;
      const median = d3.quantileSorted(stats, 0.5) ?? 0;
      const q3 = d3.quantileSorted(stats, 0.75) ?? 0;
      const max = stats[stats.length - 1] ?? 0;
      const center = xOuter(group.quartile) + xInner(species) + xInner.bandwidth() / 2;
      speciesPoints[species].push({ x: group.quartileIndex, y: median });

      svg.append("line")
        .attr("x1", center)
        .attr("x2", center)
        .attr("y1", y(min))
        .attr("y2", y(max))
        .attr("stroke", BEAN_COLORS[species])
        .attr("stroke-width", 2);

      svg.append("rect")
        .attr("x", center - boxWidth / 2)
        .attr("y", y(q3))
        .attr("width", boxWidth)
        .attr("height", Math.max(0, y(q1) - y(q3)))
        .attr("rx", 8)
        .attr("fill", BEAN_COLORS[species])
        .attr("fill-opacity", 0.45)
        .attr("stroke", BEAN_COLORS[species])
        .attr("stroke-width", 1.2);

      svg.append("line")
        .attr("x1", center - boxWidth / 2)
        .attr("x2", center + boxWidth / 2)
        .attr("y1", y(median))
        .attr("y2", y(median))
        .attr("stroke", "#2e1a12")
        .attr("stroke-width", 2.2);

      svg.append("circle")
        .attr("cx", center)
        .attr("cy", y(d3.mean(stats)))
        .attr("r", 4.2)
        .attr("fill", "#2e1a12");

      svg.append("text")
        .attr("class", "value-label")
        .attr("x", center)
        .attr("y", y(median) - 10)
        .attr("text-anchor", "middle")
        .text(`${d3.format(".1f")(median)} pts`);
    });
  });

  Object.entries(BEAN_COLORS).forEach(([species, color]) => {
    const points = speciesPoints[species];
    if (points.length < 2) return;
    const fit = medianRegression(points);
    const x1 = xOuter("Q1") + xOuter.bandwidth() / 2;
    const x2 = xOuter("Q4") + xOuter.bandwidth() / 2;
    svg.append("line")
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y(fit.slope * 1 + fit.intercept))
      .attr("y2", y(fit.slope * 4 + fit.intercept))
      .attr("stroke", color)
      .attr("stroke-width", 2.2)
      .attr("stroke-dasharray", "6 4")
      .attr("opacity", 0.85);
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Altitude quartiles");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Cup score");

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [["Arabica", "#5b3a26"], ["Robusta", "#c6874e"]].forEach(([label, color]) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span")
      .attr("class", "chapter4-legend-swatch")
      .style("background", color);
    item.append("span").text(label);
  });

  return { frame, body };
}

export function renderProcessingMethod(containerSelector, stats) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Processing",
    title: "Score distribution by processing method",
    description: "Washed and honey-processed Arabica lots show slightly higher median scores. The 'Other' category includes experimental methods.",
  });
  const height = Math.max(220, stats.length * 42 + 52);
  const { svg, width } = getSvg(body, height);
  const margins = { top: 24, right: 54, bottom: 50, left: 140 };

  const x = d3.scaleLinear()
    .domain([d3.min(stats, (d) => d.min) - 2, d3.max(stats, (d) => d.max) + 2])
    .nice()
    .range([margins.left, width - margins.right]);
  const y = d3.scaleBand()
    .domain(stats.map((d) => d.method))
    .range([margins.top, height - margins.bottom])
    .padding(0.28);
  const palette = d3.scaleSequential(d3.interpolateRgbBasis(["#ddb07f", "#b07342", "#5b3a26"])).domain([0, Math.max(1, stats.length - 1)]);

  svg.append("g")
    .selectAll("line")
    .data(x.ticks(5))
    .join("line")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", margins.top)
    .attr("y2", height - margins.bottom)
    .attr("stroke", "rgba(91,58,38,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(x).ticks(5))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .attr("transform", `translate(${margins.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px").style("font-weight", "700"));

  stats.forEach((d, i) => {
    const center = y(d.method) + y.bandwidth() / 2;

    svg.append("line")
      .attr("x1", x(d.min))
      .attr("x2", x(d.max))
      .attr("y1", center)
      .attr("y2", center)
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 2);

    svg.append("rect")
      .attr("x", x(d.q1))
      .attr("y", y(d.method))
      .attr("width", Math.max(0, x(d.q3) - x(d.q1)))
      .attr("height", y.bandwidth())
      .attr("rx", 10)
      .attr("fill", palette(i))
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 1.2);

    svg.append("line")
      .attr("x1", x(d.median))
      .attr("x2", x(d.median))
      .attr("y1", y(d.method))
      .attr("y2", y(d.method) + y.bandwidth())
      .attr("stroke", "#2e1a12")
      .attr("stroke-width", 2.2);

    svg.append("text")
      .attr("class", "value-label")
      .attr("x", x(d.max) + 6)
      .attr("y", center + 4)
      .text(d.median.toFixed(1) + " (n=" + d.count + ")");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Total Cup Points");

  return { frame, body };
}

export function renderCaffeineRange(containerSelector, data) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Caffeine",
    title: "Caffeine range by beverage category",
    description: "Straight brewed coffee tops the chart; frappuccinos and tea-based drinks anchor the low end. The bar shows the average, with the full range marked by the thin line.",
  });
  const height = Math.max(280, data.length * 32 + 48);
  const { svg, width } = getSvg(body, height);
  const margins = { top: 20, right: 44, bottom: 50, left: 180 };

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.max) * 1.06])
    .nice()
    .range([margins.left, width - margins.right]);
  const y = d3.scaleBand()
    .domain(data.map((d) => d.category))
    .range([margins.top, height - margins.bottom])
    .padding(0.22);

  svg.append("g")
    .selectAll("line")
    .data(x.ticks(5))
    .join("line")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", margins.top)
    .attr("y2", height - margins.bottom)
    .attr("stroke", "rgba(91,58,38,0.08)");

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(x).ticks(6))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px"));

  svg.append("g")
    .attr("transform", `translate(${margins.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px").style("font-weight", "700"));

  const warmScale = d3.scaleSequential(d3.interpolateRgbBasis(["#f1d7bd", "#ddb07f", "#b07342", "#5b3a26"])).domain([0, Math.max(1, data.length - 1)]);

  data.forEach((d, i) => {
    const center = y(d.category) + y.bandwidth() / 2;

    svg.append("line")
      .attr("x1", x(d.min))
      .attr("x2", x(d.max))
      .attr("y1", center)
      .attr("y2", center)
      .attr("stroke", "#8c5a38")
      .attr("stroke-width", 1.2);

    svg.append("rect")
      .attr("x", x(0))
      .attr("y", y(d.category))
      .attr("width", Math.max(2, x(d.avg) - x(0)))
      .attr("height", y.bandwidth())
      .attr("rx", 8)
      .attr("fill", warmScale(i));

    svg.append("text")
      .attr("class", "value-label")
      .attr("x", x(d.avg) + 4)
      .attr("y", center + 4)
      .text(d3.format(".0f")(d.avg) + " mg");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("class", "chapter4-axis-label")
    .text("Caffeine (mg)");

  return { frame, body };
}

export function renderNutrientCompare(containerSelector, data) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Grande nutrition",
    title: "Nutritional profile of classic Grande drinks",
    description: "Six espresso-based beverages in the standard Grande size. The chart uses min-max normalisation per nutrient so the relative composition is visible at a glance.",
  });
  const nutrients = [
    { key: "caffeine", label: "Caffeine (mg)", color: "#2e1a12" },
    { key: "calories", label: "Calories", color: "#5b3a26" },
    { key: "fat", label: "Fat (g)", color: "#8c5a38" },
    { key: "carbs", label: "Carbs (g)", color: "#b07342" },
    { key: "protein", label: "Protein (g)", color: "#ddb07f" },
  ];
  const height = 320;
  const { svg, width } = getSvg(body, height);
  const margins = { top: 44, right: 24, bottom: 56, left: 84 };

  const maxValues = {};
  nutrients.forEach((n) => {
    maxValues[n.key] = d3.max(data, (d) => d[n.key]) ?? 1;
  });

  const x = d3.scaleBand()
    .domain(data.map((d) => d.beverage))
    .range([margins.left, width - margins.right])
    .padding(0.18);
  const y = d3.scaleBand()
    .domain(nutrients.map((n) => n.label))
    .range([margins.top, height - margins.bottom])
    .padding(0.14);
  const colorScale = d3.scaleOrdinal().domain(nutrients.map((n) => n.label)).range(nutrients.map((n) => n.color));

  const heatData = data.flatMap((row) =>
    nutrients.map((n) => ({
      beverage: row.beverage,
      nutrient: n.label,
      value: row[n.key] / maxValues[n.key],
      raw: row[n.key],
    })),
  );

  svg.append("g")
    .attr("transform", `translate(0, ${height - margins.bottom})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px").style("font-weight", "700"));

  svg.append("g")
    .attr("transform", `translate(${margins.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").style("font-size", "10px").style("font-weight", "650"));

  const cells = svg.append("g")
    .selectAll("rect")
    .data(heatData)
    .join("rect")
    .attr("x", (d) => x(d.beverage))
    .attr("y", (d) => y(d.nutrient))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 6)
    .attr("fill", (d) => colorScale(d.nutrient))
    .attr("fill-opacity", (d) => 0.2 + d.value * 0.65)
    .attr("stroke", (d) => colorScale(d.nutrient))
    .attr("stroke-width", 0.8)
    .attr("stroke-opacity", 0.4);

  cells.append("title")
    .text((d) => `${d.beverage}\n${d.nutrient}: ${d.raw}`);

  svg.append("g")
    .selectAll("text")
    .data(heatData)
    .join("text")
    .attr("x", (d) => x(d.beverage) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.nutrient) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("font-weight", "700")
    .attr("fill", "#2e1a12")
    .text((d) => {
      if (d.nutrient === "Caffeine (mg)") return d3.format(".0f")(d.raw);
      return d3.format(".0f")(d.raw);
    });

  const legend = frame.append("div").attr("class", "chapter4-legend");
  nutrients.forEach((n) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    item.append("span").attr("class", "chapter4-legend-swatch").style("background", n.color);
    item.append("span").text(n.label);
  });

  return { frame, body };
}

export function renderMilkChoice(containerSelector, data) {
  const { frame, body } = makeFrame(containerSelector, {
    tag: "Milk matters",
    title: "Latte nutrition by milk type and size",
    description: "Each row is one size. Filled circles = nonfat, outlined = 2 %, diamond = soy. The gap between nonfat and 2 % is consistent across sizes.",
  });
  const sizes = ["Short", "Tall", "Grande", "Venti"];
  const metrics = [
    { key: "calories", label: "Calories", unit: "" },
    { key: "fat", label: "Fat (g)", unit: "g" },
    { key: "carbs", label: "Carbs (g)", unit: "g" },
    { key: "protein", label: "Protein (g)", unit: "g" },
  ];
  const milkStyles = {
    Nonfat: { symbol: "circle", fill: "#5b3a26", stroke: "#5b3a26" },
    "2%": { symbol: "circle", fill: "none", stroke: "#b07342" },
    Soy: { symbol: "diamond", fill: "#ddb07f", stroke: "#ddb07f" },
  };

  const height = sizes.length * 86 + 44;
  const { svg, width } = getSvg(body, height);
  const margins = { top: 28, right: 20, bottom: 24, left: 90 };
  const pad = 16;
  const columnWidth = (width - margins.left - margins.right - pad * (metrics.length - 1)) / metrics.length;
  const rowGap = 86;
  const milkOrder = [
    { key: "Nonfat", dy: -14 },
    { key: "2%", dy: 0 },
    { key: "Soy", dy: 14 },
  ];

  metrics.forEach((metric, mi) => {
    const x0 = margins.left + mi * (columnWidth + pad);
    const xRange = [x0 + 18, x0 + columnWidth - 10];
    const allVals = data.filter((d) => Number.isFinite(d[metric.key])).map((d) => d[metric.key]);
    const xScale = d3.scaleLinear()
      .domain([0, (d3.max(allVals) ?? 0) * 1.12 || 1])
      .nice()
      .range(xRange);

    svg.append("text")
      .attr("x", x0 + columnWidth / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", "#2e1a12")
      .text(metric.label);

    svg.append("line")
      .attr("x1", x0 + 14)
      .attr("x2", x0 + columnWidth - 10)
      .attr("y1", 28)
      .attr("y2", 28)
      .attr("stroke", "rgba(91, 58, 38, 0.10)");

    sizes.forEach((size) => {
      const yPos = 58 + sizes.indexOf(size) * rowGap;
      const subset = data.filter((d) => d.size === size);

      svg.append("text")
        .attr("x", margins.left - 12)
        .attr("y", yPos + 4)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .attr("fill", "rgba(46,26,18,0.6)")
        .text(size);

      subset.forEach((d) => {
        const style = milkStyles[d.milk];
        if (!style) return;
        const cx = xScale(d[metric.key]);
        const cy = yPos + (milkOrder.find((entry) => entry.key === d.milk)?.dy ?? 0);
        const labelX = Math.min(cx + 9, x0 + columnWidth - 4);

        if (style.symbol === "circle") {
          svg.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", 6)
            .attr("fill", style.fill === "none" ? "white" : style.fill)
            .attr("fill-opacity", style.fill === "none" ? 1 : 0.85)
            .attr("stroke", style.stroke)
            .attr("stroke-width", style.fill === "none" ? 2.5 : 0);
        } else {
          svg.append("polygon")
            .attr("points", `0,-6 5,0 0,6 -5,0`)
            .attr("transform", `translate(${cx}, ${cy})`)
            .attr("fill", style.fill)
            .attr("fill-opacity", 0.85);
        }

        svg.append("rect")
          .attr("x", cx + 7)
          .attr("y", cy - 7)
          .attr("width", 30)
          .attr("height", 14)
          .attr("rx", 7)
          .attr("fill", "rgba(255, 251, 245, 0.82)");

        svg.append("text")
          .attr("x", labelX)
          .attr("y", cy + 4)
          .attr("font-size", "8.5px")
          .attr("font-weight", "700")
          .attr("fill", "rgba(46,26,18,0.72)")
          .text(d3.format(".0f")(d[metric.key]));
      });
    });
  });

  const legend = frame.append("div").attr("class", "chapter4-legend");
  [["Nonfat", "#5b3a26", "circle"], ["2% Milk", "#b07342", "circle-hollow"], ["Soymilk", "#ddb07f", "diamond"]].forEach(([label, color, type]) => {
    const item = legend.append("div").attr("class", "chapter4-legend-item");
    const swatch = item.append("span")
      .attr("class", "chapter4-legend-swatch");
    if (type === "circle-hollow") {
      swatch.style("background", "white").style("border", `2px solid ${color}`);
    } else {
      swatch.style("background", color);
    }
    item.append("span").text(label);
  });

  return { frame, body };
}
