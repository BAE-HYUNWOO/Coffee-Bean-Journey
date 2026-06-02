import { drawMapSlot, drawBarSlot, drawScatterSlot } from "../../components/placeholderCharts.js";
import { drawMetricCards } from "../../components/metricCards.js";

export function renderChapter4(containerSelector) {
  const container = d3.select(containerSelector);
  container.html(`
    <div class="chapter-panel-head">
      <div>
        <span>Visualization board</span>
        <h3>Coffee drinkers</h3>
      </div>
      <div id="chapter4_consumption-stats"></div>
    </div>

    <div class="visual-grid">
      <div id="consumption-map"></div><div id="consumption-bar"></div><div id="consumption-scatter" class="wide-slot"></div>
    </div>
  `);

  drawMetricCards("#chapter4_consumption-stats", [{ value: "Per cap.", label: "Consumption map" }, { value: "Top 10", label: "Consumer ranking" }, { value: "Compare", label: "Total vs per-capita" }]);


  drawMapSlot("#consumption-map", {
    title: "Per-capita consumption map",
    description: "Replace with a world map of coffee consumption per person.",
    label: "Chapter 4 per-capita map area"
  });

  drawBarSlot("#consumption-bar", {
    title: "Top coffee-consuming countries",
    description: "Replace with a ranking by total or per-capita coffee consumption.",
    label: "Chapter 4 ranking area"
  });

  drawScatterSlot("#consumption-scatter", {
    title: "Total vs per-capita consumption",
    description: "Replace with a comparison of national demand and individual habits.",
    label: "Chapter 4 comparison area",
    wide: true
  });

}
