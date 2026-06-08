import * as d3 from "d3";
import "./Chapter2Trade.css";
import { loadChapter2Data } from "./dataLoader.js";
import { renderTradeFlowMap } from "./TradeFlowMap.js";
import { renderSankeyChart } from "./SankeyChart.js";
import { renderNetworkGraph } from "./NetworkGraph.js";
import { renderRankingCharts } from "./RankingCharts.js";
import { renderTimelineChart } from "./TimelineChart.js";
import { formatKg, formatMoney, metricLabel } from "./utils.js";

function sumBy(data, key) {
  return d3.sum(data, d => +d[key] || 0);
}

export async function renderChapter2Trade(containerSelector = "#chapter2-trade") {
  const root = d3.select(containerSelector);
  if (root.empty()) {
    console.warn(`Chapter 2 container not found: ${containerSelector}`);
    return;
  }
  root.selectAll("*").remove();
  root.attr("class", "chapter2-trade-root");

  const data = await loadChapter2Data();
  const state = {
    year: data.latestYear,
    metric: "trade_value_usd",
    flowLimit: 90,
  };

  const shell = root.append("section").attr("class", "chapter2-trade");
  shell.append("div").attr("class", "coffee-orbit").html(`<span></span><span></span><span></span>`);

  const hero = shell.append("header").attr("class", "chapter2-hero");
  hero.append("p").attr("class", "eyebrow").text("Chapter 2 · Trade Routes");
  hero.append("h2").html(`咖啡如何环游世界？<br/><strong>How coffee travels around the world</strong>`);
  hero.append("p").attr("class", "hero-copy").text("Using UN Comtrade HS0901 exports, this chapter turns country-to-country coffee trade into animated routes, Sankey ribbons, network structure, and recent-period trends.");

  if (data.stats?.data_mode === "demo_placeholder") {
    hero.append("div").attr("class", "demo-warning").html("⚠ Demo placeholder data is showing. Replace the raw CSV and run <code>process_trade_data.py</code> before submission.");
  }

  const controls = shell.append("div").attr("class", "chapter2-controls");
  controls.append("div").attr("class", "control-block").html(`<label>Year</label><div id="chapter2-year-buttons" class="year-buttons"></div>`);
  controls.append("div").attr("class", "control-block").html(`
    <label>Metric</label>
    <select id="chapter2-metric">
      <option value="trade_value_usd">Trade value (US$)</option>
      <option value="net_weight_kg">Net weight (kg)</option>
    </select>
  `);
  controls.append("div").attr("class", "control-block wide").html(`
    <label>Story hint</label>
    <div class="hint">Annual + Recent periods lets you show long-run changes without the noise of monthly missing values.</div>
  `);

  const kpis = shell.append("div").attr("class", "kpi-grid");
  const timeline = shell.append("div").attr("id", "chapter2-timeline");
  const map = shell.append("div").attr("id", "chapter2-map");
  const mid = shell.append("div").attr("class", "chapter2-two-column");
  const sankey = mid.append("div").attr("id", "chapter2-sankey");
  const network = mid.append("div").attr("id", "chapter2-network");
  const rankings = shell.append("div").attr("id", "chapter2-rankings");

  const yearButtons = controls.select("#chapter2-year-buttons");
  const years = data.years.length ? data.years : [state.year];
  yearButtons.selectAll("button")
    .data(years)
    .join("button")
    .attr("class", d => +d === +state.year ? "active" : null)
    .text(d => d)
    .on("click", (_, y) => {
      state.year = +y;
      update();
    });

  controls.select("#chapter2-metric").on("change", function () {
    state.metric = this.value;
    update();
  });

  function update() {
    const yearFlows = data.flows.filter(d => +d.year === +state.year);
    const exporters = new Set(yearFlows.map(d => d.exporter).filter(Boolean));
    const importers = new Set(yearFlows.map(d => d.importer).filter(Boolean));
    const formatter = state.metric === "net_weight_kg" ? formatKg : formatMoney;

    controls.selectAll(".year-buttons button").attr("class", d => +d === +state.year ? "active" : null);
    kpis.selectAll("*").remove();
    const cards = [
      { label: "Selected period", value: state.year, sub: "Recent annual periods" },
      { label: metricLabel(state.metric), value: formatter(sumBy(yearFlows, state.metric)), sub: "Bilateral export flows" },
      { label: "Exporters", value: exporters.size || "—", sub: "Reporter countries" },
      { label: "Import markets", value: importers.size || "—", sub: "Partner countries" },
    ];
    kpis.selectAll("div").data(cards).join("div").attr("class", "kpi-card").html(d => `<span>${d.label}</span><b>${d.value}</b><em>${d.sub}</em>`);

    renderTimelineChart(timeline, data.flows, state, y => { state.year = y; update(); });
    renderTradeFlowMap(map, data.flows, state);
    renderSankeyChart(sankey, data.flows, state);
    renderNetworkGraph(network, data.flows, state);
    renderRankingCharts(rankings, data.flows, state);
  }

  update();
}

export default renderChapter2Trade;

export { renderChapter2Trade as renderChapter2 };
