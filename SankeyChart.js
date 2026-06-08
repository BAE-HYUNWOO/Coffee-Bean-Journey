import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

export function renderSankeyChart(container, flows, state) {
  container.selectAll("*").remove();
  const width = 980;
  const height = 560;
  const margin = { top: 56, right: 190, bottom: 34, left: 190 };
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = topN(flows.filter(d => +d.year === +state.year && d.importer && d.exporter), metric, 80);
  const card = container.append("div").attr("class", "viz-card sankey-card");
  card.append("div").attr("class", "viz-card-title").html(`
    <span>Exporters → importers</span>
    <small>${state.year} · Sankey-style trade ribbons</small>
  `);

  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "sankey-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "sankey-bg");

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Sankey needs partner-level rows. In UN Comtrade, set Partners = All.");
    return;
  }

  const exporterTotals = d3.rollups(data, v => d3.sum(v, d => d[metric]), d => d.exporter).sort((a,b)=>b[1]-a[1]).slice(0, 9);
  const importerTotals = d3.rollups(data, v => d3.sum(v, d => d[metric]), d => d.importer).sort((a,b)=>b[1]-a[1]).slice(0, 9);
  const exporters = new Set(exporterTotals.map(d => d[0]));
  const importers = new Set(importerTotals.map(d => d[0]));
  const links = data.filter(d => exporters.has(d.exporter) && importers.has(d.importer));

  const yLeft = d3.scalePoint().domain([...exporters]).range([margin.top + 24, height - margin.bottom - 20]).padding(0.6);
  const yRight = d3.scalePoint().domain([...importers]).range([margin.top + 24, height - margin.bottom - 20]).padding(0.6);
  const xLeft = margin.left;
  const xRight = width - margin.right;
  const maxLink = d3.max(links, d => d[metric]) || 1;
  const stroke = d3.scaleSqrt().domain([0, maxLink]).range([1.2, 18]);
  const color = d3.scaleOrdinal().domain([...exporters]).range(d3.schemeTableau10);

  svg.append("text").attr("x", xLeft).attr("y", 34).attr("text-anchor", "middle").attr("class", "axis-title").text("Exporting countries");
  svg.append("text").attr("x", xRight).attr("y", 34).attr("text-anchor", "middle").attr("class", "axis-title").text("Import markets");

  svg.append("g").attr("class", "sankey-links")
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
    .attr("class", "sankey-link")
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.exporter} → ${d.importer}</b><br/>
      ${state.year}<br/>
      ${metricFormatter(metric)(d[metric])}<br/>
      Trade value: ${formatMoney(d.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.net_weight_kg)}
    `))
    .on("mouseleave", tooltip.hide);

  function drawSide(items, x, yScale, keyName, side) {
    const maxVal = d3.max(items, d => d[1]) || 1;
    const bar = d3.scaleLinear().domain([0, maxVal]).range([22, 130]);
    const g = svg.append("g").attr("class", `sankey-${side}`);
    const nodes = g.selectAll("g").data(items).join("g").attr("transform", d => `translate(${x},${yScale(d[0])})`);
    nodes.append("rect")
      .attr("x", side === "left" ? -bar.range()[1] : 0)
      .attr("y", -13)
      .attr("width", d => bar(d[1]))
      .attr("height", 26)
      .attr("rx", 13)
      .attr("class", "sankey-node-bar");
    nodes.append("text")
      .attr("x", side === "left" ? -10 : 10)
      .attr("dy", "0.32em")
      .attr("text-anchor", side === "left" ? "end" : "start")
      .attr("class", "sankey-node-label")
      .text(d => d[0]);
    nodes.append("text")
      .attr("x", side === "left" ? -10 : 10)
      .attr("dy", "1.72em")
      .attr("text-anchor", side === "left" ? "end" : "start")
      .attr("class", "sankey-node-value")
      .text(d => metricFormatter(metric)(d[1]));
  }

  drawSide(exporterTotals, xLeft, yLeft, "exporter", "left");
  drawSide(importerTotals, xRight, yRight, "importer", "right");
}
