import { getQuartileAssignments } from "./data.js";

const PROFILE_METRICS = {
  coffee: {
    field: "coffee",
    label: "coffee intake",
    format: (value) => `${d3.format(".2f")(value)} cups/day`,
    difference: (value) => `${d3.format(".2f")(value)} cups/day`,
  },
  sleep: {
    field: "sleep",
    label: "sleep",
    format: (value) => `${d3.format(".2f")(value)} hours`,
    difference: (value) => `${d3.format(".2f")(value)} hours`,
  },
  caffeine: {
    field: "caffeine",
    label: "caffeine intake",
    format: (value) => `${d3.format(".0f")(value)} mg/day`,
    difference: (value) => `${d3.format(".0f")(value)} mg/day`,
  },
};

function finiteValues(rows, field) {
  return rows.map((row) => Number(row[field])).filter(Number.isFinite).sort(d3.ascending);
}

function median(rows, field) {
  const values = finiteValues(rows, field);
  return values.length ? d3.quantileSorted(values, 0.5) : 0;
}

function lowerLeadingArticle(label) {
  return label.startsWith("The ") ? `the ${label.slice(4)}` : label;
}

function describeGap(high, low, metric, nearThreshold) {
  const gap = high.value - low.value;
  if (gap <= nearThreshold) {
    return `${high.label} and ${lowerLeadingArticle(low.label)} are nearly level; their ${metric.label} differs by only ${metric.difference(gap)}.`;
  }
  return `${high.label} is highest at ${metric.format(high.value)}, while ${lowerLeadingArticle(low.label)} is lowest at ${metric.format(low.value)}.`;
}

function rankingAnswers(countries) {
  return Object.fromEntries(
    Object.entries(PROFILE_METRICS).map(([key, metric]) => {
      const ranked = countries
        .map((country) => ({ label: country.country, value: country[metric.field] }))
        .sort((a, b) => d3.descending(a.value, b.value));
      const threshold = key === "caffeine" ? 5 : 0.05;
      return [key, describeGap(ranked[0], ranked.at(-1), metric, threshold)];
    }),
  );
}

function ageAnswers(ageProfiles) {
  return Object.fromEntries(
    ["coffee", "caffeine"].map((key) => {
      const metric = PROFILE_METRICS[key];
      const ranked = ageProfiles
        .map((band) => ({ label: `The ${band.label} age group`, value: band[key] }))
        .sort((a, b) => d3.descending(a.value, b.value));
      const threshold = key === "caffeine" ? 5 : 0.05;
      return [key, describeGap(ranked[0], ranked.at(-1), metric, threshold)];
    }),
  );
}

function groupedMedianAnswers(rows, field, categories, labels = {}) {
  return Object.fromEntries(
    ["coffee", "caffeine"].map((key) => {
      const metric = PROFILE_METRICS[key];
      const ranked = categories
        .map((category) => {
          const subset = rows.filter((row) => String(row[field]) === String(category));
          return {
            label: labels[category] ?? String(category),
            value: median(subset, metric.field),
          };
        })
        .sort((a, b) => d3.descending(a.value, b.value));
      const threshold = key === "caffeine" ? 5 : 0.05;
      return [key, describeGap(ranked[0], ranked.at(-1), metric, threshold)];
    }),
  );
}

function quartileRows(rows) {
  const assigned = getQuartileAssignments(rows);
  return ["Q1", "Q2", "Q3", "Q4"].map((quartile) => ({
    quartile,
    rows: assigned.filter((row) => row.quartile === quartile),
  }));
}

function continuousOutcomeAnswer(groups, field, format, noun) {
  const values = groups.map((group) => median(group.rows, field));
  const change = values.at(-1) - values[0];
  const direction = Math.abs(change) < 0.01 ? "stays almost unchanged" : change > 0 ? "rises" : "falls";
  return `Median ${noun} ${direction} from ${format(values[0])} in Q1 to ${format(values.at(-1))} in Q4.`;
}

function share(rows, predicate) {
  return rows.length ? rows.filter(predicate).length / rows.length : 0;
}

function categoricalOutcomeAnswer(groups, predicate, label) {
  const values = groups.map((group) => share(group.rows, predicate));
  const change = values.at(-1) - values[0];
  const direction = Math.abs(change) < 0.005 ? "is virtually unchanged" : change > 0 ? "rises" : "falls";
  return `The ${label} share ${direction}: ${d3.format(".1%")(values[0])} in Q1 versus ${d3.format(".1%")(values.at(-1))} in Q4.`;
}

