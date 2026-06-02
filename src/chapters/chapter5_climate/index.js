import * as d3 from "d3";
import { drawMapSlot, drawScatterSlot, drawLineSlot } from "../../components/placeholderCharts.js";
import { drawMetricCards } from "../../components/metricCards.js";

export function renderChapter5(containerSelector) {
  const container = d3.select(containerSelector);
  container.html(`
    <div class="chapter-panel-head">
      <div>
        <span>Visualization board</span>
        <h3>Climate future</h3>
      </div>
      <div id="chapter5_climate-stats"></div>
    </div>

    <div class="visual-grid">
      <div id="climate-map"></div><div id="climate-scatter"></div><div id="climate-line" class="wide-slot"></div>
    </div>
  `);

  drawMetricCards("#chapter5_climate-stats", [{ value: "Risk", label: "Climate map" }, { value: "Temp.", label: "Yield relation" }, { value: "Future", label: "Suitability shift" }]);


  drawMapSlot("#climate-map", {
    title: "Climate risk map",
    description: "Replace with climate risk or suitability change by country/region.",
    label: "Chapter 5 risk map area"
  });

  drawScatterSlot("#climate-scatter", {
    title: "Temperature and yield",
    description: "Replace with a scatter plot linking temperature/rainfall and coffee production.",
    label: "Chapter 5 climate relation area"
  });

  drawLineSlot("#climate-line", {
    title: "Future suitability scenario",
    description: "Replace with projected suitability changes across future scenarios.",
    label: "Chapter 5 future scenario area",
    wide: true
  });

}
