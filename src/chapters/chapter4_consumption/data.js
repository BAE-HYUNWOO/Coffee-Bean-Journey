const PROFILE_DATA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/synthetic_coffee_health_10000.csv`;
const FOCUS_DATA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/caffeine_intake_tracker.csv`;
const CONSUMPTION_DATA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/final.csv`;
const CQI_ARABICA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/ Coffee Quality Institute Database Mirror/arabica_data_cleaned.csv`;
const CQI_ROBUSTA_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/ Coffee Quality Institute Database Mirror/robusta_data_cleaned.csv`;
const STARBUCKS_URL = `${import.meta.env.BASE_URL}data/chapter4_consumption/processed/starbucks/starbucks.csv`;
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

const CQI_FIELD_MAP = {
  Aroma: { arabica: "Aroma", robusta: "Fragrance...Aroma" },
  Flavor: { arabica: "Flavor", robusta: "Flavor" },
  Aftertaste: { arabica: "Aftertaste", robusta: "Aftertaste" },
  Acidity: { arabica: "Acidity", robusta: "Salt...Acid" },
  Body: { arabica: "Body", robusta: "Mouthfeel" },
  Balance: { arabica: "Balance", robusta: "Balance" },
  CleanCup: { arabica: "Clean.Cup", robusta: "Clean.Cup" },
};

function parseCqiRow(row, species) {
  const col = species === "Arabica" ? "arabica" : "robusta";
  const getField = (dim) => CQI_FIELD_MAP[dim][col];
  const num = (dim) => {
    const v = Number(row[getField(dim)]);
    return Number.isFinite(v) ? v : null;
  };
  return {
    species,
    country: String(row["Country.of.Origin"] ?? "").trim(),
    processing: String(row["Processing.Method"] ?? "").trim(),
    altitude: Number(row["altitude_mean_meters"]),
    totalScore: Number(row["Total.Cup.Points"]),
    dimensions: Object.keys(CQI_FIELD_MAP).reduce((acc, dim) => {
      acc[dim] = num(dim);
      return acc;
    }, {}),
  };
}

function loadCqiFresh(url, species) {
  return fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load CQI ${species}: ${r.status}`);
    return r.text().then((text) => d3.csvParse(text, (row) => parseCqiRow(row, species)));
  });
}

function parseStarbucksRow(row) {
  const num = (field) => {
    const v = Number(row[field]);
    return Number.isFinite(v) ? v : null;
  };
  return {
    category: String(row["Beverage_category"] ?? "").trim(),
    beverage: String(row["Beverage"] ?? "").trim(),
    prep: String(row["Beverage_prep"] ?? "").trim(),
    calories: num("Calories"),
    fat: num(" Total Fat (g)"),
    saturatedFat: num("Saturated Fat (g)"),
    carbs: num(" Total Carbohydrates (g) "),
    sugars: num(" Sugars (g)"),
    protein: num(" Protein (g) "),
    caffeine: num("Caffeine (mg)"),
    sodium: num(" Sodium (mg)"),
  };
}

function buildCqiAverages(rows) {
  const dims = Object.keys(CQI_FIELD_MAP);
  return {
    species: rows[0]?.species ?? "",
    count: rows.length,
    countryCount: new Set(rows.map((r) => r.country)).size,
    altitudeAvg: d3.mean(rows, (r) => r.altitude > 0 && r.altitude <= 5000 ? r.altitude : null) ?? 0,
    totalScoreAvg: d3.mean(rows, (r) => r.totalScore > 0 ? r.totalScore : null) ?? 0,
    dimensions: Object.fromEntries(
      dims.map((dim) => [
        dim,
        d3.mean(rows, (r) => r.dimensions[dim] != null ? r.dimensions[dim] : null) ?? 0,
      ]),
    ),
  };
}

function buildCqiAltitudeData(arabicaRows, robustaRows) {
  const valid = (r) => r.totalScore > 0 && r.altitude > 0 && r.altitude <= 5000;
  return [
    ...arabicaRows.filter(valid).map((r) => ({ species: "Arabica", altitude: r.altitude, score: r.totalScore })),
    ...robustaRows.filter(valid).map((r) => ({ species: "Robusta", altitude: r.altitude, score: r.totalScore })),
  ];
}

function buildProcessingStats(arabicaRows) {
  const groups = d3.rollup(
    arabicaRows.filter((r) => r.totalScore > 0 && r.processing),
    (values) => values.map((r) => r.totalScore),
    (r) => r.processing,
  );
  return Array.from(groups, ([method, scores]) => {
    const sorted = [...scores].sort(d3.ascending);
    return {
      method,
      count: sorted.length,
      min: sorted[0],
      q1: d3.quantileSorted(sorted, 0.25),
      median: d3.quantileSorted(sorted, 0.5),
      q3: d3.quantileSorted(sorted, 0.75),
      max: sorted[sorted.length - 1],
      mean: d3.mean(sorted),
    };
  }).filter((d) => d.count >= 10)
   .sort((a, b) => d3.descending(a.median, b.median));
}

