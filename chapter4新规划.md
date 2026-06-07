# Chapter 4：从咖啡豆到杯中风味

## Chapter Objective

前三章回答了：
- Chapter 1：我从哪里来？（种植）
- Chapter 2：我是如何环游世界的？（贸易运输）
- Chapter 3：Who controls the coffee market?

Chapter 4 希望完整讲述咖啡豆从"品种身份→感官特征→变成什么饮品→谁在喝它→喝下去之后发生了什么"的全链路故事。

全书标题改为：**From bean to cup: the life of a coffee after harvest**

---

## 数据源

| 数据集 | 文件 | 用途 |
|--------|------|------|
| 市场常识 | 硬编码 | 品种占比 (Arabica 60-70%, Robusta ~30%, Liberica <5%) |
| CQI 咖啡品质数据库 | `arabica_data_cleaned.csv` (1318行), `robusta_data_cleaned.csv` (28行) | 杯测评分、海拔、加工方式 |
| Starbucks 营养数据 | `starbucks.csv` (242行, 9品类, 33饮品) | 咖啡因、热量、脂肪、糖等 |
| USDA 消费数据 | `final.csv` | 全球各国咖啡消费量（已有） |
| 合成健康数据 | `synthetic_coffee_health_10000.csv` | 消费者画像（已有） |
| 咖啡因追踪数据 | `caffeine_intake_tracker.csv` | 专注力分析（已有） |

---

## 叙事结构

### Part 0 — 咖啡豆的两副面孔（新增，前置）

**0.1 咖啡豆版图 — Donut Chart**
- 数据：硬编码市场份额 + 咖啡因含量
- 图表：圆环图，内圈展示 Arabica/Robusta/Liberica 占比，外围标注咖啡因含量
- 交互：悬停显示详细数据
- 叙事：开门见山——"咖啡豆不止一种，它们从市场到风味都截然不同"

**0.2 感官雷达 — Radar Chart**
- 数据：CQI 数据库，Arabica 与 Robusta 在 7 个感官维度上的均值对比
- 字段映射：Aroma↔Fragrance...Aroma, Acidity↔Salt...Acid, Body↔Mouthfeel, 其余 Flavor/Aftertaste/Balance/Clean.Cup 同名
- 图表：雷达图，双线对比两个品种
- 叙事："为什么阿拉比卡更贵？——它在风味复杂度上全面领先"

**0.3 海拔 vs 品质 — Bubble Chart**
- 数据：CQI 数据 altitude_mean_meters × Total.Cup.Points
- 图表：散点气泡图，X=海拔，Y=总分，颜色=品种，气泡大小=样本密度
- 过滤：0 < altitude ≤ 5000m, Total.Cup.Points > 0
- 叙事：验证"高海拔=高品质"的咖啡常识——但相关性并没有想象中那么强

**0.4 加工方式的影响 — Box Plot**
- 数据：CQI Arabica 数据 Processing.Method (Washed/Natural/Semi-washed/Other) × Total.Cup.Points
- 图表：水平箱线图
- 说明：Robusta 数据量太少 (28行)，仅展示 Arabica
- 叙事："水洗 vs 日晒 vs 蜜处理——加工方式如何塑造风味"

---

### Part 1 — 咖啡饮品的营养全景（新增）

**1.1 咖啡因光谱 — Horizontal Bar Chart**
- 数据：Starbucks 9 个饮品品类的平均咖啡因，附 min-max 范围
- 图表：水平条形图，按咖啡因降序排列，颜色区分品类
- 标注：Brewed Coffee Venti 410mg、Espresso Solo 75mg 等亮点
- 互动：悬停显示具体数值
- 叙事：从纯黑咖啡到调味饮品，咖啡因跨度有多大？

**1.2 经典饮品营养成分对比 — Grouped Bar Chart**
- 数据：选取 6 款经典饮品 (Americano/Latte/Cappuccino/Mocha/Flat White/Macchiato)，取 Grande 尺寸标准配方
- 图表：分组条形图，每款饮品展示 Calories/Fat/Carbs/Protein/Caffeine 五个指标
- 叙事："一杯拿铁里到底有什么？"
- 交互：无复杂交互，用颜色分区

**1.3 奶类选择的差异 — Small Multiples Dot Plot**
- 数据：Latte 在不同奶类 (Nonfat/2%/Soy/Whole) × 尺寸 (Short/Tall/Grande/Venti) 下的 Calories + Fat + Protein
- 图表：小多组点图，分面为尺寸，X=营养成分，颜色=奶类类型
- 叙事："换一种奶，热量差多少？"

---

### Part 2 — 全球消费格局（已有，保留）

**2.1** 世界消费趋势 — 堆叠面积图
**2.2** 各国消费量排行 — 堆叠水平条形图 + 年份切换 + flip card

---

### Part 3 — 消费者画像（已有，保留）

**3.1-3.8** 国家排名 / 年龄 / 性别 / 职业 / 饮酒 / 吸烟 vs 咖啡摄入 — 小提琴图 + flip card

---

### Part 4 — 健康影响（已有，保留）

**4.1** 摄入量与健康指标 — 箱线图/堆叠条形图 + flip card
**4.2** 咖啡因时机与专注力 — 箱线图 + flip card

---

## 技术要点

| 问题 | 方案 |
|------|------|
| Arabica/Robusta 字段名不一致 | `data.js` 中做字段映射：`{Aroma: 'Fragrance...Aroma', Acidity: 'Salt...Acid', Body: 'Mouthfeel'}` |
| Arabica 部分总分=0 | 过滤 `Total.Cup.Points > 0` |
| Arabica 海拔异常值 >5000m | 过滤 `0 < altitude_mean_meters <= 5000` |
| Robusta 样本仅 28 行 | 雷达图/Bubble 用均值，加工方式箱线图仅展示 Arabica |
| Starbucks 列名含空格 | `data.js` 中访问时用实际列名字符串 |
| 新增内容放在前面 | `index.js` 中 render 顺序前置 section 0-1，然后 Part 2-4 |
| 数据文件路径 | 用 `BASE_URL` 动态拼接，与现有 `loadChapter4Data` 保持一致 |

---

## 数据可行性结论

✅ 全部可视化方案均可由现有数据支撑。
主要限制：Robusta 样本量 (28) 只支持均值/中位数比较，不支持分布类图表；Arabica 少量异常值需过滤。
