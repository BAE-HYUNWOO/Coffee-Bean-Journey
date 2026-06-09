import os
import pandas as pd
import numpy as np

base_dir = "/Users/dengyunjie/Desktop/数据可视化/作业/小组作业/数据"

# 1. 读取 A 同学给你的产量数据
production_df = pd.read_csv(os.path.join(base_dir, "production_by_country.csv"))

# 2. 匹配中文国家名与经纬度坐标 (核心修复点！)
core_countries = {
    '巴西': (-55.0, -10.0),
    '越南': (108.0, 14.0),
    '哥伦比亚': (-73.0, 4.0),
    '印度尼西亚': (115.0, -2.0),
    '埃塞俄比亚': (39.0, 9.0)
}

# 3. 读取第一步生成的干净网格
grid_df = pd.read_csv(os.path.join(base_dir, "d3_ready_grid.csv"))

country_climate_records = []

for country, (lon, lat) in core_countries.items():
    distances = np.sqrt((grid_df['lon'] - lon)**2 + (grid_df['lat'] - lat)**2)
    closest_idx = distances.idxmin()
    matching_row = grid_df.loc[closest_idx]
    
    country_climate_records.append({
        'Country': country,
        'Hist_Temp': matching_row['hist_temp'],
        'Future_Temp': matching_row['future_temp'],
        'Temp_Rise': matching_row['temp_diff']
    })

climate_df = pd.DataFrame(country_climate_records)

# 4. 按中文国家名字 Merge 
final_scatter_df = pd.merge(production_df, climate_df, on="Country", how="inner")

output_scatter_path = os.path.join(base_dir, "d3_ready_scatter.csv")
final_scatter_df.to_csv(output_scatter_path, index=False)
print(f"🎉 散点图数据融合成功！合并了 {len(final_scatter_df)} 个国家的数据！")