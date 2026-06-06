const PROFILE_DATA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/synthetic_coffee_health_10000.csv`;
const FOCUS_DATA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/caffeine_intake_tracker.csv`;
const CONSUMPTION_DATA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/final.csv`;
const CONSUMPTION_ATTRIBUTES = new Set([
  "Domestic Consumption",
  "Rst,Ground Dom. Consum",
  "Soluble Dom. Cons.",
]);

const ORDERED_CATEGORIES = {
  Sleep_Quality: ["Excellent", "Good", "Fair", "Poor"],
  Stress_Level: ["Low", "Medium", "High"],
  Health_Issues: ["None", "Mild", "Moderate", "Severe"],
  Gender: ["Female", "Male", "Other"],
};

const COLOR_BUCKETS = {
  Sleep_Quality: ["#6f4e37", "#a06c44", "#cf9161", "#f1d7bd"],
  Stress_Level: ["#5b3a26", "#8f6e54", "#c6874e"],
  Health_Issues: ["#5b3a26", "#8f6e54", "#bfa08a", "#d9cdb8"],
  Gender: ["#5b3a26", "#8c5a38", "#b86a3f"],
};

const AGE_BANDS = [
  [18, 24, "18-24"],
  [25, 34, "25-34"],
  [35, 44, "35-44"],
  [45, 54, "45-54"],
  [55, 64, "55-64"],
  [65, 80, "65+"],
];

const DISPLAY_NAMES = {
  Coffee_Intake: "Coffee intake",
  Caffeine_mg: "Caffeine",
  Sleep_Hours: "Sleep hours",
  Sleep_Quality: "Sleep quality",
  Stress_Level: "Stress level",
  Health_Issues: "Health issues",
  Gender: "Gender",
  Occupation: "Occupation",
  Smoking: "Smoking",
  Alcohol_Consumption: "Alcohol",
};

const CATEGORY_LABELS = {
  Gender: {
    Female: "Female",
    Male: "Male",
    Other: "Other",
  },
  Smoking: {
    0: "Non-smoker",
    1: "Smoker",
  },
  Alcohol_Consumption: {
    0: "Non-drinker",
    1: "Drinker",
  },
};

function loadCsvFresh(url) {
  return fetch(url, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text().then((text) => d3.csvParse(text, d3.autoType));
  });
}

function loadConsumptionFresh(url) {
  return fetch(url, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text().then((text) => d3.csvParse(text, (row) => {
      const year = Number(row.Year);
      if (year < 1961 || !CONSUMPTION_ATTRIBUTES.has(row.Attribute_Description)) return null;
      return {
        country: String(row.Country_Name).trim(),
        year,
        attribute: row.Attribute_Description,
        value: Number(row.Value),
      };
    }));
  });
}

function parseRows(rows) {
  return rows.map((row) => ({
    id: row.ID,
    age: Number(row.Age),
    gender: String(row.Gender).trim(),
    Gender: String(row.Gender).trim(),
    country: String(row.Country).trim(),
    Country: String(row.Country).trim(),
    coffee: Number(row.Coffee_Intake),
    Coffee_Intake: Number(row.Coffee_Intake),
    caffeine: Number(row.Caffeine_mg),
    Caffeine_mg: Number(row.Caffeine_mg),
    sleep: Number(row.Sleep_Hours),
    Sleep_Hours: Number(row.Sleep_Hours),
    sleepQuality: String(row.Sleep_Quality).trim(),
    Sleep_Quality: String(row.Sleep_Quality).trim(),
    bmi: Number(row.BMI),
    BMI: Number(row.BMI),
    heartRate: Number(row.Heart_Rate),
    Heart_Rate: Number(row.Heart_Rate),
    stress: String(row.Stress_Level).trim(),
    Stress_Level: String(row.Stress_Level).trim(),
    activity: Number(row.Physical_Activity_Hours),
    Physical_Activity_Hours: Number(row.Physical_Activity_Hours),
    healthIssues: String(row.Health_Issues).trim(),
    Health_Issues: String(row.Health_Issues).trim(),
    occupation: String(row.Occupation).trim(),
    Occupation: String(row.Occupation).trim(),
    smoking: Number(row.Smoking),
    Smoking: Number(row.Smoking),
    alcohol: Number(row.Alcohol_Consumption),
    Alcohol_Consumption: Number(row.Alcohol_Consumption),
  }));
}

function parseTrackerRows(rows) {
  return rows.map((row) => {
    const isMorning = toBoolean(row.time_of_day_morning);
    const isAfternoon = toBoolean(row.time_of_day_afternoon);
    const isEvening = toBoolean(row.time_of_day_evening);
    const timeOfDay = isMorning ? "Morning" : isAfternoon ? "Afternoon" : isEvening ? "Evening" : "Unknown";

    return {
      id: row.ID ?? row.id ?? null,
      caffeine: Number(row.caffeine_mg),
      caffeineMg: Number(row.caffeine_mg),
      Caffeine_mg: Number(row.caffeine_mg),
      focus: Number(row.focus_level),
      focusLevel: Number(row.focus_level),
      Focus_level: Number(row.focus_level),
      age: Number(row.age),
      sleepQuality: Number(row.sleep_quality),
      sleepImpacted: Number(row.sleep_impacted),
      beverageCoffee: toBoolean(row.beverage_coffee),
      beverageEnergyDrink: toBoolean(row.beverage_energy_drink),
      beverageTea: toBoolean(row.beverage_tea),
      timeOfDay,
      time_of_day_morning: isMorning,
      time_of_day_afternoon: isAfternoon,
      time_of_day_evening: isEvening,
      genderFemale: toBoolean(row.gender_female),
      genderMale: toBoolean(row.gender_male),
    };
  });
}

function average(values) {
  return d3.mean(values.filter((value) => Number.isFinite(value))) ?? 0;
}

function toBoolean(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

function correlation(xs, ys) {
  const paired = xs.map((x, index) => [x, ys[index]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!paired.length) return 0;

  const meanX = d3.mean(paired, (d) => d[0]);
  const meanY = d3.mean(paired, (d) => d[1]);
  const numerator = d3.sum(paired, (d) => (d[0] - meanX) * (d[1] - meanY));
  const denomX = Math.sqrt(d3.sum(paired, (d) => (d[0] - meanX) ** 2));
  const denomY = Math.sqrt(d3.sum(paired, (d) => (d[1] - meanY) ** 2));
  if (!denomX || !denomY) return 0;
  return numerator / (denomX * denomY);
}

function formatShare(value) {
  return d3.format(".1%")(value);
}

function buildCountryStats(rows) {
  return Array.from(
    d3.rollup(
      rows,
      (values) => ({
        count: values.length,
        coffee: average(values.map((d) => d.coffee)),
        caffeine: average(values.map((d) => d.caffeine)),
        sleep: average(values.map((d) => d.sleep)),
        bmi: average(values.map((d) => d.bmi)),
        heartRate: average(values.map((d) => d.heartRate)),
      }),
      (d) => d.country,
    ),
    ([country, stats]) => ({
      country,
      ...stats,
    }),
  ).sort((a, b) => d3.descending(a.coffee, b.coffee) || d3.ascending(a.country, b.country));
}

function buildMeta(rows) {
  const coffeeValues = rows.map((d) => d.coffee);
  const sleepValues = rows.map((d) => d.sleep);
  const caffeineValues = rows.map((d) => d.caffeine);
  const bmiValues = rows.map((d) => d.bmi);
  const activityValues = rows.map((d) => d.activity);
  const heartRateValues = rows.map((d) => d.heartRate);
  const stressLowShare = rows.filter((d) => d.stress === "Low").length / rows.length;
  const healthySleepShare = rows.filter((d) => d.sleepQuality === "Good" || d.sleepQuality === "Excellent").length / rows.length;
  const noHealthIssueShare = rows.filter((d) => d.healthIssues === "None").length / rows.length;

  return {
    rowCount: rows.length,
    countryCount: new Set(rows.map((d) => d.country)).size,
    avgCoffee: average(coffeeValues),
    avgSleep: average(sleepValues),
    avgCaffeine: average(caffeineValues),
    avgBMI: average(bmiValues),
    avgActivity: average(activityValues),
    avgHeartRate: average(heartRateValues),
    stressLowShare,
    healthySleepShare,
    noHealthIssueShare,
    coffeeSleepCorrelation: correlation(coffeeValues, sleepValues),
  };
}

function buildAgeProfiles(rows) {
  return AGE_BANDS.map(([minAge, maxAge, label]) => {
    const values = rows.filter((row) => row.age >= minAge && row.age <= maxAge);
    return {
      label,
      minAge,
      maxAge,
      count: values.length,
      coffee: average(values.map((d) => d.coffee)),
      sleep: average(values.map((d) => d.sleep)),
      caffeine: average(values.map((d) => d.caffeine)),
    };
  }).filter((d) => d.count > 0);
}

function buildConsumptionByYear(rows) {
  const excludedRegions = new Set(["European Union"]);
  const recordsByYear = d3.rollup(
    rows.filter((row) => row.year >= 1961 && !excludedRegions.has(row.country)),
    (values) => {
      const metrics = Object.fromEntries(values.map((row) => [row.attribute, row.value]));
      return {
        total: metrics["Domestic Consumption"] ?? 0,
        roasted: metrics["Rst,Ground Dom. Consum"] ?? 0,
        soluble: metrics["Soluble Dom. Cons."] ?? 0,
      };
    },
    (row) => row.year,
    (row) => row.country,
  );

  const allYears = Array.from(recordsByYear, ([year, countries]) => ({
    year,
    countries: Array.from(countries, ([country, metrics]) => ({ country, ...metrics }))
      .filter((row) => row.total > 0)
      .sort((a, b) => d3.descending(a.total, b.total)),
  })).sort((a, b) => d3.ascending(a.year, b.year));

  return {
    allYears,
    latestYears: allYears.slice(-3),
    worldTrend: allYears.filter(({ year }) => year >= 2003).map(({ year, countries }) => ({
      year,
      total: d3.sum(countries, (row) => row.total),
      roasted: d3.sum(countries, (row) => row.roasted),
      soluble: d3.sum(countries, (row) => row.soluble),
    })),
  };
}

export async function loadChapter4Data() {
  const [rawRows, focusRows, consumptionRows] = await Promise.all([
    loadCsvFresh(PROFILE_DATA_URL),
    loadCsvFresh(FOCUS_DATA_URL),
    loadConsumptionFresh(CONSUMPTION_DATA_URL),
  ]);
  const rows = parseRows(rawRows);
  const trackerRows = parseTrackerRows(focusRows);
  const countries = buildCountryStats(rows);
  const ageProfiles = buildAgeProfiles(rows);
  const consumptionSeries = buildConsumptionByYear(consumptionRows);
  const meta = buildMeta(rows);

  return {
    rows,
    trackerRows,
    countries,
    ageProfiles,
    consumptionByYear: consumptionSeries.latestYears,
    worldConsumptionTrend: consumptionSeries.worldTrend,
    meta,
    orders: ORDERED_CATEGORIES,
    colorBuckets: COLOR_BUCKETS,
    displayNames: DISPLAY_NAMES,
  };
}

export function getOrderedCategories(field) {
  return ORDERED_CATEGORIES[field] ? [...ORDERED_CATEGORIES[field]] : [];
}

export function getColorBuckets(field) {
  return COLOR_BUCKETS[field] ? [...COLOR_BUCKETS[field]] : [];
}

export function getDisplayName(field) {
  return DISPLAY_NAMES[field] ?? field;
}

export function getCategoryLabel(field, value) {
  return CATEGORY_LABELS[field]?.[String(value)] ?? String(value);
}

export function getQuartileAssignments(rows) {
  const sorted = [...rows].sort((a, b) => d3.ascending(a.coffee, b.coffee));
  const q1 = d3.quantileSorted(sorted.map((d) => d.coffee), 0.25);
  const q2 = d3.quantileSorted(sorted.map((d) => d.coffee), 0.5);
  const q3 = d3.quantileSorted(sorted.map((d) => d.coffee), 0.75);

  return rows.map((row) => {
    const value = row.coffee;
    let quartile = "Q4";
    if (value <= q1) quartile = "Q1";
    else if (value <= q2) quartile = "Q2";
    else if (value <= q3) quartile = "Q3";
    return { ...row, quartile };
  });
}

export function formatMetricValue(key, value) {
  if (key === "avgCoffee") return `${d3.format(".2f")(value)} cups`;
  if (key === "avgSleep") return `${d3.format(".2f")(value)} h`;
  if (key === "avgCaffeine") return `${d3.format(",.0f")(value)} mg`;
  if (key === "avgBMI") return d3.format(".1f")(value);
  if (key === "avgActivity") return `${d3.format(".1f")(value)} h`;
  if (key === "avgHeartRate") return d3.format(".0f")(value);
  if (key === "stressLowShare" || key === "healthySleepShare" || key === "noHealthIssueShare") return formatShare(value);
  return d3.format(",.0f")(value);
}

export function formatShareValue(value) {
  return formatShare(value);
}
