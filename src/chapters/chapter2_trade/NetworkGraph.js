import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, topN } from "./utils.js";

export function renderNetworkGraph(container, flows, state) {
  container.selectAll("*").remove();
  const width = 980;
  const height = 560;
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = topN(flows.filter(d => +d.year === +state.year && d.importer && d.exporter), metric, 70);
  const card = container.append("div").attr("class", "viz-card network-card");
  card.append("div").attr("class", "viz-card-title").html(`
    <span>Trade network</span>
    <small>${state.year} · countries as nodes, coffee routes as links</small>
  `);
  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "network-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "network-bg");

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Network needs bilateral country pairs. Add Partner=All data.");
    return;
  }

  const nodesById = new Map();
  const links = data.map(d => {
    nodesById.set(d.exporter, nodesById.get(d.exporter) || { id: d.exporter, role: "exporter", value: 0 });
    nodesById.set(d.importer, nodesById.get(d.importer) || { id: d.importer, role: "importer", value: 0 });
    nodesById.get(d.exporter).value += d[metric];
    nodesById.get(d.importer).value += d[metric] * 0.55;
    return { source: d.exporter, target: d.importer, value: d[metric], raw: d };
  });
  const nodes = [...nodesById.values()];
  const maxNode = d3.max(nodes, d => d.value) || 1;
  const maxLink = d3.max(links, d => d.value) || 1;
  const r = d3.scaleSqrt().domain([0, maxNode]).range([5, 26]);
  const stroke = d3.scaleSqrt().domain([0, maxLink]).range([0.8, 7]);

  const linkG = svg.append("g").attr("class", "network-links");
  const nodeG = svg.append("g").attr("class", "network-nodes");

  const link = linkG.selectAll("line").data(links).join("line")
    .attr("class", "network-link")
    .attr("stroke-width", d => stroke(d.value))
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.raw.exporter} → ${d.raw.importer}</b><br/>
      Trade value: ${formatMoney(d.raw.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.raw.net_weight_kg)}
    `))
    .on("mouseleave", tooltip.hide);

  const node = nodeG.selectAll("g").data(nodes).join("g").attr("class", "network-node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));
  node.append("circle")
    .attr("r", d => r(d.value))
    .attr("class", d => d.role === "exporter" ? "network-exporter" : "network-importer")
    .on("mousemove", (event, d) => tooltip.show(event, `<b>${d.id}</b><br/>Node strength: ${formatMoney(d.value)}`))
    .on("mouseleave", tooltip.hide);
  node.append("text")
    .attr("class", "network-label")
    .attr("x", d => r(d.value) + 5)
    .attr("dy", "0.32em")
    .text(d => d.id);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => 70 + 180 * (1 - d.value / maxLink)).strength(0.25))
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(width / 2, height / 2 + 12))
    .force("x", d3.forceX(d => d.role === "exporter" ? width * 0.34 : width * 0.66).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05))
    .on("tick", ticked);

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }
}
