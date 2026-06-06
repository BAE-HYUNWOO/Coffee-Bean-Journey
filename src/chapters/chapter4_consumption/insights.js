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
  return {
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
      morning: focusAnswer(data.trackerRows, "time_of_day_morning", "morning"),
      afternoon: focusAnswer(data.trackerRows, "time_of_day_afternoon", "afternoon"),
      evening: focusAnswer(data.trackerRows, "time_of_day_evening", "evening"),
    },
  };
}
