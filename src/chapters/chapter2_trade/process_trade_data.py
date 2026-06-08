"""
Process UN Comtrade HS0901 coffee export data for Chapter 2.

Run from project root:
    python src/chapters/chapter2_trade/process_trade_data.py

Expected raw input:
    public/data/chapter2_trade/raw/comtrade_coffee_recent_raw.csv

Outputs:
    public/data/chapter2_trade/processed/coffee_trade_recent_flows.csv
    public/data/chapter2_trade/processed/coffee_trade_recent_top_exporters.csv
    public/data/chapter2_trade/processed/coffee_trade_recent_top_importers.csv
    public/data/chapter2_trade/processed/coffee_trade_recent_year_summary.csv
    public/data/chapter2_trade/processed/coffee_trade_recent_sankey.json
    public/data/chapter2_trade/processed/coffee_trade_recent_network.json
    public/data/chapter2_trade/processed/coffee_trade_recent_stats.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Tuple

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RAW_PATH = PROJECT_ROOT / "public" / "data" / "chapter2_trade" / "raw" / "comtrade_coffee_recent_raw.csv"
OUT_DIR = PROJECT_ROOT / "public" / "data" / "chapter2_trade" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

COUNTRY_COORDS: Dict[str, Tuple[float, float]] = {
    "Brazil": (-14.2350, -51.9253), "Viet Nam": (14.0583, 108.2772), "Vietnam": (14.0583, 108.2772),
    "Colombia": (4.5709, -74.2973), "Indonesia": (-0.7893, 113.9213), "Ethiopia": (9.1450, 40.4897),
    "Honduras": (15.2000, -86.2419), "India": (20.5937, 78.9629), "Uganda": (1.3733, 32.2903),
    "Peru": (-9.1900, -75.0152), "Guatemala": (15.7835, -90.2308), "Nicaragua": (12.8654, -85.2072),
    "Costa Rica": (9.7489, -83.7534), "Mexico": (23.6345, -102.5528), "Kenya": (-0.0236, 37.9062),
    "Tanzania": (-6.3690, 34.8888), "Rwanda": (-1.9403, 29.8739), "Burundi": (-3.3731, 29.9189),
    "Papua New Guinea": (-6.3150, 143.9555), "Lao People's Dem. Rep.": (19.8563, 102.4955),
    "China": (35.8617, 104.1954), "Japan": (36.2048, 138.2529), "Republic of Korea": (35.9078, 127.7669),
    "Korea, Rep.": (35.9078, 127.7669), "United States of America": (37.0902, -95.7129), "United States": (37.0902, -95.7129),
    "Canada": (56.1304, -106.3468), "Germany": (51.1657, 10.4515), "France": (46.2276, 2.2137),
    "Italy": (41.8719, 12.5674), "Spain": (40.4637, -3.7492), "Portugal": (39.3999, -8.2245),
    "Netherlands": (52.1326, 5.2913), "Belgium": (50.5039, 4.4699), "Switzerland": (46.8182, 8.2275),
    "Austria": (47.5162, 14.5501), "Poland": (51.9194, 19.1451), "Czechia": (49.8175, 15.4730),
    "Sweden": (60.1282, 18.6435), "Norway": (60.4720, 8.4689), "Finland": (61.9241, 25.7482),
    "Denmark": (56.2639, 9.5018), "United Kingdom": (55.3781, -3.4360), "Ireland": (53.1424, -7.6921),
    "Russian Federation": (61.5240, 105.3188), "Türkiye": (38.9637, 35.2433), "Turkey": (38.9637, 35.2433),
    "Saudi Arabia": (23.8859, 45.0792), "United Arab Emirates": (23.4241, 53.8478), "Australia": (-25.2744, 133.7751),
    "New Zealand": (-40.9006, 174.8860), "South Africa": (-30.5595, 22.9375), "Morocco": (31.7917, -7.0926),
    "Algeria": (28.0339, 1.6596), "Egypt": (26.8206, 30.8025), "Argentina": (-38.4161, -63.6167),
    "Chile": (-35.6751, -71.5430), "Uruguay": (-32.5228, -55.7658), "Ecuador": (-1.8312, -78.1834),
    "Panama": (8.5380, -80.7821), "El Salvador": (13.7942, -88.8965), "Malaysia": (4.2105, 101.9758),
    "Singapore": (1.3521, 103.8198), "Thailand": (15.8700, 100.9925), "Philippines": (12.8797, 121.7740),
    "Albania": (41.1533, 20.1683), "Serbia": (44.0165, 21.0059), "North Macedonia": (41.6086, 21.7453),
    "Bosnia Herzegovina": (43.9159, 17.6791), "Bulgaria": (42.7339, 25.4858), "Greece": (39.0742, 21.8243),
}


def read_comtrade_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Raw file not found: {path}")
    for enc in ("utf-8-sig", "utf-8", "cp949", "cp1252", "latin1"):
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False, index_col=False)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, encoding="latin1", low_memory=False, index_col=False)


def num(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0)


def add_coords(df: pd.DataFrame) -> pd.DataFrame:
    def lat(country: str): return COUNTRY_COORDS.get(str(country), (None, None))[0]
    def lon(country: str): return COUNTRY_COORDS.get(str(country), (None, None))[1]
    df["exporter_lat"] = df["exporter"].map(lat)
    df["exporter_lon"] = df["exporter"].map(lon)
    df["importer_lat"] = df["importer"].map(lat)
    df["importer_lon"] = df["importer"].map(lon)
    return df


def write_json(path: Path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    raw = read_comtrade_csv(RAW_PATH)
    raw.columns = [c.strip() for c in raw.columns]

    required = ["refYear", "reporterDesc", "partnerDesc", "flowDesc", "cmdCode", "primaryValue"]
    missing = [c for c in required if c not in raw.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    raw["cmdCode_norm"] = raw["cmdCode"].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(4)
    df = raw[(raw["cmdCode_norm"] == "0901") & (raw["flowDesc"].astype(str).str.lower().str.contains("export", na=False))].copy()

    for c in ["primaryValue", "netWgt", "qty"]:
        if c not in df.columns:
            df[c] = 0
        df[c] = num(df[c])

    df["year"] = num(df["refYear"]).astype(int)
    df["exporter"] = df["reporterDesc"].astype(str).str.strip()
    df["importer"] = df["partnerDesc"].astype(str).str.strip()
    df["exporter_iso"] = df.get("reporterISO", "").astype(str).str.strip() if "reporterISO" in df.columns else ""
    df["importer_iso"] = df.get("partnerISO", "").astype(str).str.strip() if "partnerISO" in df.columns else ""

    world_mask = df["importer"].str.lower().isin(["world", "all", "total", "nan", "none"])
    bilateral = df[~world_mask & (df["exporter"] != df["importer"])].copy()
    aggregate_only = df[world_mask].copy()

    if not bilateral.empty:
        flows = (
            bilateral.groupby(["year", "exporter", "exporter_iso", "importer", "importer_iso"], dropna=False)
            .agg(trade_value_usd=("primaryValue", "sum"), net_weight_kg=("netWgt", "sum"), quantity_kg=("qty", "sum"))
            .reset_index()
        )
        mode = "bilateral_partner_all"
    else:
        # Fallback so rankings still work if the user accidentally downloaded Partner=World only.
        flows = (
            aggregate_only.groupby(["year", "exporter", "exporter_iso"], dropna=False)
            .agg(trade_value_usd=("primaryValue", "sum"), net_weight_kg=("netWgt", "sum"), quantity_kg=("qty", "sum"))
            .reset_index()
        )
        flows["importer"] = "World"
        flows["importer_iso"] = "W00"
        mode = "world_aggregate_only_partner_world"

    flows = flows[(flows["trade_value_usd"] > 0) | (flows["net_weight_kg"] > 0)].copy()
    flows["value_per_kg"] = flows["trade_value_usd"] / flows["net_weight_kg"].replace({0: pd.NA})
    flows["value_per_kg"] = flows["value_per_kg"].fillna(0).round(4)
    flows = add_coords(flows)
    flows = flows.sort_values(["year", "trade_value_usd"], ascending=[True, False])
    flows.to_csv(OUT_DIR / "coffee_trade_recent_flows.csv", index=False, encoding="utf-8")

    year_summary = flows.groupby("year", as_index=False).agg(
        trade_value_usd=("trade_value_usd", "sum"),
        net_weight_kg=("net_weight_kg", "sum"),
        flows=("exporter", "count"),
    )
    year_summary.to_csv(OUT_DIR / "coffee_trade_recent_year_summary.csv", index=False, encoding="utf-8")

    top_exporters = flows.groupby(["year", "exporter"], as_index=False).agg(
        trade_value_usd=("trade_value_usd", "sum"),
        net_weight_kg=("net_weight_kg", "sum"),
    ).sort_values(["year", "trade_value_usd"], ascending=[True, False])
    top_exporters.to_csv(OUT_DIR / "coffee_trade_recent_top_exporters.csv", index=False, encoding="utf-8")

    top_importers = flows.groupby(["year", "importer"], as_index=False).agg(
        trade_value_usd=("trade_value_usd", "sum"),
        net_weight_kg=("net_weight_kg", "sum"),
    ).sort_values(["year", "trade_value_usd"], ascending=[True, False])
    top_importers.to_csv(OUT_DIR / "coffee_trade_recent_top_importers.csv", index=False, encoding="utf-8")

    latest_year = int(flows["year"].max()) if not flows.empty else None
    latest = flows[flows["year"] == latest_year].sort_values("trade_value_usd", ascending=False).head(80) if latest_year else flows.head(0)

    nodes = {}
    links = []
    if mode == "bilateral_partner_all":
        for _, r in latest.iterrows():
            src, tgt = r["exporter"], r["importer"]
            nodes.setdefault(src, {"id": src, "role": "exporter", "value": 0, "lat": r.get("exporter_lat"), "lon": r.get("exporter_lon")})
            nodes.setdefault(tgt, {"id": tgt, "role": "importer", "value": 0, "lat": r.get("importer_lat"), "lon": r.get("importer_lon")})
            nodes[src]["value"] += float(r["trade_value_usd"])
            nodes[tgt]["value"] += float(r["trade_value_usd"])
            links.append({"source": src, "target": tgt, "value": float(r["trade_value_usd"]), "year": latest_year})

    write_json(OUT_DIR / "coffee_trade_recent_network.json", {"nodes": list(nodes.values()), "links": links})
    write_json(OUT_DIR / "coffee_trade_recent_sankey.json", {"year": latest_year, "links": links})
    write_json(OUT_DIR / "coffee_trade_recent_stats.json", {
        "data_mode": mode,
        "raw_rows": int(len(raw)),
        "filtered_rows": int(len(df)),
        "bilateral_rows": int(len(bilateral)),
        "output_rows": int(len(flows)),
        "latest_year": latest_year,
        "years": [int(flows["year"].min()), int(flows["year"].max())] if not flows.empty else [],
        "warning": "Sankey/map/network need Partners=All data." if mode != "bilateral_partner_all" else "OK",
    })

    # Keep country centroid reference fresh.
    pd.DataFrame([{"country": k, "lat": v[0], "lon": v[1]} for k, v in COUNTRY_COORDS.items()]).sort_values("country").to_csv(
        OUT_DIR / "country_centroids.csv", index=False, encoding="utf-8"
    )

    print(f"[OK] Wrote processed Chapter 2 data to: {OUT_DIR}")
    print(f"[MODE] {mode}")
    if mode != "bilateral_partner_all":
        print("[WARN] Your raw file seems to contain Partner=World aggregate rows only. For Sankey/map/network, download again with Partners=All.")


if __name__ == "__main__":
    main()
