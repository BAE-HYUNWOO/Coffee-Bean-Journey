// src/chapters/chapter3_market/index.js
import * as d3 from "d3";
import { drawMetricCards } from "../../components/metricCards.js";
import { drawExpansionSlot } from "./expansionMap.js";
import { drawEVChart, drawStarbucksChart } from "./franchiseCharts.js";

export function renderChapter3(containerSelector) {
    const container = d3.select(containerSelector);
    container.html(`
    <div class="chapter-panel-head">
      <div>
        <span>Visualization board</span>
        <h3>Coffee business</h3>
      </div>
    </div>

    <div id="ch3-grid">
      <div id="market-charts-row">
        <div id="market-chart-1"></div>
        <div id="market-chart-2"></div>
      </div>
      
      <div id="market-map"></div>
    </div>

    <div id="market-loading" style="text-align:center;padding:20px;color:var(--muted);font-family:Inter,sans-serif;font-size:0.85rem;">
        Loading data &hellip;
    </div>
  `);

    const BASE_URL = new URL(".", window.location.href).href;

    const DATA_URLS = {
        worldMap:
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
        expansion: BASE_URL + "data/chapter3_market/processed/starbucks_expansion.json",
        stores2021: BASE_URL + "data/chapter3_market/processed/starbucks_2021_locations.csv",
        revenueStores:
            BASE_URL + "data/chapter3_market/processed/starbucks_2003-2025_revenue_stores.csv",
        evValuation:
            BASE_URL + "data/chapter3_market/processed/coffee_companies_valuation_2026.csv",
    };

    Promise.all([
        d3.json(DATA_URLS.worldMap),
        d3.json(DATA_URLS.expansion),
        d3.csv(DATA_URLS.stores2021),
        d3.csv(DATA_URLS.revenueStores),
        d3.csv(DATA_URLS.evValuation),
    ])
        .then(([worldData, expansionData, storesData, revenueStoresData, evValuationData]) => {
            container.select("#market-loading").remove();

            drawEVChart("#market-chart-1", evValuationData);
            drawStarbucksChart("#market-chart-2", revenueStoresData);
            drawExpansionSlot("#market-map", { worldData, expansionData, storesData });
        })
        .catch((err) => {
            console.error("Failed to load Chapter 3 data:", err);
            container
                .select("#market-loading")
                .style("color", "#ff4a4a")
                .text("Failed to load data. Please check your connection and try again.");
        });
}
