import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

export function renderNetworkGraph(container, flows, state) {
  container.selectAll("*").remove();
  const width = 820;
  const height = 560;
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = topN(flows.filter(d => +d.year === +state.year && d.importer && d.exporter), metric, state.flowLimit || 110);
  const card = container.append("div").attr("class", "viz-card network-card");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Trade network graph</span><small>${state.year} · drag nodes, zoom the graph, click to pin</small></div>
    <div class="viz-help">Drag nodes · wheel zoom · double-click background to reset</div>
  `);
  card.append("div").attr("class", "network-inline-legend").html(`
    <span><i class="legend-dot is-exporter"></i>Exporter / origin hub</span>
    <span><i class="legend-dot is-importer"></i>Importer / market hub</span>
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
    .scaleExtent([0.65, 4])
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
    importer.value += d[metric];
    nodesById.set(d.importer, importer);

    return { source: exporter.id, target: importer.id, raw: d, value: d[metric] };
  });

  const nodes = [...nodesById.values()].sort((a, b) => b.value - a.value).slice(0, 56);
  const keep = new Set(nodes.map(d => d.id));
  const filteredLinks = links.filter(d => keep.has(d.source) && keep.has(d.target));
  const linked = new Set(filteredLinks.flatMap(d => [d.source, d.target]));
  const finalNodes = nodes.filter(d => linked.has(d.id));

  const size = d3.scaleSqrt().domain([0, d3.max(finalNodes, d => d.value) || 1]).range([4.5, 24]);
  const linkWidth = d3.scaleSqrt().domain([0, d3.max(filteredLinks, d => d.value) || 1]).range([0.8, 5.2]);

  const simulation = d3.forceSimulation(finalNodes)
    .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(82).strength(0.16))
    .force("charge", d3.forceManyBody().strength(-135))
    .force("center", d3.forceCenter(width / 2, height / 2 + 18))
    .force("collision", d3.forceCollide().radius(d => size(d.value) + 8));

  const link = linkG.selectAll("line")
    .data(filteredLinks)
    .join("line")
    .attr("class", "network-link")
    .attr("stroke-width", d => linkWidth(d.value))
    .on("mouseenter", function (event, d) {
      link.classed("is-muted", true);
      node.classed("is-muted", true);
      d3.select(this).classed("is-muted", false).classed("is-hovered", true);
      node.filter(n => n.id === d.source.id || n.id === d.target.id).classed("is-muted", false);
      tooltip.show(event, `
        <b>${d.raw.exporter} → ${d.raw.importer}</b><br/>
        ${metricFormatter(metric)(d.value)}<br/>
        Trade value: ${formatMoney(d.raw.trade_value_usd)}<br/>
        Net weight: ${formatKg(d.raw.net_weight_kg)}<br/>
        <span>Click to pin.</span>
      `);
    })
    .on("mouseleave", function () {
      link.classed("is-muted", false).classed("is-hovered", false);
      node.classed("is-muted", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d.raw);
    });

  const node = nodeG.selectAll("g")
    .data(finalNodes)
    .join("g")
    .attr("class", "network-node")
    .call(
      d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.22).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
        })
    )
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.id}</b><br/>
      Total visible flow: ${metricFormatter(metric)(d.value)}<br/>
      Export side: ${metricFormatter(metric)(d.exportValue)}<br/>
      Import side: ${metricFormatter(metric)(d.importValue)}<br/>
      <span>Click to pin this country.</span>
    `))
    .on("mouseleave", tooltip.hide)
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.({ type: "country", country: d.id, value: d.value, role: d.role, roleLabel: d.role === "exporter" ? "exporter / origin hub" : "importer / market hub" });
    });

  node.append("circle")
    .attr("class", d => d.role === "exporter" ? "network-exporter" : "network-importer")
    .attr("r", d => size(d.value));

  node.append("text")
    .attr("class", "network-label")
    .attr("text-anchor", "middle")
    .attr("dy", d => -(size(d.value) + 8))
    .text(d => d.id)
    .style("display", d => size(d.value) > 8 ? null : "none");

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

}
