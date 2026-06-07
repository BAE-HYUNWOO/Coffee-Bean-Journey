# chapter4_consumption

Put raw files in `raw/` and final D3-ready CSV files in `processed/`.

目前chapter4真实用到的数据集：

https://www.kaggle.com/datasets/prekshad2166/caffeine-intake-tracker-csv  

- caffeine_mg: Amount of caffeine consumed in milligrams, normalized to a 0-1 scale
- age: Participant's age normalized to a 0-1 scale where higher values indicate older participants
- focus_level: Self-reported concentration level after caffeine consumption (0-1 scale, where 1 represents maximum focus)
- sleep_quality: Self-reported sleep quality rating (0-1 scale, where 1 represents best sleep quality)
- sleep_impacted: Binary indicator showing whether sleep was affected by caffeine consumption (0=no, 1=yes)
- beverage_coffee: Boolean flag indicating coffee consumption (true=consumed, false=not consumed)
- beverage_energy_drink: Boolean flag indicating energy drink consumption (true=consumed, false=not consumed)
- beverage_tea: Boolean flag indicating tea consumption (true=consumed, false=not consumed)
- time_of_day_afternoon: Boolean flag for caffeine consumed in afternoon (true=yes, false=no)
- time_of_day_evening: Boolean flag for caffeine consumed in evening (true=yes, false=no)
- time_of_day_morning: Boolean flag for caffeine consumed in morning (true=yes, false=no)
- gender_female: Boolean flag indicating female gender (true=female, false=not female)
- gender_male: Boolean flag indicating male gender (true=male, false=not male)

https://www.kaggle.com/datasets/uom190346a/global-coffee-health-dataset  



/Users/contramundum/Documents/pku/2026spring/数据可视化/咖啡豆之旅/Coffee-Bean-Journey/public/data/chapter4_consumption/processed/final.csv

| **字段名**                | **官方含义**          | **说明**                                                     |
| ------------------------- | --------------------- | ------------------------------------------------------------ |
| **Commodity_Description** | Commodity description | 商品类别。你这里已经固定为 Coffee, Green，即**未烘焙生咖啡豆（Green Coffee）**。 |
| **Country_Code**          | Country code          | USDA 使用的国家/地区代码，例如 BR、VN、US。                  |
| **Country_Name**          | Country name          | 国家或地区名称。                                             |
| **Year**                  | Marketing year        | 市场年度（Marketing Year），对于咖啡通常可近似理解为统计年份。 |
| **Attribute_Description** | PSD attribute         | 统计指标类型，即这一行的 Value 表示什么。                    |
| **Unit_Description**      | Unit of measure       | 计量单位。对于 Coffee 全部为 (1000 60 KG BAGS)，即**千袋（每袋60kg）**。 |
| **Value**                 | Reported value        | 对应指标的数值。单位由 Unit_Description 决定。               |

| **指标**                   | **含义**                               |
| -------------------------- | -------------------------------------- |
| **Production**             | 总咖啡产量                             |
| **Arabica Production**     | 阿拉比卡咖啡产量                       |
| **Robusta Production**     | 罗布斯塔咖啡产量                       |
| **Other Production**       | 其他品种产量                           |
| **Beginning Stocks**       | 期初库存                               |
| **Ending Stocks**          | 期末库存                               |
| **Imports**                | 总进口量                               |
| **Exports**                | 总出口量                               |
| **Bean Imports**           | 生豆进口量                             |
| **Bean Exports**           | 生豆出口量                             |
| **Roast & Ground Imports** | 烘焙咖啡进口量                         |
| **Roast & Ground Exports** | 烘焙咖啡出口量                         |
| **Soluble Imports**        | 速溶咖啡进口量                         |
| **Soluble Exports**        | 速溶咖啡出口量                         |
| **Domestic Consumption**   | 国内消费总量                           |
| **Rst,Ground Dom. Consum** | 国内烘焙咖啡消费量（Roasted & Ground） |
| **Soluble Dom. Cons.**     | 国内速溶咖啡消费量                     |
| **Total Supply**           | 总供给                                 |
| **Total Distribution**     | 总分配（总使用）                       |



新的数据源

https://github.com/jldbc/coffee-quality-database?utm_source=chatgpt.com

https://github.com/rfordatascience/tidytuesday/tree/main/data/2020/2020-07-07?utm_source=chatgpt.com

https://www.kaggle.com/datasets/henryshan/starbucks