function buildStarbucksCategoryCaffeine(rows) {
  return Array.from(
    d3.rollup(
      rows.filter((r) => r.caffeine != null),
      (values) => {
        const vals = values.map((r) => r.caffeine);
        return {
          avg: d3.mean(vals),
          min: d3.min(vals),
          max: d3.max(vals),
          count: vals.length,
        };
      },
      (r) => r.category,
    ),
    ([category, stats]) => ({ category, ...stats }),
  ).sort((a, b) => d3.descending(a.avg, b.avg));
}

function buildStarbucksBeverageNutrients(rows) {
  const lookup = [
    { name: "Caffè Americano", prep: "Grande" },
    { name: "Caffè Latte", prep: "2% Milk" },
    { name: "Cappuccino", prep: "2% Milk" },
    { name: "Caffè Mocha (Without Whipped Cream)", prep: "2% Milk" },
    { name: "Espresso", prep: "Doppio" },
  ];
  return lookup.map(({ name, prep }) => {
    const match = rows.find((r) => r.beverage === name && r.prep === prep);
    if (!match) return null;
    return {
      beverage: name.replace(" (Without Whipped Cream)", ""),
      calories: match.calories,
      fat: match.fat,
      carbs: match.carbs,
      protein: match.protein,
      caffeine: match.caffeine,
    };
  }).filter(Boolean);
}

function buildStarbucksMilkComparison(rows) {
  const SIZE_ORDER = ["Short", "Tall", "Grande", "Venti"];
  const MILK_ORDER = ["Nonfat", "2%", "Soy"];
  const entries = rows.filter((r) => r.beverage === "Caffè Latte");
  return entries.map((r, i) => {
    const gi = Math.floor(i / 3);
    const mi = i % 3;
    const hasSize = /^(Short|Tall|Grande|Venti)\s/.test(r.prep);
    const size = hasSize
      ? SIZE_ORDER.find((s) => r.prep.startsWith(s)) ?? "Unknown"
      : SIZE_ORDER[gi] ?? "Unknown";
    const milk = r.prep.includes("Nonfat") ? "Nonfat"
                : r.prep.includes("Soy") ? "Soy"
                : r.prep.includes("2%") ? "2%" : MILK_ORDER[mi] ?? "Unknown";
    return { size, milk, calories: r.calories, fat: r.fat, carbs: r.carbs, protein: r.protein, caffeine: r.caffeine };
  });
}

export async function loadChapter4Data() {
  const [rawRows, focusRows, consumptionRows, arabicaCqi, robustaCqi, starbucksRows] = await Promise.all([
    loadCsvFresh(PROFILE_DATA_URL),
    loadCsvFresh(FOCUS_DATA_URL),
    loadConsumptionFresh(CONSUMPTION_DATA_URL),
    loadCqiFresh(CQI_ARABICA_URL, "Arabica"),
    loadCqiFresh(CQI_ROBUSTA_URL, "Robusta"),
    loadCsvFresh(STARBUCKS_URL).then((rows) => rows.map(parseStarbucksRow)),
  ]);
  const rows = parseRows(rawRows);
  const trackerRows = parseTrackerRows(focusRows);
  const countries = buildCountryStats(rows);
  const ageProfiles = buildAgeProfiles(rows);
  const consumptionSeries = buildConsumptionByYear(consumptionRows);
  const meta = buildMeta(rows);

  const beanShare = [
    { label: "Arabica", value: 65, caffeine: "0.8-1.4%" },
    { label: "Robusta", value: 30, caffeine: "1.7-4.0%" },
    { label: "Liberica", value: 5, caffeine: "< 1.0%" },
  ];
  const cqiArabica = buildCqiAverages(arabicaCqi);
  const cqiRobusta = buildCqiAverages(robustaCqi);
  const altitudeData = buildCqiAltitudeData(arabicaCqi, robustaCqi);
  const processingStats = buildProcessingStats(arabicaCqi);
  const categoryCaffeine = buildStarbucksCategoryCaffeine(starbucksRows);
  const beverageNutrients = buildStarbucksBeverageNutrients(starbucksRows);
  const milkComparison = buildStarbucksMilkComparison(starbucksRows);

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
    beanShare,
    cqiArabica,
    cqiRobusta,
    altitudeData,
    processingStats,
    categoryCaffeine,
    beverageNutrients,
    milkComparison,
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

export function getQuartileAssignments(rows, field = "coffee") {
  const sorted = [...rows].sort((a, b) => d3.ascending(a[field], b[field]));
  const values = sorted.map((d) => d[field]).filter((value) => Number.isFinite(value));
  const q1 = d3.quantileSorted(values, 0.25);
  const q2 = d3.quantileSorted(values, 0.5);
  const q3 = d3.quantileSorted(values, 0.75);

  return rows.map((row) => {
    const value = Number(row[field]);
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
