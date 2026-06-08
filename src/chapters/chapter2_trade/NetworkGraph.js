import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

export function renderNetworkGraph(container, flows, state) {
  container.selectAll("*").remove();
  const width = 1260;
  const height = 720;
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = topN(flows.filter(d => +d.year === +state.year && d.importer && d.exporter), metric, state.flowLimit || 110);
  const card = container.append("div").attr("class", "viz-card network-card feature-resizable");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Trade network graph</span><small>${state.year} · drag nodes, zoom the graph, click to pin</small></div>
    <div class="viz-help">Drag nodes · wheel zoom · double-click background to reset</div>
  `);
  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "network-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "network-bg");

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Network needs bilateral country pairs. Add Partner=All data.");
    return;
  }

  const graphLayer = svg.append("g").attr("class", "network-zoom-layer");
  const linkG = graphLayer.append("g").attr("class", "network-links");
  const nodeG = graphLayer.append("g").attr("class", "network-nodes");

  const zoom = d3.zoom()
    .scaleExtent([0.55, 4])
    .on("zoom", (event) => graphLayer.attr("transform", event.transform));
  svg.call(zoom).on("dblclick.zoom", null);
  svg.on("dblclick", () => svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity));

  const nodesById = new Map();
  const links = data.map(d => {
    const exporter = nodesById.get(d.exporter) || { id: d.exporter, role: "exporter", exportValue: 0, importValue: 0, value: 0 };
    exporter.exportValue += d[metric];
    exporter.value += d[metric];
    nodesById.set(d.exporter, exporter);
    const importer = nodesById.get(d.importer) || { id: d.importer, role: "importer", exportValue: 0, importValue: 0, value: 0 };
    importer.importValue += d[metric];
    importer.value += d[metric] * 0.72;
    if (importer.exportValue > importer.importValue) importer.role = "exporter";
    nodesById.set(d.importer, importer);
    return { source: d.exporter, target: d.importer, value: d[metric], raw: d };
  });
  const nodes = [...nodesById.values()];
  const maxNode = d3.max(nodes, d => d.value) || 1;
  const maxLink = d3.max(links, d => d.value) || 1;
  const r = d3.scaleSqrt().domain([0, maxNode]).range([7, 34]);
  const stroke = d3.scaleSqrt().domain([0, maxLink]).range([0.9, 8.5]);

  const link = linkG.selectAll("line").data(links).join("line")
    .attr("class", "network-link")
    .attr("stroke-width", d => stroke(d.value))
    .on("mouseenter", function (event, d) {
      link.classed("is-muted", l => l !== d);
      node.classed("is-muted", n => n.id !== d.source.id && n.id !== d.target.id);
      d3.select(this).classed("is-hovered", true).raise();
    })
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.raw.exporter} → ${d.raw.importer}</b><br/>
      Trade value: ${formatMoney(d.raw.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.raw.net_weight_kg)}<br/>
      <span>Click to pin this route.</span>
    `))
    .on("mouseleave", function () {
      link.classed("is-muted", false).classed("is-hovered", false);
      node.classed("is-muted", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d.raw);
    });

  const node = nodeG.selectAll("g").data(nodes).join("g").attr("class", "network-node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  node.append("circle")
    .attr("r", d => r(d.value))
    .attr("class", d => d.role === "exporter" ? "network-exporter" : "network-importer")
    .on("mouseenter", function (event, d) {
      const related = new Set();
      links.forEach(l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        if (s === d.id || t === d.id) { related.add(s); related.add(t); }
      });
      node.classed("is-muted", n => !related.has(n.id));
      link.classed("is-muted", l => l.source.id !== d.id && l.target.id !== d.id);
      d3.select(this.parentNode).raise();
    })
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.id}</b><br/>
      Node strength: ${metricFormatter(metric)(d.value)}<br/>
      Export side: ${metricFormatter(metric)(d.exportValue)}<br/>
      Import side: ${metricFormatter(metric)(d.importValue)}<br/>
      <span>Drag to move · click to pin.</span>
    `))
    .on("mouseleave", () => {
      node.classed("is-muted", false);
      link.classed("is-muted", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.({ type: "country", country: d.id, value: d.value, role: d.role, roleLabel: d.role === "exporter" ? "network exporter hub" : "network import hub" });
    });

  node.append("text")
    .attr("class", "network-label")
    .attr("x", d => r(d.value) + 7)
    .attr("dy", "0.32em")
    .text(d => d.id);

  svg.append("g").attr("class", "network-legend").attr("transform", `translate(30,${height - 70})`).html(`
    <circle cx="0" cy="0" r="8" class="network-exporter"></circle>
    <text x="18" y="4">Exporter / origin hub</text>
    <circle cx="190" cy="0" r="8" class="network-importer"></circle>
    <text x="208" y="4">Importer / market hub</text>
  `);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => 95 + 190 * (1 - d.value / maxLink)).strength(0.28))
    .force("charge", d3.forceManyBody().strength(-190))
    .force("collide", d3.forceCollide().radius(d => r(d.value) + 9).strength(0.8))
    .force("center", d3.forceCenter(width / 2, height / 2 + 18))
    .force("x", d3.forceX(d => d.role === "exporter" ? width * 0.35 : width * 0.65).strength(0.07))
    .force("y", d3.forceY(height / 2).strength(0.06))
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
    d.fx = event.x; d.fy = event.y;
  }
}
