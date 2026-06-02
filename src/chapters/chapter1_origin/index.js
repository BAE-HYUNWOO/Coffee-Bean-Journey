import * as d3 from "d3";
import { drawMapSlot, drawBarSlot, drawLineSlot } from "../../components/placeholderCharts.js";
import { drawMetricCards } from "../../components/metricCards.js";
import "./style.css";

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
      <div id="origin-map"></div><div id="origin-bar"></div><div id="origin-line" class="wide-slot"></div>
    </div>
  `);

  drawMetricCards("#chapter1_origin-stats", [{ value: "Map", label: "Production geography" }, { value: "Top 10", label: "Producer ranking" }, { value: "Trend", label: "Yearly change" }]);


  drawMapSlot("#origin-map", {
    title: "Coffee production map",
    description: "Replace with a FAOSTAT choropleth map showing coffee production by country.",
    label: "Chapter 1 map area"
  });

  drawBarSlot("#origin-bar", {
    title: "Top producing countries",
    description: "Replace with a Top 10 bar chart of coffee-producing countries.",
    label: "Chapter 1 ranking area"
  });

  drawLineSlot("#origin-line", {
    title: "Production over time",
    description: "Replace with a line chart showing production change across years.",
    label: "Chapter 1 timeline area",
    wide: true
  });

}
