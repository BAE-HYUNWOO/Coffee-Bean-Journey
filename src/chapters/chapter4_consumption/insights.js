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
  const endingsSmall = [
    "两个群体在这一点上其实很接近。",
    "几乎可以认为没有差别。",
    "这个差异在实际体感上可以忽略。",
  ];
  const endingsModerate = [
    "差距相当明显。",
    "分化肉眼可见。",
    "这可不是小打小闹的差异。",
    "差距摆在眼前，挺直观的。",
  ];
  const endingsLarge = [
    "这是碾压级的领先。",
    "差距大到不太可能只是巧合。",
    "首尾两端仿佛来自两个世界。",
    "榜首和末尾之间隔了一道鸿沟。",
  ];
  if (gap <= nearThreshold) {
    return `几乎看不出差距：${high.label}和${lowerLeadingArticle(low.label)}的${metric.label}差距仅为${metric.difference(gap)}——${varyEnding(endingsSmall, gap)}`;
  }
  const endings = ratio > 3 ? endingsLarge : ratio > 1.5 ? endingsModerate : endingsSmall;
  return `${high.label}以${metric.format(high.value)}稳居榜首，${lowerLeadingArticle(low.label)}排在末端（${metric.format(low.value)}），两者相差${metric.difference(gap)}——${varyEnding(endings, ratio)}`;
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
        .map((band) => ({ label: `${band.label}岁组`, value: band[key] }))
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
  const magnitude = Math.abs(change);
  const noChange = [
    `${noun}和咖啡摄入量之间看不出关联——数据上几乎是一条直线。`,
    `不管喝多喝少，${noun}的变化微乎其微，两者没有明显瓜葛。`,
  ];
  const mild = [
    `变化存在，但幅度不大。`,
    `趋势有，但算不上剧烈。`,
    `略有波动，整体平稳。`,
  ];
  const strong = [
    `趋势相当明显，关联性不容忽视。`,
    `这个变化幅度值得认真看待。`,
    `关联性比较强，不是随机波动能解释的。`,
  ];
  if (magnitude < 0.01) {
    return varyEnding(noChange, Math.random());
  }
  const dir = change > 0 ? "上升" : "下降";
  const emphasis = magnitude > 0.5 ? varyEnding(strong, change) : varyEnding(mild, magnitude);
  return `从低摄入到高摄入，${noun}中位数从${format(values[0])}${dir}至${format(values.at(-1))}。${emphasis}`;
}

function share(rows, predicate) {
  return rows.length ? rows.filter(predicate).length / rows.length : 0;
}

function categoricalOutcomeAnswer(groups, predicate, label) {
  const values = groups.map((group) => share(group.rows, predicate));
  const change = values.at(-1) - values[0];
  const magnitude = Math.abs(change);
  const noChange = [
    `${label}的比例几乎是一条水平线，看不出趋势。`,
    `咖啡摄入量对${label}似乎没什么影响——比例基本没动。`,
  ];
  const mild = [
    `变化有，但不算大，谨慎解读。`,
    `有些许波动，但离确凿证据还差得远。`,
  ];
  const strong = [
    `趋势挺明确，值得多看几眼。`,
    `这个方向的变动不太像偶然，值得注意。`,
  ];
  if (magnitude < 0.005) {
    return varyEnding(noChange, Math.random());
  }
  const dir = change > 0 ? "上升" : "下降";
  const emphasis = magnitude > 0.03 ? varyEnding(strong, change) : varyEnding(mild, magnitude);
  return `高摄入组${label}的比例比低摄入组${dir}了——从${d3.format(".1%")(values[0])}变为${d3.format(".1%")(values.at(-1))}。${emphasis}`;
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

function focusAnswerText(rows, flag, period) {
  const values = focusQuartiles(rows, flag);
  const change = values.at(-1) - values[0];
  if (Math.abs(change) < 0.01) {
    return `在${period}摄入咖啡因后，专注力几乎不受剂量影响——无论少量还是大量，专注力得分都在同一水平。`;
  }
  const dir = change > 0 ? "上升" : "下降";
  return `在${period}，咖啡因剂量越高，专注力得分越${dir === "上升" ? "高" : "低"}——从低剂量组的${d3.format(".2f")(values[0])}变为高剂量组的${d3.format(".2f")(values.at(-1))}。`;
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
      all: `市面上的咖啡豆有两个主角：阿拉比卡占了约65%，是精品咖啡的灵魂——香气细腻、酸度明亮、咖啡因温和（0.8-1.4%）。罗布斯塔约30%，苦味更重、咖啡因是阿拉比卡的两到三倍（1.7-4.0%），主打速溶和拼配。剩下不到5%是利比里卡，几乎可以忽略。你喝的每一杯咖啡，基本都在这两个品种之间。`,
    },
    sensoryRadar: {
      all: `答案是：有道理。阿拉比卡在CQI七项感官评分上全面超越罗布斯塔，尤其在香气（${ar.dimensions.Aroma.toFixed(2)} vs ${rb.dimensions.Aroma.toFixed(2)}）和酸度（${ar.dimensions.Acidity.toFixed(2)} vs ${rb.dimensions.Acidity.toFixed(2)}）上差距最大——这两项恰好是"精品咖啡"最值钱的品质。罗布斯塔并非一无是处，它在醇厚度上咬得最紧，但整体差距（${ar.totalScoreAvg.toFixed(1)} vs ${rb.totalScoreAvg.toFixed(1)}分）解释了为什么你家楼下咖啡馆的单品手冲永远是阿拉比卡。`,
    },
    altitudeQuality: {
      all: `有关系，但不是决定性因素。最高分的咖啡豆确实集中在1500米以上——但也有大量1000米以下的豆子拿到了不错的分数。反过来，高海拔也不保证高分：一些低海拔精品同样能突破85分。海拔能为咖啡提供更慢的成熟节奏，但土壤、品种和处理方法同样在发挥作用。`,
    },
    processingMethod: {
      all: `水洗处理的咖啡得分略高——统计上可见，但差距不大，中位数只差一两分。日晒处理虽然分数略低，但在杯测中往往带来更丰富的果香，是许多精品豆的刻意选择。半水洗和蜜处理介于两者之间。加工方式的关键差异不在于"哪个更好"，而在于水洗需要稳定的水源和设施，很多小农做不到。`,
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
      all: `${focusAnswerText(data.trackerRows, "time_of_day_morning", "早上")} ${focusAnswerText(data.trackerRows, "time_of_day_afternoon", "下午")} ${focusAnswerText(data.trackerRows, "time_of_day_evening", "晚上")}`,
    },
  };
}
