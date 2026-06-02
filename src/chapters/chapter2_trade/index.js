import { drawSankeySlot, drawMapSlot, drawNetworkSlot } from "../../components/placeholderCharts.js";
import { drawMetricCards } from "../../components/metricCards.js";

export function renderChapter2(containerSelector) {
  const container = d3.select(containerSelector);
  container.html(`
    <div class="chapter-panel-head">
      <div>
        <span>Visualization board</span>
        <h3>Global movement</h3>
      </div>
      <div id="chapter2_trade-stats"></div>
    </div>

    <div class="visual-grid">
      <div id="trade-sankey" class="wide-slot"></div><div id="trade-map"></div><div id="trade-network"></div>
    </div>
  `);

  drawMetricCards("#chapter2_trade-stats", [{ value: "Flow", label: "Sankey diagram" }, { value: "Routes", label: "Trade map" }, { value: "Graph", label: "Network structure" }]);


  drawSankeySlot("#trade-sankey", {
    title: "Coffee trade flow",
    description: "Replace with UN Comtrade exporter-to-importer Sankey flows.",
    label: "Chapter 2 Sankey area"
  });

  drawMapSlot("#trade-map", {
    title: "Trade route map",
    description: "Replace with curved routes from exporting countries to importing markets.",
    label: "Chapter 2 route map area"
  });

  drawNetworkSlot("#trade-network", {
    title: "Trade network graph",
    description: "Replace with country nodes and weighted coffee-trade links.",
    label: "Chapter 2 network area"
  });

}
