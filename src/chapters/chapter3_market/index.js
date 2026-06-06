// src/chapters/chapter3_market/index.js
import * as d3 from "d3";
import { drawMetricCards } from "../../components/metricCards.js";
import { drawExpansionSlot } from "./ExpansionMap.js";

export function renderChapter3(containerSelector) {
    const container = d3.select(containerSelector);
    container.html(`
	<div class="chapter-panel-head">
	  <div>
		<span>Visualization board</span>
		<h3>Coffee business</h3>
	  </div>
	  <div id="chapter3_market-stats"></div>
	</div>

	<div class="visual-grid">
	  <div id="expansion-map" class="wide-slot"></div>
	</div>

	<div id="chapter3-loading" style="text-align:center;padding:20px;color:var(--muted);font-family:Inter,sans-serif;font-size:0.85rem;">
		Loading data &hellip;
	</div>
  `);

    const BASE_URL = new URL(".", window.location.href).href;

    const DATA_URLS = {
        worldMap:
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
        expansion: BASE_URL + "public/data/chapter3_market/processed/starbucks_expansion.json",
        stores2021: BASE_URL + "public/data/chapter3_market/processed/starbucks_2021_locations.csv",
    };

    Promise.all([
        d3.json(DATA_URLS.worldMap),
        d3.json(DATA_URLS.expansion),
        d3.csv(DATA_URLS.stores2021),
    ])
        .then(([worldData, expansionData, storesData]) => {
            container.select("#chapter3-loading").remove();

            drawMetricCards("#chapter3_market-stats", []);

            drawExpansionSlot("#expansion-map", { worldData, expansionData, storesData });
        })
        .catch((err) => {
            console.error("Failed to load Chapter 3 data:", err);
            container
                .select("#chapter3-loading")
                .style("color", "#ff4a4a")
                .text("Failed to load data. Please check your connection and try again.");
        });
}
