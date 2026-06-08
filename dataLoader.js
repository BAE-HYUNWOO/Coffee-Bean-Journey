import * as d3 from "d3";
import { DATA_BASE, safeNumber } from "./utils.js";

async function optionalCsv(path) {
  try {
    return await d3.csv(path, d => {
      const out = { ...d };
      for (const k of Object.keys(out)) {
        if (["year", "trade_value_usd", "net_weight_kg", "quantity_kg", "value_per_kg", "exporter_lat", "exporter_lon", "importer_lat", "importer_lon", "flows"].includes(k)) {
          out[k] = safeNumber(out[k]);
        }
      }
      return out;
    });
  } catch (err) {
    console.warn(`Could not load ${path}`, err);
    return [];
  }
}

async function optionalJson(path, fallback = {}) {
  try {
    return await d3.json(path);
  } catch (err) {
    console.warn(`Could not load ${path}`, err);
    return fallback;
  }
}

export async function loadChapter2Data(base = DATA_BASE) {
  const [flows, yearSummary, topExporters, topImporters, network, stats] = await Promise.all([
    optionalCsv(`${base}coffee_trade_recent_flows.csv`),
    optionalCsv(`${base}coffee_trade_recent_year_summary.csv`),
    optionalCsv(`${base}coffee_trade_recent_top_exporters.csv`),
    optionalCsv(`${base}coffee_trade_recent_top_importers.csv`),
    optionalJson(`${base}coffee_trade_recent_network.json`, { nodes: [], links: [] }),
    optionalJson(`${base}coffee_trade_recent_stats.json`, {}),
  ]);

  const years = Array.from(new Set(flows.map(d => +d.year).filter(Boolean))).sort((a, b) => a - b);
  const latestYear = stats.latest_year || years.at(-1) || new Date().getFullYear();
  return { flows, yearSummary, topExporters, topImporters, network, stats, years, latestYear };
}