function outcomeAnswers(rows) {
  const groups = quartileRows(rows);
  return {
    sleep: continuousOutcomeAnswer(groups, "sleep", (value) => `${d3.format(".2f")(value)} hours`, "sleep"),
    sleepQuality: categoricalOutcomeAnswer(
      groups,
      (row) => row.sleepQuality === "Excellent" || row.sleepQuality === "Good",
      "good-or-excellent sleep",
    ),
    stress: categoricalOutcomeAnswer(groups, (row) => row.stress === "High", "high-stress"),
    bmi: continuousOutcomeAnswer(groups, "bmi", (value) => d3.format(".1f")(value), "BMI"),
    activity: continuousOutcomeAnswer(groups, "activity", (value) => `${d3.format(".2f")(value)} hours`, "activity"),
    healthIssues: categoricalOutcomeAnswer(groups, (row) => row.healthIssues !== "None", "reported health-issue"),
  };
}

function focusQuartiles(rows, flag) {
  const subset = rows.filter((row) => row[flag]);
  const caffeineValues = finiteValues(subset, "caffeine");
  const cuts = [0.25, 0.5, 0.75].map((quantile) => d3.quantileSorted(caffeineValues, quantile) ?? 0);

  return ["Q1", "Q2", "Q3", "Q4"].map((quartile, index) => {
    const selected = subset.filter((row) => {
      if (index === 0) return row.caffeine <= cuts[0];
      if (index === 1) return row.caffeine > cuts[0] && row.caffeine <= cuts[1];
      if (index === 2) return row.caffeine > cuts[1] && row.caffeine <= cuts[2];
      return row.caffeine > cuts[2];
    });
    return median(selected, "focus");
  });
}

function focusAnswer(rows, flag, period) {
  const values = focusQuartiles(rows, flag);
  const change = values.at(-1) - values[0];
  const direction = Math.abs(change) < 0.01 ? "barely changes" : change > 0 ? "increases" : "decreases";
  return `For ${period} consumption, median focus ${direction} from ${d3.format(".2f")(values[0])} in Q1 to ${d3.format(".2f")(values.at(-1))} in Q4.`;
}

function focusScatterSummary(rows) {
  const assigned = getQuartileAssignments(rows, "caffeine").filter((row) => row.timeOfDay && Number.isFinite(row.focus));
  const quartileIndex = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
  const groups = [
    { key: "Morning", label: "Morning" },
    { key: "Afternoon", label: "Afternoon" },
    { key: "Evening", label: "Evening" },
  ];

  const medianRegression = (points) => {
    const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (finite.length < 2) return 0;
    const slopes = [];
    for (let i = 0; i < finite.length; i += 1) {
      for (let j = i + 1; j < finite.length; j += 1) {
        const dx = finite[j].x - finite[i].x;
        if (!dx) continue;
        slopes.push((finite[j].y - finite[i].y) / dx);
      }
    }
    return d3.median(slopes) ?? 0;
  };

  const parts = groups.map(({ key, label }) => {
    const subset = assigned.filter((row) => row.timeOfDay === key);
    if (!subset.length) return `${label} has too few points to fit a trend.`;
    const quartiles = ["Q1", "Q2", "Q3", "Q4"].map((quartile) => {
      const values = subset
        .filter((row) => row.quartile === quartile)
        .map((row) => Number(row.focus))
        .filter((value) => Number.isFinite(value))
        .sort(d3.ascending);
      return {
        quartile,
        x: quartileIndex[quartile],
        median: d3.median(values) ?? 0,
        count: values.length,
      };
    }).filter((group) => group.count > 0);
    if (!quartiles.length) return `${label} has too few points to fit a trend.`;
    const beta = medianRegression(quartiles.map((group) => ({ x: group.x, y: group.median })));
    const q1 = quartiles.find((group) => group.quartile === "Q1")?.median ?? 0;
    const q4 = quartiles.find((group) => group.quartile === "Q4")?.median ?? q1;
    return `${label} (n=${subset.length}) has median β=${d3.format("+.4f")(beta)} and median focus moves from ${d3.format(".2f")(q1)} in Q1 to ${d3.format(".2f")(q4)} in Q4.`;
  });

  return parts.join(" ");
}

function consumptionAnswers(consumptionByYear) {
  return Object.fromEntries(consumptionByYear.map(({ year, countries }) => {
    const leader = countries[0];
    const solubleShare = leader.total ? leader.soluble / leader.total : 0;
    return [
      String(year),
      `${leader.country} leads in ${year} with ${d3.format(".1f")(leader.total / 1000)} million 60 kg bags; ${d3.format(".0%")(solubleShare)} is soluble coffee.`,
    ];
  }));
}

