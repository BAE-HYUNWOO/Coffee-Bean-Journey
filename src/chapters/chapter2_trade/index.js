import * as d3 from "d3";
import "./Chapter2Trade.css";
import { loadChapter2Data } from "./dataLoader.js";
import { renderTradeFlowMap } from "./TradeFlowMap.js";
import { renderSankeyChart } from "./SankeyChart.js";
import { renderNetworkGraph } from "./NetworkGraph.js";
import { renderTimelineChart } from "./TimelineChart.js";
import { renderTradeRingChart } from "./TradeRingChart.js";
import { renderTradeMatrixChart } from "./TradeMatrixChart.js";
import { formatKg, formatMoney, metricLabel, routeDetailHTML } from "./utils.js";

function sumBy(data, key) {
  return d3.sum(data, d => +d[key] || 0);
}

function renderDetailPanel(container, state) {
  container.selectAll("*").remove();
  const selected = state.selectedItem;
  const card = container.append("div").attr("class", "route-detail-card compact-detail-card");

  const kicker = selected?.type === "country" ? "Pinned country" : selected ? "Pinned route" : "Pinned selection";
  const title = selected?.type === "country"
    ? selected.country
    : selected
      ? `${selected.exporter} → ${selected.importer}`
      : "Explore the coffee route network";
  const copy = selected
    ? routeDetailHTML(selected, state.metric)
    : "Click any route, ribbon, node, ring, or matrix cell to pin one selection here.";

  card.html(`
    <span class="detail-kicker">${kicker}</span>
    <h3>${title}</h3>
    <p>${copy}</p>
  `);
}

function renderKPIs(container, cards) {
  container.selectAll("*").remove();
  const nodes = container.selectAll("div")
    .data(cards)
    .join("div")
    .attr("class", "kpi-card compact-kpi-card");

  nodes.html(d => `
    <span>${d.label}</span>
    <b>${d.value}</b>
    ${d.sub ? `<em>${d.sub}</em>` : ""}
  `);
}

function bindChapter2ControlVisibility(shell, controls) {
  const sync = () => {
    const node = shell.node();
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const isInsideChapter = rect.top < 72 && rect.bottom > 190;
    shell.classed("chapter2-controls-fixed", isInsideChapter);
    if (isInsideChapter) {
      const width = Math.min(window.innerWidth - 44, 1760);
      controls.style("width", `${width}px`);
    } else {
      controls.style("width", null);
    }
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });

  return () => {
    window.removeEventListener("scroll", sync);
    window.removeEventListener("resize", sync);
  };
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
    flowLimit: 110,
    selectedItem: null,
    onSelectItem: null,
  };

  const shell = root.append("section").attr("class", "chapter2-trade chapter2-grid-mode");

  const hero = shell.append("header").attr("class", "chapter2-hero compact-hero");
  hero.append("p").attr("class", "eyebrow").text("Chapter 02 · Trade");
  hero.append("h2").text("Trade");

  if (data.stats?.data_mode === "demo_placeholder") {
    hero.append("div").attr("class", "demo-warning").html("⚠ Demo placeholder data is showing. Replace the raw CSV and run <code>process_trade_data.py</code> before submission.");
  }

  const controls = shell.append("div").attr("class", "chapter2-controls compact-controls sticky-trade-controls");
  controls.append("div").attr("class", "control-block").html(`<label>Year</label><div id="chapter2-year-buttons" class="year-buttons"></div>`);
  controls.append("div").attr("class", "control-block").html(`
    <label>Metric</label>
    <select id="chapter2-metric">
      <option value="trade_value_usd">Trade value (US$)</option>
      <option value="net_weight_kg">Net weight (kg)</option>
    </select>
  `);
  controls.append("div").attr("class", "control-block slider-block").html(`
    <label>Route density <b id="chapter2-flow-count">${state.flowLimit}</b></label>
    <input id="chapter2-flow-limit" type="range" min="30" max="180" step="10" value="${state.flowLimit}" />
  `);

  const status = shell.append("div").attr("class", "chapter2-status-strip");
  const detail = status.append("div").attr("id", "chapter2-detail");
  const kpis = status.append("div").attr("class", "kpi-grid sidebar-kpis");

  const visualGrid = shell.append("div").attr("class", "chapter2-visual-grid");
  const timeline = visualGrid.append("div").attr("id", "chapter2-timeline").attr("class", "chapter2-grid-cell chapter2-cell-timeline");
  const sankey = visualGrid.append("div").attr("id", "chapter2-sankey").attr("class", "chapter2-grid-cell chapter2-cell-sankey");
  const map = visualGrid.append("div").attr("id", "chapter2-map").attr("class", "chapter2-grid-cell chapter2-cell-map");
  const network = visualGrid.append("div").attr("id", "chapter2-network").attr("class", "chapter2-grid-cell chapter2-cell-network");
  const ring = visualGrid.append("div").attr("id", "chapter2-trade-ring").attr("class", "chapter2-grid-cell chapter2-cell-ring");
  const matrix = visualGrid.append("div").attr("id", "chapter2-trade-matrix").attr("class", "chapter2-grid-cell chapter2-cell-matrix");

  bindChapter2ControlVisibility(shell, controls);

  state.onSelectItem = (item) => {
    state.selectedItem = item;
    renderDetailPanel(detail, state);
  };

  const yearButtons = controls.select("#chapter2-year-buttons");
  const years = data.years.length ? data.years : [state.year];
  yearButtons.selectAll("button")
    .data(years)
    .join("button")
    .attr("class", d => +d === +state.year ? "active" : null)
    .text(d => d)
    .on("click", (_, y) => {
      state.year = +y;
      state.selectedItem = null;
      update();
    });

  controls.select("#chapter2-metric").on("change", function () {
    state.metric = this.value;
    update();
  });

  controls.select("#chapter2-flow-limit").on("input", function () {
    state.flowLimit = +this.value;
    controls.select("#chapter2-flow-count").text(state.flowLimit);
    update();
  });

  function update() {
    const yearFlows = data.flows.filter(d => +d.year === +state.year);
    const exporters = new Set(yearFlows.map(d => d.exporter).filter(Boolean));
    const importers = new Set(yearFlows.map(d => d.importer).filter(Boolean));
    const formatter = state.metric === "net_weight_kg" ? formatKg : formatMoney;

    controls.selectAll(".year-buttons button").attr("class", d => +d === +state.year ? "active" : null);
    renderDetailPanel(detail, state);

    const cards = [
      { label: "Selected year", value: state.year, sub: "" },
      { label: metricLabel(state.metric), value: formatter(sumBy(yearFlows, state.metric)), sub: "Bilateral flows" },
      { label: "Exporters", value: exporters.size || "—", sub: "Countries" },
      { label: "Import markets", value: importers.size || "—", sub: "Countries" },
    ];
    renderKPIs(kpis, cards);

    renderTimelineChart(timeline, data.flows, state, y => { state.year = y; state.selectedItem = null; update(); });
    renderSankeyChart(sankey, data.flows, state);
    renderTradeFlowMap(map, data.flows, state);
    renderNetworkGraph(network, data.flows, state);
    renderTradeRingChart(ring, data.flows, state);
    renderTradeMatrixChart(matrix, data.flows, state);
  }

  update();
}

export default renderChapter2Trade;
export { renderChapter2Trade as renderChapter2 };
