import os
import rasterio
import pandas as pd
import numpy as np
import warnings

# 忽略计算中产生的空值警告
warnings.filterwarnings('ignore')

base_dir = "/Users/dengyunjie/Desktop/数据可视化/作业/小组作业/数据"

hist_temp_path = os.path.join(base_dir, "wc2.1_10m_bio/wc2.1_10m_bio_1.tif")
future_tmax_path = os.path.join(base_dir, "wc2.1_10m_2041-2060/wc2.1_10m_tmax_BCC-CSM2-MR_ssp245_2041-2060.tif")
future_tmin_path = os.path.join(base_dir, "wc2.1_10m_2041-2060/wc2.1_10m_tmin_BCC-CSM2-MR_ssp245_2041-2060.tif")

print("正在加载高精度地理数据并计算年均温，请稍候...")

with rasterio.open(hist_temp_path) as src_hist, \
     rasterio.open(future_tmax_path) as src_f_tmax, \
     rasterio.open(future_tmin_path) as src_f_tmin:
     
    hist_data = src_hist.read(1).astype('float32')
    f_tmax_data = src_f_tmax.read().astype('float32')
    f_tmin_data = src_f_tmin.read().astype('float32')
    
    transform = src_hist.transform
    
    nodata_hist = src_hist.nodata
    if nodata_hist is not None:
        hist_data[hist_data == nodata_hist] = np.nan
        
    nodata_tmax = src_f_tmax.nodata
    if nodata_tmax is not None:
        f_tmax_data[f_tmax_data == nodata_tmax] = np.nan
        
    nodata_tmin = src_f_tmin.nodata
    if nodata_tmin is not None:
        f_tmin_data[f_tmin_data == nodata_tmin] = np.nan
        
    f_tmax_mean = np.nanmean(f_tmax_data, axis=0)
    f_tmin_mean = np.nanmean(f_tmin_data, axis=0)
    
    future_data = (f_tmax_mean + f_tmin_mean) / 2.0
    
    min_height = min(src_hist.height, src_f_tmax.height)
    min_width = min(src_hist.width, src_f_tmax.width)
    
    sampled_rows = np.arange(0, min_height, 6)
    sampled_cols = np.arange(0, min_width, 6)
    
    grid_points = []
    print("正在提取全球陆地气象记录（取消纬度裁剪）...")
    
    for r in sampled_rows:
        for c in sampled_cols:
            r_idx = int(r)
            c_idx = int(c)
            
            h_val = hist_data[r_idx, c_idx]
            f_val = future_data[r_idx, c_idx]
            
            if np.isnan(h_val) or np.isnan(f_val):
                continue
            
            lon, lat = rasterio.transform.xy(transform, r_idx, c_idx)
            
            # 删除了纬度判断，直接对全球陆地进行计算
            temp_diff = f_val - h_val
            hist_suit = 1 if 18 <= h_val <= 24 else 0
            future_suit = 1 if 18 <= f_val <= 24 else 0
            
            grid_points.append({
                'lon': round(lon, 2),
                'lat': round(lat, 2),
                'hist_temp': round(float(h_val), 1),
                'future_temp': round(float(f_val), 1),
                'temp_diff': round(float(temp_diff), 1),
                'hist_suit': hist_suit,
                'future_suit': future_suit
            })

df_grid = pd.DataFrame(grid_points)
output_grid_path = os.path.join(base_dir, "d3_ready_grid.csv")
df_grid.to_csv(output_grid_path, index=False)

print(f"🎉 全球网格数据清洗成功！文件已生成：{output_grid_path}")
print(f"有效数据点扩展至 {len(df_grid)} 行，呈现完整地球！")