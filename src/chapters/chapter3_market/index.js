import { drawMapSlot, drawBarSlot, drawLineSlot } from "../../components/placeholderCharts.js";
import { drawMetricCards } from "../../components/metricCards.js";


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
      <div id="market-map"></div><div id="market-bar"></div><div id="market-line" class="wide-slot"></div>
    </div>
  `);

  drawMetricCards("#chapter3_market-stats", [{ value: "Stores", label: "Location map" }, { value: "Brands", label: "Market comparison" }, { value: "Growth", label: "Expansion timeline" }]);


  drawMapSlot("#market-map", {
    title: "Global store map",
    description: "Replace with Starbucks or brand store locations by country/city.",
    label: "Chapter 3 store map area"
  });

  drawBarSlot("#market-bar", {
    title: "Stores by country",
    description: "Replace with a ranking of countries by number of coffee chain stores.",
    label: "Chapter 3 ranking area"
  });

  drawLineSlot("#market-line", {
    title: "Brand expansion timeline",
    description: "Replace with expansion over time if year-level data is available.",
    label: "Chapter 3 timeline area",
    wide: true
  });

}
