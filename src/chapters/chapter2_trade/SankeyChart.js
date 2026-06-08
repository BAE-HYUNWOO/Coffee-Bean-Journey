import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, routeKey, topN } from "./utils.js";

export function renderSankeyChart(container, flows, state) {
  container.selectAll("*").remove();
  const width = 760;
  const height = 470;
  const margin = { top: 76, right: 160, bottom: 34, left: 160 };
  const metric = state.metric;
  const tooltip = createTooltip(container);
  const selectedKey = routeKey(state.selectedItem);

  const allYearData = flows.filter(d =>
    +d.year === +state.year &&
    d.importer &&
    d.exporter &&
    d.importer !== "World" &&
    d.exporter !== "World" &&
    Number.isFinite(+d[metric])
  );
  const displayData = topN(allYearData, metric, state.flowLimit || 110);

  const card = container.append("div").attr("class", "viz-card sankey-card");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Exporters → importers</span><small>${state.year} · Sankey-style trade ribbons</small></div>
    <div class="viz-help">Hover to isolate · click a ribbon to pin</div>
  `);

  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "sankey-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "sankey-bg");

  if (!allYearData.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Sankey needs partner-level rows. In UN Comtrade, set Partners = All.");
    return;
  }

  // Keep the node labels consistent with the ranking cards: totals are calculated
  // from the full selected-year dataset, while ribbons are still density-limited.
  const exporterTotals = d3.rollups(allYearData, v => d3.sum(v, d => d[metric]), d => d.exporter)
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 10);
  const importerTotals = d3.rollups(allYearData, v => d3.sum(v, d => d[metric]), d => d.importer)
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 10);
  const exporters = new Set(exporterTotals.map(d => d[0]));
  const importers = new Set(importerTotals.map(d => d[0]));
  const links = topN(
    displayData.filter(d => exporters.has(d.exporter) && importers.has(d.importer)),
    metric,
    state.flowLimit || 80
  );

  const yLeft = d3.scalePoint().domain([...exporters]).range([margin.top + 10, height - margin.bottom]).padding(0.55);
  const yRight = d3.scalePoint().domain([...importers]).range([margin.top + 10, height - margin.bottom]).padding(0.55);
  const xLeft = margin.left;
  const xRight = width - margin.right;

  const totalsLeft = new Map(exporterTotals);
  const totalsRight = new Map(importerTotals);
  const totalMax = d3.max([...totalsLeft.values(), ...totalsRight.values()]) || 1;
  const barWidth = d3.scaleLinear().domain([0, totalMax]).range([18, 86]);
  const stroke = d3.scaleSqrt().domain([0, d3.max(links, d => d[metric]) || 1]).range([1.5, 12]);

  const leftLayer = svg.append("g");
  const rightLayer = svg.append("g");
  const linkLayer = svg.append("g").attr("class", "sankey-links");

  linkLayer.selectAll("path")
    .data(links)
    .join("path")
    .attr("class", d => `sankey-link ${routeKey(d) === selectedKey ? "is-selected" : ""}`)
    .attr("stroke", d => d.exporter === state.selectedItem?.country ? "#6f95a8" : "#8ea6b5")
    .attr("stroke-width", d => stroke(d[metric]))
    .attr("d", d => {
      const y1 = yLeft(d.exporter);
      const y2 = yRight(d.importer);
      const c1 = xLeft + 150;
      const c2 = xRight - 150;
      return `M ${xLeft} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${xRight} ${y2}`;
    })
    .on("mouseenter", function (event, d) {
      linkLayer.selectAll("path").classed("is-muted", true);
      d3.select(this).classed("is-muted", false).classed("is-hovered", true).raise();
      tooltip.show(event, `
        <b>${d.exporter} → ${d.importer}</b><br/>
        ${metricFormatter(metric)(d[metric])}<br/>
        Trade value: ${formatMoney(d.trade_value_usd)}<br/>
        Net weight: ${formatKg(d.net_weight_kg)}<br/>
        <span>Click to pin.</span>
      `);
    })
    .on("mouseleave", function () {
      linkLayer.selectAll("path").classed("is-muted", false).classed("is-hovered", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d);
    });

  const leftRows = leftLayer.selectAll("g")
    .data([...exporters])
    .join("g")
    .attr("class", "sankey-node-row")
    .attr("transform", d => `translate(0,${yLeft(d)})`);

  leftRows.append("rect")
    .attr("class", "sankey-node-bar")
    .attr("x", d => xLeft - barWidth(totalsLeft.get(d)))
    .attr("y", -11)
    .attr("width", d => barWidth(totalsLeft.get(d)))
    .attr("height", 22)
    .attr("rx", 11);

  leftRows.append("text")
    .attr("class", "sankey-node-label")
    .attr("x", xLeft - 10)
    .attr("text-anchor", "end")
    .attr("dy", "0.34em")
    .text(d => d);

  leftRows.append("text")
    .attr("class", "sankey-node-value")
    .attr("x", xLeft - 10)
    .attr("y", 14)
    .attr("text-anchor", "end")
    .text(d => metricFormatter(metric)(totalsLeft.get(d)));

  const rightRows = rightLayer.selectAll("g")
    .data([...importers])
    .join("g")
    .attr("class", "sankey-node-row")
    .attr("transform", d => `translate(0,${yRight(d)})`);

  rightRows.append("rect")
    .attr("class", "sankey-node-bar")
    .attr("x", xRight)
    .attr("y", -11)
    .attr("width", d => barWidth(totalsRight.get(d)))
    .attr("height", 22)
    .attr("rx", 11);

  rightRows.append("text")
    .attr("class", "sankey-node-label")
    .attr("x", xRight + 10)
    .attr("dy", "0.34em")
    .text(d => d);

  rightRows.append("text")
    .attr("class", "sankey-node-value")
    .attr("x", xRight + 10)
    .attr("y", 14)
    .text(d => metricFormatter(metric)(totalsRight.get(d)));

  svg.append("text").attr("class", "axis-title").attr("x", xLeft - 64).attr("y", 54).attr("text-anchor", "middle").text("Exporting countries");
  svg.append("text").attr("class", "axis-title").attr("x", xRight + 64).attr("y", 54).attr("text-anchor", "middle").text("Import markets");
}
