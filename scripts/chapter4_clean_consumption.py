import pandas as pd
from pathlib import Path

INPUT_DIR = Path('Coffee-Bean-Journey/public/data/chapter4_consumption/archive')
OUTPUT_DIR = Path('Coffee-Bean-Journey/public/data/chapter4_consumption/processed')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 读取宽表
disappearance = pd.read_csv(INPUT_DIR / 'disappearance.csv')
domestic = pd.read_csv(INPUT_DIR / 'domestic-consumption.csv')

# 转换宽表为长表
dis_long = disappearance.melt(id_vars=['disappearance'], var_name='year', value_name='total_consumption_k_bags')
dis_long.rename(columns={'disappearance': 'country'}, inplace=True)
dis_long = dis_long[dis_long['year'].astype(str).str.isdigit()]
dis_long['year'] = dis_long['year'].astype(int)

dom_long = domestic.melt(id_vars=['domestic_consumption'], var_name='year', value_name='population')
dom_long.rename(columns={'domestic_consumption': 'country'}, inplace=True)
dom_long = dom_long[dom_long['year'].astype(str).str.isdigit()]
dom_long['year'] = dom_long['year'].astype(int)

# 筛选2000年及以后
dis_long = dis_long[dis_long['year'] >= 2000]
dom_long = dom_long[dom_long['year'] >= 2000]

# 合并
merged = dis_long.merge(dom_long, on=['country', 'year'], how='left')

# 计算人均消费 (公斤/人/年)
merged['per_capita_kg'] = (merged['total_consumption_k_bags'] * 60) / merged['population']
merged['per_capita_kg'] = merged['per_capita_kg'].round(2)

# 添加国家代码（如果需要，可以从另一个文件映射，这里先用country列）
merged['country_code'] = merged['country']  # 临时，后续可替换为ISO3

# 输出
output = merged[['country', 'country_code', 'year', 'total_consumption_k_bags', 'per_capita_kg']]
output = output.sort_values(['country', 'year'])
output.to_csv(OUTPUT_DIR / 'consumption.csv', index=False, encoding='utf-8-sig')