import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, routeKey, topN } from "./utils.js";

export function renderSankeyChart(container, flows, state) {
  container.selectAll("*").remove();
  const width = 1260;
  const height = 690;
  const margin = { top: 74, right: 238, bottom: 48, left: 238 };
  const metric = state.metric;
  const tooltip = createTooltip(container);
  const selectedKey = routeKey(state.selectedItem);

  const data = topN(flows.filter(d => +d.year === +state.year && d.importer && d.exporter), metric, state.flowLimit || 110);
  const card = container.append("div").attr("class", "viz-card sankey-card feature-resizable");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Exporters → importers</span><small>${state.year} · Sankey-style trade ribbons</small></div>
    <div class="viz-help">Hover to isolate · click a ribbon to pin</div>
  `);

  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "sankey-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "sankey-bg");

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Sankey needs partner-level rows. In UN Comtrade, set Partners = All.");
    return;
  }

  const exporterTotals = d3.rollups(data, v => d3.sum(v, d => d[metric]), d => d.exporter).sort((a,b)=>b[1]-a[1]).slice(0, 12);
  const importerTotals = d3.rollups(data, v => d3.sum(v, d => d[metric]), d => d.importer).sort((a,b)=>b[1]-a[1]).slice(0, 12);
  const exporters = new Set(exporterTotals.map(d => d[0]));
  const importers = new Set(importerTotals.map(d => d[0]));
  const links = topN(data.filter(d => exporters.has(d.exporter) && importers.has(d.importer)), metric, state.flowLimit || 110);

  const yLeft = d3.scalePoint().domain([...exporters]).range([margin.top + 28, height - margin.bottom - 22]).padding(0.58);
  const yRight = d3.scalePoint().domain([...importers]).range([margin.top + 28, height - margin.bottom - 22]).padding(0.58);
  const xLeft = margin.left;
  const xRight = width - margin.right;
  const maxLink = d3.max(links, d => d[metric]) || 1;
  const stroke = d3.scaleSqrt().domain([0, maxLink]).range([1.4, 20]);
  const color = d3.scaleOrdinal().domain([...exporters]).range(d3.schemeTableau10.concat(d3.schemeSet3));

  svg.append("text").attr("x", xLeft).attr("y", 42).attr("text-anchor", "middle").attr("class", "axis-title").text("Exporting countries");
  svg.append("text").attr("x", xRight).attr("y", 42).attr("text-anchor", "middle").attr("class", "axis-title").text("Import markets");

  const linkG = svg.append("g").attr("class", "sankey-links");
  const linkSel = linkG
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", d => {
      const y1 = yLeft(d.exporter);
      const y2 = yRight(d.importer);
      const c1 = xLeft + (xRight - xLeft) * 0.45;
      const c2 = xLeft + (xRight - xLeft) * 0.55;
      return `M${xLeft},${y1} C${c1},${y1} ${c2},${y2} ${xRight},${y2}`;
    })
    .attr("stroke", d => color(d.exporter))
    .attr("stroke-width", d => stroke(d[metric]))
    .attr("class", d => `sankey-link ${routeKey(d) === selectedKey ? "is-selected" : ""}`)
    .on("mouseenter", function (event, d) {
      linkSel.classed("is-muted", l => l.exporter !== d.exporter && l.importer !== d.importer);
      d3.select(this).classed("is-hovered", true).raise();
      svg.selectAll(".sankey-node-row").classed("is-related", n => n[0] === d.exporter || n[0] === d.importer);
    })
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.exporter} → ${d.importer}</b><br/>
      ${state.year}<br/>
      ${metricFormatter(metric)(d[metric])}<br/>
      Trade value: ${formatMoney(d.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.net_weight_kg)}<br/>
      <span>Click to pin this route.</span>
    `))
    .on("mouseleave", function () {
      linkSel.classed("is-muted", false).classed("is-hovered", false);
      svg.selectAll(".sankey-node-row").classed("is-related", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d);
    });

  function drawSide(items, x, yScale, side) {
    const maxVal = d3.max(items, d => d[1]) || 1;
    const bar = d3.scaleLinear().domain([0, maxVal]).range([26, 166]);
    const g = svg.append("g").attr("class", `sankey-${side}`);
    const nodes = g.selectAll("g").data(items).join("g")
      .attr("class", "sankey-node-row")
      .attr("transform", d => `translate(${x},${yScale(d[0])})`)
      .on("mousemove", (event, d) => tooltip.show(event, `<b>${d[0]}</b><br/>Total: ${metricFormatter(metric)(d[1])}<br/><span>Click to pin this country.</span>`))
      .on("mouseleave", tooltip.hide)
      .on("click", (event, d) => {
        event.stopPropagation();
        state.onSelectItem?.({ type: "country", country: d[0], value: d[1], role: side, roleLabel: side === "left" ? "top exporter" : "top import market" });
      });

    nodes.append("rect")
      .attr("x", side === "left" ? -bar.range()[1] : 0)
      .attr("y", -14)
      .attr("width", d => bar(d[1]))
      .attr("height", 28)
      .attr("rx", 14)
      .attr("class", "sankey-node-bar");
    nodes.append("text")
      .attr("x", side === "left" ? -12 : 12)
      .attr("dy", "0.32em")
      .attr("text-anchor", side === "left" ? "end" : "start")
      .attr("class", "sankey-node-label")
      .text(d => d[0]);
    nodes.append("text")
      .attr("x", side === "left" ? -12 : 12)
      .attr("dy", "1.82em")
      .attr("text-anchor", side === "left" ? "end" : "start")
      .attr("class", "sankey-node-value")
      .text(d => metricFormatter(metric)(d[1]));
  }

  drawSide(exporterTotals, xLeft, yLeft, "left");
  drawSide(importerTotals, xRight, yRight, "right");
}
