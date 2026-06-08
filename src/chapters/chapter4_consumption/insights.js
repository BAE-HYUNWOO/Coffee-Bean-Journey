import * as d3 from "d3";
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

function varyEnding(phrases, seed) {
  return phrases[Math.abs(Math.floor(seed * 100)) % phrases.length];
}

function describeGap(high, low, metric, nearThreshold) {
  const gap = high.value - low.value;
  const ratio = high.value && low.value ? high.value / low.value : 1;
  if (gap <= nearThreshold) {
    return `${high.label}和${lowerLeadingArticle(low.label)}的${metric.label}差距仅为${metric.difference(gap)}，差异很小。`;
  }
  const end = ratio > 3 ? "首尾差距非常大。" : ratio > 1.5 ? "差距相当明显。" : "有一定差异。";
  return `${high.label}以${metric.format(high.value)}稳居榜首，${lowerLeadingArticle(low.label)}排在末端（${metric.format(low.value)}），两者相差${metric.difference(gap)}。${end}`;
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
      const bands = [...ageProfiles].sort((a, b) => d3.ascending(a.minAge, b.minAge));
      const peak = ageProfiles.reduce((a, b) => b[key] > a[key] ? b : a);
      const noun = key === "caffeine" ? "咖啡因" : "咖啡";
      return [key, `${noun}摄入在各年龄段之间差异很小。${peak.label}岁组略微领先（${metric.format(peak[key])}），之后随年龄缓步下降。${key === "caffeine" ? "咖啡因" : "咖啡"}是一个几乎贯穿整个成年阶段的习惯，而不是某个年龄段的专属。`];
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
  const magnitude = Math.abs(change);
  if (magnitude < 0.01) {
    return `${noun}和咖啡摄入量之间没有明显关联，数据上几乎是一条直线。`;
  }
  const dir = change > 0 ? "上升" : "下降";
  return `从低摄入到高摄入，${noun}中位数从${format(values[0])}${dir}至${format(values.at(-1))}。`;
}

function share(rows, predicate) {
  return rows.length ? rows.filter(predicate).length / rows.length : 0;
}

function categoricalOutcomeAnswer(groups, predicate, label) {
  const values = groups.map((group) => share(group.rows, predicate));
  const change = values.at(-1) - values[0];
  const magnitude = Math.abs(change);
  if (magnitude < 0.005) {
    return `${label}的比例在不同咖啡摄入水平之间几乎不变。`;
  }
  const dir = change > 0 ? "上升" : "下降";
  return `高摄入组${label}的比例比低摄入组${dir}了——从${d3.format(".1%")(values[0])}变为${d3.format(".1%")(values.at(-1))}。`;
}

function outcomeContinuousAnswer(groups, field, format, noun) {
  const values = groups.map((group) => median(group.rows, field));
  const change = values.at(-1) - values[0];
  const magnitude = Math.abs(change);
  if (magnitude < 0.01) {
    return `${noun}在所有咖啡摄入水平上几乎完全相同。`;
  }
  const dir = change > 0 ? "上升" : "下降";
  return `从低摄入到高摄入，${noun}中位数从${format(values[0])}${dir}至${format(values.at(-1))}。`;
}

function outcomeCategoricalAnswer(groups, predicate, label) {
  const values = groups.map((group) => share(group.rows, predicate));
  const change = values.at(-1) - values[0];
  const magnitude = Math.abs(change);
  if (magnitude < 0.005) {
    return `${label}的比例在不同咖啡摄入水平之间几乎不变。`;
  }
  const dir = change > 0 ? "上升" : "下降";
  return `高摄入组${label}的比例比低摄入组${dir}了——从${d3.format(".1%")(values[0])}变为${d3.format(".1%")(values.at(-1))}。`;
}

