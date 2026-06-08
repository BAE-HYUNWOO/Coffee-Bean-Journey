import * as d3 from "d3";
import "./Chapter2Trade.css";
import { loadChapter2Data } from "./dataLoader.js";
import { renderTradeFlowMap } from "./TradeFlowMap.js";
import { renderSankeyChart } from "./SankeyChart.js";
import { renderNetworkGraph } from "./NetworkGraph.js";
import { renderRankingCharts } from "./RankingCharts.js";
import { renderTimelineChart } from "./TimelineChart.js";
import { formatKg, formatMoney, metricLabel, routeDetailHTML } from "./utils.js";

function sumBy(data, key) {
  return d3.sum(data, d => +d[key] || 0);
}

function renderDetailPanel(container, state) {
  container.selectAll("*").remove();
  const selected = state.selectedItem;
  const card = container.append("div")
    .attr("class", `route-detail-card ${state.detailFlipped ? "is-flipped" : ""}`)
    .attr("role", "button")
    .attr("tabindex", 0)
    .on("click", () => {
      state.detailFlipped = !state.detailFlipped;
      renderDetailPanel(container, state);
    })
    .on("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.detailFlipped = !state.detailFlipped;
        renderDetailPanel(container, state);
      }
    });

  card.append("div").attr("class", "route-detail-inner").html(`
    <div class="route-detail-face route-detail-front">
      <span class="detail-kicker">Pinned interaction</span>
      <h3>${selected?.type === "country" ? selected.country : selected ? `${selected.exporter} → ${selected.importer}` : "Explore the coffee route network"}</h3>
      <p>${routeDetailHTML(selected, state.metric)}</p>
      <em>Click this card to flip it.</em>
    </div>
    <div class="route-detail-face route-detail-back">
      <span class="detail-kicker">How to use this chapter</span>
      <h3>Hover · Click · Drag · Zoom</h3>
      <p>
        Hover routes and bars for exact values. Click any route, node, or ranking bar to pin it here.
        Drag network nodes to rearrange the graph, and use the mouse wheel on the map/network to zoom.
        Use the route-limit slider to make the visualization denser or cleaner.
      </p>
      <em>Click again to return.</em>
    </div>
  `);
}

function renderKPIs(container, cards) {
  container.selectAll("*").remove();
  const node = container.selectAll("div")
    .data(cards)
    .join("div")
    .attr("class", "kpi-card")
    .attr("role", "button")
    .attr("tabindex", 0);

  node.html(d => `
    <div class="kpi-inner">
      <div class="kpi-face kpi-front">
        <span>${d.label}</span>
        <b>${d.value}</b>
        <em>${d.sub}</em>
      </div>
      <div class="kpi-face kpi-back">
        <span>Reading tip</span>
        <p>${d.tip}</p>
      </div>
    </div>
  `);

  node.on("click", function () {
      d3.select(this).classed("is-flipped", !d3.select(this).classed("is-flipped"));
    })
    .on("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        d3.select(this).classed("is-flipped", !d3.select(this).classed("is-flipped"));
      }
    });
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
    detailFlipped: false,
    onSelectItem: null,
  };

  const shell = root.append("section").attr("class", "chapter2-trade");
  shell.append("div").attr("class", "coffee-orbit").html(`<span></span><span></span><span></span>`);

  const hero = shell.append("header").attr("class", "chapter2-hero");
  hero.append("p").attr("class", "eyebrow").text("Chapter 2 · Trade Routes");
  hero.append("h2").html(`咖啡如何环游世界？<br/><strong>How coffee travels around the world</strong>`);
  hero.append("p").attr("class", "hero-copy").text("Using UN Comtrade HS0901 exports, this chapter turns country-to-country coffee trade into animated routes, Sankey ribbons, draggable network structure, and recent-period trends.");

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
  controls.append("div").attr("class", "control-block slider-block").html(`
    <label>Route density <b id="chapter2-flow-count">${state.flowLimit}</b></label>
    <input id="chapter2-flow-limit" type="range" min="30" max="180" step="10" value="${state.flowLimit}" />
    <div class="hint">Drag to show fewer or more routes in the map, Sankey, and network.</div>
  `);

  const detail = shell.append("div").attr("id", "chapter2-detail");
  const kpis = shell.append("div").attr("class", "kpi-grid");
  const timeline = shell.append("div").attr("id", "chapter2-timeline").attr("class", "chapter2-compact-chart");
  const map = shell.append("div").attr("id", "chapter2-map");
  const features = shell.append("div").attr("class", "chapter2-feature-stack");
  const sankey = features.append("div").attr("id", "chapter2-sankey");
  const network = features.append("div").attr("id", "chapter2-network");
  const rankings = shell.append("div").attr("id", "chapter2-rankings").attr("class", "chapter2-compact-chart");

  state.onSelectItem = (item) => {
    state.selectedItem = item;
    state.detailFlipped = false;
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
      { label: "Selected period", value: state.year, sub: "Recent annual periods", tip: "Use year buttons or click timeline dots to compare how coffee routes change over time." },
      { label: metricLabel(state.metric), value: formatter(sumBy(yearFlows, state.metric)), sub: "Bilateral export flows", tip: "This total uses exporter-to-importer rows. Partner=World aggregate rows are excluded from the flow visualizations." },
      { label: "Exporters", value: exporters.size || "—", sub: "Reporter countries", tip: "Reporter countries are the origin side of each export row in the UN Comtrade data." },
      { label: "Import markets", value: importers.size || "—", sub: "Partner countries", tip: "Partner countries are the destination side of each coffee export route." },
    ];
    renderKPIs(kpis, cards);

    renderTimelineChart(timeline, data.flows, state, y => { state.year = y; state.selectedItem = null; update(); });
    renderTradeFlowMap(map, data.flows, state);
    renderSankeyChart(sankey, data.flows, state);
    renderNetworkGraph(network, data.flows, state);
    renderRankingCharts(rankings, data.flows, state);
  }

  update();
}

export default renderChapter2Trade;
export { renderChapter2Trade as renderChapter2 };
