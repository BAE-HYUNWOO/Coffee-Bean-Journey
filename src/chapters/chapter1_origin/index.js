import * as d3 from "d3";
import { drawMetricCards } from "../../components/metricCards.js";
import { drawChoroplethMap } from "./choroplethMap.js";
import { drawTimelineChart } from "./timelineChart.js";
import { drawBarRaceChart } from "./barRaceChart.js";
import { formatCompact } from "../../shared/formatters.js";
import "./style.css";

const BASE_URL = import.meta.env.BASE_URL || "/";

export function renderChapter1(containerSelector) {
  const container = d3.select(containerSelector);
  container.html(`
    <div class="chapter-panel-head">
      <div>
        <span>Visualization board</span>
        <h3>Production geography</h3>
      </div>
      <div id="chapter1_origin-stats"></div>
    </div>

    <div class="visual-grid">
      <div id="origin-map"></div>
      <div id="origin-bar"></div>
      <div id="origin-line" class="wide-slot"></div>
    </div>

    <div id="chapter1-loading" style="text-align:center;padding:20px;color:var(--muted);font-family:Inter,sans-serif;font-size:0.85rem;">
      Loading data &hellip;
    </div>
  `);

  // Load all data asynchronously
  const base = BASE_URL + "data/chapter1_origin/processed/";

  Promise.all([
    d3.csv(base + "production_by_country.csv", d3.autoType),
    d3.csv(base + "production_by_year.csv", d3.autoType),
    d3.csv(base + "top10_producers.csv", d3.autoType),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  ]).then(([mapData, timelineData, rankingData, worldTopoJSON]) => {
    // Remove loading indicator
    container.select("#chapter1-loading").remove();

    // Populate metric cards with real data
    const totalProduction = d3.sum(mapData, d => d.Production_tonnes || 0);
    const topProducer = mapData.reduce((a, b) =>
      (b.Production_tonnes || 0) > (a.Production_tonnes || 0) ? b : a
    );
    const totalCountries = mapData.filter(d => (d.Production_tonnes || 0) > 0).length;

    drawMetricCards("#chapter1_origin-stats", [
      { value: formatCompact.format(totalProduction) + " t", label: "Global production (2024)" },
      { value: topProducer.Country || "—", label: "Top producer" },
      { value: String(totalCountries), label: "Producing countries" },
    ]);

    // Draw all three charts
    drawChoroplethMap("#origin-map", { mapData, worldTopoJSON });
    drawBarRaceChart("#origin-bar", { rankingData, timelineData });
    drawTimelineChart("#origin-line", { timelineData });

  }).catch(err => {
    console.error("Failed to load Chapter 1 data:", err);
    container.select("#chapter1-loading")
      .style("color", "var(--copper)")
      .text("Failed to load data. Please check your connection and try again.");
  });
}
