import * as d3 from "d3";
import { drawMetricCards } from "../../components/metricCards.js";
import { drawChoroplethMap } from "./choroplethMap.js";
import { drawTimelineChart } from "./timelineChart.js";
import { drawBarRaceChart } from "./barRaceChart.js";
import { formatCompact } from "../../shared/formatters.js";
import "./style.css";

const BASE_URL = import.meta.env.BASE_URL || "/";


function ensureOriginModuleLayoutLock() {
  if (document.getElementById("origin-module-layout-lock")) return;

  const style = document.createElement("style");
  style.id = "origin-module-layout-lock";
  style.textContent = `
    /* Origin module layout lock: keeps module 1 as a 1:1 top grid + full-width timeline. */
    .theme-origin .chapter-shell,
    .theme-origin .chapter-visual-board {
      width: min(1820px, calc(100vw - 48px)) !important;
      max-width: none !important;
      margin-left: auto !important;
      margin-right: auto !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .theme-origin .chapter-panel-head,
    .theme-origin .visual-grid {
      width: 100% !important;
      max-width: none !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .theme-origin .visual-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: clamp(22px, 1.6vw, 32px) !important;
      align-items: stretch !important;
    }

    .theme-origin #origin-line,
    .theme-origin #origin-line.wide-slot {
      grid-column: 1 / -1 !important;
    }

    .theme-origin #origin-map .chart-frame,
    .theme-origin #origin-bar .chart-frame {
      min-height: 350px !important;
      height: auto !important;
      max-height: none !important;
      display: block !important;
      overflow: visible !important;
    }

    .theme-origin #origin-line .chart-frame {
      min-height: 350px !important;
      height: auto !important;
      max-height: none !important;
      display: block !important;
      overflow: visible !important;
    }

    .theme-origin #origin-map .chart-frame-body,
    .theme-origin #origin-bar .chart-frame-body,
    .theme-origin #origin-line .chart-frame-body {
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }

    .theme-origin #origin-map .map-svg-wrap,
    .theme-origin #origin-bar .bar-race-svg-wrap,
    .theme-origin #origin-line .timeline-svg-wrap {
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      flex: none !important;
      overflow: visible !important;
    }

    .theme-origin #origin-map svg,
    .theme-origin #origin-bar svg,
    .theme-origin #origin-line svg {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      display: block !important;
      transform: none !important;
    }

    .theme-origin #origin-map svg,
    .theme-origin #origin-bar svg {
      aspect-ratio: auto !important;
    }

    .theme-origin .timeline-legend-bar {
      height: auto !important;
      min-height: 0 !important;
      margin-bottom: 0 !important;
    }

    @media (max-width: 980px) {
      .theme-origin .visual-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function tuneOriginModuleSvgs() {
  document.querySelectorAll(".theme-origin #origin-map svg").forEach((svg) => {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.classList.remove("origin-map-fill-svg");
  });

  document.querySelectorAll(".theme-origin #origin-bar svg, .theme-origin #origin-line svg").forEach((svg) => {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  });
}

function scheduleOriginModuleTune() {
  requestAnimationFrame(tuneOriginModuleSvgs);
  window.setTimeout(tuneOriginModuleSvgs, 80);
  window.setTimeout(tuneOriginModuleSvgs, 280);
}


export function renderChapter1(containerSelector) {
  ensureOriginModuleLayoutLock();
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
    scheduleOriginModuleTune();

  }).catch(err => {
    console.error("Failed to load Chapter 1 data:", err);
    container.select("#chapter1-loading")
      .style("color", "var(--copper)")
      .text("Failed to load data. Please check your connection and try again.");
  });
}