function worldTrendAnswer(trend) {
  const first = trend[0];
  const last = trend.at(-1);
  const change = first.total ? last.total / first.total - 1 : 0;
  return `Across the stable-coverage period, global domestic consumption rises from ${d3.format(".1f")(first.total / 1000)} million bags in ${first.year} to ${d3.format(".1f")(last.total / 1000)} million in ${last.year}, an increase of ${d3.format(".0%")(change)}.`;
}

export function buildChapter4Answers(data) {
  const ar = data.cqiArabica;
  const rb = data.cqiRobusta;
  return {
    beanShare: {
      all: `Arabica dominates at ~65% of global production with 0.8-1.4% caffeine, while Robusta (30%) packs 1.7-4.0% caffeine and Liberica (<5%) rounds out the supply.`,
    },
    sensoryRadar: {
      all: `Arabica (avg ${ar.totalScoreAvg.toFixed(1)} pts, n=${ar.count}) outpaces Robusta (${rb.totalScoreAvg.toFixed(1)} pts, n=${rb.count}) across all seven sensory dimensions, with the largest gaps in aroma (${ar.dimensions.Aroma.toFixed(2)} vs ${rb.dimensions.Aroma.toFixed(2)}) and acidity (${ar.dimensions.Acidity.toFixed(2)} vs ${rb.dimensions.Acidity.toFixed(2)}).`,
    },
    altitudeQuality: {
      all: `Across ${data.altitudeData.length} CQI-graded lots, the correlation between altitude and cup score is modest. Arabica spans a wider altitude range (${d3.min(data.altitudeData.filter(d => d.species === 'Arabica'), d => d.altitude).toFixed(0)}–${d3.max(data.altitudeData.filter(d => d.species === 'Arabica'), d => d.altitude).toFixed(0)} m) while Robusta clusters below 2000 m.`,
    },
    processingMethod: {
      all: `Washed processing is the most common method (${data.processingStats.find(d => d.method === 'Washed / Wet')?.count ?? 0} lots) and shows a slightly higher median than natural/dry processing. Semi-washed and honey methods occupy the middle ground.`,
    },
    caffeineRange: {
      all: `Brewed coffee leads with an average of ${d3.format(".0f")(data.categoryCaffeine.find(d => d.category === 'Coffee')?.avg ?? 0)} mg, peaking at ${d3.format(".0f")(data.categoryCaffeine.find(d => d.category === 'Coffee')?.max ?? 0)} mg for a Venti. Classic espresso drinks average ${d3.format(".0f")(data.categoryCaffeine.find(d => d.category === 'Classic Espresso Drinks')?.avg ?? 0)} mg.`,
    },
    nutrientCompare: {
      all: `Among six classic Grande drinks, the Caffè Mocha is the most calorie-dense at ${data.beverageNutrients.find(d => d.beverage === 'Caffè Mocha')?.calories ?? 0} cal, while Americano and Espresso keep calories below 20. Protein varies from ${d3.min(data.beverageNutrients, d => d.protein).toFixed(1)} g to ${d3.max(data.beverageNutrients, d => d.protein).toFixed(1)} g.`,
    },
    milkChoice: {
      all: `Switching from 2% to nonfat milk in a Grande latte cuts calories by about ${((data.milkComparison.find(d => d.size === 'Grande' && d.milk === '2%')?.calories ?? 0) - (data.milkComparison.find(d => d.size === 'Grande' && d.milk === 'Nonfat')?.calories ?? 0)).toFixed(0)} cal and fat by ${((data.milkComparison.find(d => d.size === 'Grande' && d.milk === '2%')?.fat ?? 0) - (data.milkComparison.find(d => d.size === 'Grande' && d.milk === 'Nonfat')?.fat ?? 0)).toFixed(1)} g, while protein remains similar. Soy milk sits between the two.`,
    },
    worldTrend: {
      all: worldTrendAnswer(data.worldConsumptionTrend),
    },
    consumption: consumptionAnswers(data.consumptionByYear),
    ranking: rankingAnswers(data.countries),
    age: ageAnswers(data.ageProfiles),
    gender: groupedMedianAnswers(data.rows, "Gender", ["Female", "Male", "Other"], {
      Female: "The female group",
      Male: "The male group",
      Other: "The other-gender group",
    }),
    occupation: groupedMedianAnswers(data.rows, "Occupation", ["Healthcare", "Office", "Other", "Service", "Student"]),
    alcohol: groupedMedianAnswers(data.rows, "Alcohol_Consumption", ["0", "1"], {
      0: "The non-drinker group",
      1: "The drinker group",
    }),
    smoking: groupedMedianAnswers(data.rows, "Smoking", ["0", "1"], {
      0: "The non-smoker group",
      1: "The smoker group",
    }),
    outcome: outcomeAnswers(data.rows),
    focus: {
      all: focusScatterSummary(data.trackerRows),
    },
  };
}