function outcomeAnswers(rows) {
  const groups = quartileRows(rows);
  return {
    sleep: outcomeContinuousAnswer(groups, "sleep", (v) => `${d3.format(".2f")(v)}h`, "睡眠时长"),
    sleepQuality: outcomeCategoricalAnswer(groups, (r) => r.sleepQuality === "Excellent" || r.sleepQuality === "Good", "优质睡眠"),
    stress: outcomeCategoricalAnswer(groups, (r) => r.stress === "High", "高压力"),
    bmi: outcomeContinuousAnswer(groups, "bmi", (v) => d3.format(".1f")(v), "BMI"),
    activity: outcomeContinuousAnswer(groups, "activity", (v) => `${d3.format(".2f")(v)}h`, "运动时长"),
    healthIssues: outcomeCategoricalAnswer(groups, (r) => r.healthIssues !== "None", "健康问题"),
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

function focusAnswerText(rows) {
  const periods = [
    { flag: "time_of_day_morning", label: "早晨" },
    { flag: "time_of_day_afternoon", label: "中午" },
    { flag: "time_of_day_evening", label: "晚上" },
  ];
  const results = periods.map(({ flag, label }) => {
    const q = focusQuartiles(rows, flag);
    return { label, low: q[0], high: q.at(-1) };
  });
  const best = results.reduce((a, b) => (b.high - b.low) > (a.high - a.low) ? b : a);
  return `当然可以，不论早中晚，摄入更多咖啡因都会提高专注力。整体而言，${best.label}来一杯咖啡最能提神。`;
}

function consumptionAnswers(consumptionByYear) {
  return Object.fromEntries(consumptionByYear.map(({ year, countries }) => {
    const leader = countries[0];
    const runner = countries[1];
    const solubleShare = leader.total ? leader.soluble / leader.total : 0;
    const runnerSoluble = runner?.total ? runner.soluble / runner.total : 0;
    const insight = year === "2022" ? " — 速溶咖啡占比约" : "";
    return [
      String(year),
      `${leader.country}（${d3.format(".1f")(leader.total / 1000)}百万袋）是${year}年的全球咖啡消费冠军，其中速溶咖啡占${d3.format(".0%")(solubleShare)}。${runner ? runner.country + "紧随其后。" : ""}`,
    ];
  }));
}

function worldTrendAnswer(trend) {
  const first = trend[0];
  const last = trend.at(-1);
  const firstTotal = d3.sum(first.countries, (c) => c.total) / 1000;
  const lastTotal = d3.sum(last.countries, (c) => c.total) / 1000;
  const change = firstTotal ? lastTotal / firstTotal - 1 : 0;
  const direction = change > 0 ? "增长了" : "下降了";
  return `答案是：在增长。从${first.year}年到${last.year}年，全球咖啡消费从${d3.format(".1f")(firstTotal)}百万袋${direction}至${d3.format(".1f")(lastTotal)}百万袋，涨幅约${d3.format(".0%")(change)}。`;
}

export function buildChapter4Answers(data) {
  const ar = data.cqiArabica;
  const rb = data.cqiRobusta;
  const coffeeMax = data.categoryCaffeine.find(d => d.category === 'Coffee');
  const espressoAvg = data.categoryCaffeine.find(d => d.category === 'Classic Espresso Drinks');
  const mochaData = data.beverageNutrients.find(d => d.beverage === 'Caffè Mocha');
  const amer = data.beverageNutrients.find(d => d.beverage === 'Caffè Americano');
  const grand2p = data.milkComparison.find(d => d.size === 'Grande' && d.milk === '2%');
  const grandNon = data.milkComparison.find(d => d.size === 'Grande' && d.milk === 'Nonfat');
  const calDiff = (grand2p?.calories ?? 0) - (grandNon?.calories ?? 0);
  const fatDiff = ((grand2p?.fat ?? 0) - (grandNon?.fat ?? 0)).toFixed(1);

  return {
    beanShare: {
      all: `市面上的咖啡豆有两个主角：阿拉比卡占了约65%，是精品咖啡的灵魂——香气细腻、酸度明亮、咖啡因温和（0.8-1.4%）。罗布斯塔约30%，苦味更重、咖啡因是阿拉比卡的2~3倍，主打速溶和拼配，二者几乎迎合了绝大部分消费者的口味偏好。剩下不到5%是利比里卡以及其他品种，咖中贵族但口味小众。阿拉比卡价格一般是罗布斯塔的1.3~2倍，如果遇到巴西减产、气候异常（近两年就比较典型），阿拉比卡价格涨得更猛，价格可翻数倍。`,
    },
    sensoryRadar: {
      all: `当然有道理。阿拉比卡在CQI七项感官评分上全面超越罗布斯塔，尤其在香气和酸度上差距最大——这两项恰好是"精品咖啡"最值钱的品质。罗布斯塔并非一无是处，它在醇厚度上咬得最紧，但整体差距（${ar.totalScoreAvg.toFixed(1)} vs ${rb.totalScoreAvg.toFixed(1)}分）解释了为什么你家楼下咖啡馆的单品手冲永远是阿拉比卡。此外，<a href="https://accademiaespresso.com/en/understanding-the-c-market/" target="_blank" rel="noopener">较高的咖啡因天然具有抗虫作用</a>，所以罗布斯塔不容易受虫灾影响，自然稳定平价。`,
    },
    altitudeQuality: {
      all: `整体上呈现很微弱的正相关。海拔能为咖啡提供更慢的成熟节奏，但<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8531415/" target="_blank" rel="noopener">土壤、品种和处理方法远远起更大的作用</a>。`,
    },
    processingMethod: {
      all: `咖啡豆主流加工方法是日晒处理和水洗处理；不同处理法的平均杯测分数差异较小，整体上，干处理法对于咖啡豆果香风味的保留更佳。其实加工方式的关键差异不在于"哪个更好"，而在于水洗需要稳定的水源和设施，很多小农做不到。`,
    },
    caffeineRange: {
      all: `一杯超大杯黑咖啡（Venti Brewed Coffee）含${coffeeMax?.max.toFixed(0) ?? "410"}mg咖啡因——大约相当于四杯浓缩咖啡的总和，几乎是单杯拿铁的三倍。相比之下，星冰乐和茶饮咖啡因含量低得多。结论很简单：想提神，别加奶油和糖，直接喝黑的。`,
    },
    nutrientCompare: {
      all: `拿铁不只是"咖啡加奶"——一杯中杯拿铁约含${mochaData?.calories ?? 260}卡路里和${mochaData?.carbs ?? 34}克碳水化合物。对比美式咖啡只要${amer?.calories ?? 15}卡路里和几乎不变的咖啡因含量（${amer?.caffeine ?? 225}mg）——从"一杯咖啡"到"一杯甜点"，营养差距巨大。`,
    },
    milkChoice: {
      all: `换成脱脂奶，一杯中杯拿铁的卡路里能减少约${calDiff.toFixed(0)}卡——每天一杯，一年就是${(calDiff * 365).toFixed(0)}卡的差距。豆奶居中。蛋白质含量基本不变，不影响饱腹感。所以如果你想减卡，只换奶不换量是一个不费力的切入点。`,
    },
    worldTrend: {
      all: worldTrendAnswer(data.worldTrendCountries),
    },
    consumption: consumptionAnswers(data.consumptionByYear),
    ranking: rankingAnswers(data.countries),
    age: ageAnswers(data.ageProfiles),
    gender: groupedMedianAnswers(data.rows, "Gender", ["Female", "Male", "Other"], {
      Female: "女性",
      Male: "男性",
      Other: "其他性别群体",
    }),
    occupation: groupedMedianAnswers(data.rows, "Occupation", ["Healthcare", "Office", "Other", "Service", "Student"]),
    alcohol: groupedMedianAnswers(data.rows, "Alcohol_Consumption", ["0", "1"], {
      0: "不喝酒的群体",
      1: "喝酒的群体",
    }),
    smoking: groupedMedianAnswers(data.rows, "Smoking", ["0", "1"], {
      0: "不吸烟的群体",
      1: "吸烟的群体",
    }),
    outcome: outcomeAnswers(data.rows),
    focus: {
      all: focusAnswerText(data.trackerRows),
    },
  };
}
