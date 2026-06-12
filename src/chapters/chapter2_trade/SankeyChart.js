import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, routeKey, topN } from "./utils.js";

function countryTooltipHTML(name, value, role, metric) {
  return `
    <b>${name}</b><br/>
    ${metricFormatter(metric)(value)}<br/>
    <span>${role === "exporter" ? "Exporter total" : "Import market total"}. Click to pin this country.</span>
  `;
}

function pinCountry(state, name, value, role) {
  state.onSelectItem?.({
    type: "country",
    country: name,
    value,
    role,
    roleLabel: role === "exporter" ? "top exporter" : "top import market",
  });
}

export function renderSankeyChart(container, flows, state) {
  container.selectAll("*").remove();
  const width = 960;
  const height = 680;
  const margin = { top: 104, right: 190, bottom: 78, left: 190 };
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

  const card = container.append("div").attr("class", "viz-card sankey-card sankey-card-no-mini-ranks");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Exporters → importers</span><small>${state.year} · Sankey ribbons + interactive side totals</small></div>
    <div class="viz-help">Hover side bars or ribbons · click to pin</div>
  `);

  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "sankey-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "sankey-bg");

  if (!allYearData.length) {
    svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Sankey needs partner-level rows. In UN Comtrade, set Partners = All.");
    return;
  }

  const exporterTotals = d3.rollups(allYearData, v => d3.sum(v, d => d[metric]), d => d.exporter)
    .sort((a, b) => b[1] - a[1]);
  const importerTotals = d3.rollups(allYearData, v => d3.sum(v, d => d[metric]), d => d.importer)
    .sort((a, b) => b[1] - a[1]);
  const topExporters = exporterTotals.slice(0, 10);
  const topImporters = importerTotals.slice(0, 10);
  const exporters = new Set(topExporters.map(d => d[0]));
  const importers = new Set(topImporters.map(d => d[0]));
  const links = topN(
    displayData.filter(d => exporters.has(d.exporter) && importers.has(d.importer)),
    metric,
    state.flowLimit || 80
  );

  const sankeyBottom = height - margin.bottom;
  const yLeft = d3.scalePoint().domain(topExporters.map(d => d[0])).range([margin.top + 10, sankeyBottom]).padding(0.5);
  const yRight = d3.scalePoint().domain(topImporters.map(d => d[0])).range([margin.top + 10, sankeyBottom]).padding(0.5);
  const xLeft = margin.left;
  const xRight = width - margin.right;

  const totalMax = d3.max([...topExporters, ...topImporters], d => d[1]) || 1;
  const barWidth = d3.scaleLinear().domain([0, totalMax]).range([34, 168]);
  const stroke = d3.scaleSqrt().domain([0, d3.max(links, d => d[metric]) || 1]).range([2.4, 15]);

  const leftLayer = svg.append("g");
  const rightLayer = svg.append("g");
  const linkLayer = svg.append("g").attr("class", "sankey-links");

  const link = linkLayer.selectAll("path")
    .data(links)
    .join("path")
    .attr("class", d => `sankey-link ${routeKey(d) === selectedKey ? "is-selected" : ""}`)
    .attr("stroke", d => d.exporter === state.selectedItem?.country ? "#6f95a8" : "#8ea6b5")
    .attr("stroke-width", d => stroke(d[metric]))
    .attr("d", d => {
      const y1 = yLeft(d.exporter);
      const y2 = yRight(d.importer);
      const c1 = xLeft + 190;
      const c2 = xRight - 190;
      return `M ${xLeft} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${xRight} ${y2}`;
    })
    .on("mouseenter", function (event, d) {
      link.classed("is-muted", true);
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
      link.classed("is-muted", false).classed("is-hovered", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d);
    });

  function decorateRows(rows, role) {
    rows
      .on("mouseenter", function (event, d) {
        const name = d[0];
        link.classed("is-muted", true);
        link
          .filter(l => role === "exporter" ? l.exporter === name : l.importer === name)
          .classed("is-muted", false)
          .classed("is-hovered", true)
          .raise();
        d3.select(this).classed("is-related", true).raise();
        tooltip.show(event, countryTooltipHTML(name, d[1], role, metric));
      })
      .on("mousemove", (event, d) => tooltip.show(event, countryTooltipHTML(d[0], d[1], role, metric)))
      .on("mouseleave", function () {
        link.classed("is-muted", false).classed("is-hovered", false);
        d3.select(this).classed("is-related", false);
        tooltip.hide();
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        pinCountry(state, d[0], d[1], role);
      });
  }

  const leftRows = leftLayer.selectAll("g")
    .data(topExporters)
    .join("g")
    .attr("class", "sankey-node-row sankey-side-total-row")
    .attr("transform", d => `translate(0,${yLeft(d[0])})`);

  leftRows.append("rect")
    .attr("class", "sankey-node-bar")
    .attr("x", d => xLeft - barWidth(d[1]))
    .attr("y", -17)
    .attr("width", d => barWidth(d[1]))
    .attr("height", 34)
    .attr("rx", 17);

  leftRows.append("text")
    .attr("class", "sankey-node-label")
    .attr("x", xLeft - 10)
    .attr("text-anchor", "end")
    .attr("dy", "0.34em")
    .text(d => d[0]);

  leftRows.append("text")
    .attr("class", "sankey-node-value")
    .attr("x", xLeft - 10)
    .attr("y", 23)
    .attr("text-anchor", "end")
    .text(d => metricFormatter(metric)(d[1]));
  decorateRows(leftRows, "exporter");

  const rightRows = rightLayer.selectAll("g")
    .data(topImporters)
    .join("g")
    .attr("class", "sankey-node-row sankey-side-total-row")
    .attr("transform", d => `translate(0,${yRight(d[0])})`);

  rightRows.append("rect")
    .attr("class", "sankey-node-bar")
    .attr("x", xRight)
    .attr("y", -17)
    .attr("width", d => barWidth(d[1]))
    .attr("height", 34)
    .attr("rx", 17);

  rightRows.append("text")
    .attr("class", "sankey-node-label")
    .attr("x", xRight + 10)
    .attr("dy", "0.34em")
    .text(d => d[0]);

  rightRows.append("text")
    .attr("class", "sankey-node-value")
    .attr("x", xRight + 10)
    .attr("y", 23)
    .text(d => metricFormatter(metric)(d[1]));
  decorateRows(rightRows, "importer");

  svg.append("text").attr("class", "axis-title").attr("x", xLeft - 78).attr("y", 68).attr("text-anchor", "middle").text("Exporting countries");
  svg.append("text").attr("class", "axis-title").attr("x", xRight + 78).attr("y", 68).attr("text-anchor", "middle").text("Import markets");
}
