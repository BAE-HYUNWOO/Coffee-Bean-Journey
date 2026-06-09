import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

function aggregateBy(data, key, metric) {
  return d3.rollups(data, v => d3.sum(v, d => +d[metric] || 0), d => d[key])
    .filter(d => d[0])
    .sort((a, b) => b[1] - a[1]);
}

export function renderTradeMatrixChart(container, flows, state) {
  container.selectAll("*").remove();
  const width = 760;
  const height = 780;
  const margin = { top: 118, right: 56, bottom: 84, left: 138 };
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const yearFlows = flows.filter(d => +d.year === +state.year && d.exporter && d.importer);
  const exporters = aggregateBy(yearFlows, "exporter", metric).slice(0, 12).map(d => d[0]);
  const importers = aggregateBy(yearFlows, "importer", metric).slice(0, 12).map(d => d[0]);
  const exporterSet = new Set(exporters);
  const importerSet = new Set(importers);

  const matrixMap = new Map();
  yearFlows.forEach(d => {
    if (!exporterSet.has(d.exporter) || !importerSet.has(d.importer)) return;
    const key = `${d.exporter}|||${d.importer}`;
    const row = matrixMap.get(key) || {
      exporter: d.exporter,
      importer: d.importer,
      trade_value_usd: 0,
      net_weight_kg: 0,
      count: 0,
      exemplar: d,
    };
    row.trade_value_usd += +d.trade_value_usd || 0;
    row.net_weight_kg += +d.net_weight_kg || 0;
    row.count += 1;
    if ((+d[metric] || 0) > (+row.exemplar[metric] || 0)) row.exemplar = d;
    matrixMap.set(key, row);
  });

  const cells = [];
  exporters.forEach(exporter => {
    importers.forEach(importer => {
      cells.push(matrixMap.get(`${exporter}|||${importer}`) || {
        exporter,
        importer,
        trade_value_usd: 0,
        net_weight_kg: 0,
        count: 0,
        exemplar: null,
      });
    });
  });

  const card = container.append("div").attr("class", "viz-card trade-matrix-card");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Export-import intensity matrix</span><small>${state.year} · adjacent matrix view of top trade hubs</small></div>
    <div class="viz-help">Darker cells mean stronger coffee corridors</div>
  `);

  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "trade-matrix-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 26).attr("class", "trade-matrix-bg");

  if (!exporters.length || !importers.length) {
    svg.append("text")
      .attr("x", width / 2).attr("y", height / 2)
      .attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Matrix needs bilateral exporter-importer rows.");
    return;
  }

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = d3.scaleBand().domain(importers).range([margin.left, margin.left + innerW]).paddingInner(0.08).paddingOuter(0.02);
  const y = d3.scaleBand().domain(exporters).range([margin.top, margin.top + innerH]).paddingInner(0.08).paddingOuter(0.02);
  const maxValue = d3.max(cells, d => +d[metric] || 0) || 1;
  const color = d3.scaleSequentialSqrt(d3.interpolateRgbBasis(["#f3eadf", "#d7a565", "#81553a", "#4a2e20"])).domain([0, maxValue]);

  svg.append("text")
    .attr("class", "matrix-axis-title")
    .attr("x", margin.left)
    .attr("y", 74)
    .text("Import markets →");
  svg.append("text")
    .attr("class", "matrix-axis-title")
    .attr("x", 22)
    .attr("y", margin.top - 18)
    .text("Exporters ↓");

  svg.append("g")
    .selectAll("text")
    .data(importers)
    .join("text")
    .attr("class", "matrix-axis-label")
    .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2},${margin.top - 12}) rotate(-42)`)
    .attr("text-anchor", "start")
    .text(d => d.length > 10 ? `${d.slice(0, 9)}…` : d);

  svg.append("g")
    .selectAll("text")
    .data(exporters)
    .join("text")
    .attr("class", "matrix-axis-label")
    .attr("x", margin.left - 10)
    .attr("y", d => y(d) + y.bandwidth() / 2)
    .attr("dy", "0.33em")
    .attr("text-anchor", "end")
    .text(d => d.length > 13 ? `${d.slice(0, 12)}…` : d);

  const selected = state.selectedItem;
  const selectedExporter = selected?.exporter;
  const selectedImporter = selected?.importer;

  const cell = svg.append("g")
    .selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("class", d => `matrix-cell ${(+d[metric] || 0) <= 0 ? "is-empty" : ""} ${selectedExporter === d.exporter && selectedImporter === d.importer ? "is-selected" : ""}`)
    .attr("x", d => x(d.importer))
    .attr("y", d => y(d.exporter))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 7)
    .attr("fill", d => (+d[metric] || 0) > 0 ? color(+d[metric] || 0) : "rgba(91,58,38,0.04)")
    .attr("opacity", d => (+d[metric] || 0) > 0 ? 0.96 : 1)
    .on("mousemove", (event, d) => {
      if (!(+d[metric] || 0)) return;
      tooltip.show(event, `
        <b>${d.exporter} → ${d.importer}</b><br/>
        ${metricFormatter(metric)(d[metric])}<br/>
        Trade value: ${formatMoney(d.trade_value_usd)}<br/>
        Net weight: ${formatKg(d.net_weight_kg)}<br/>
        <span>Click to pin this exporter-importer cell.</span>
      `);
    })
    .on("mouseleave", tooltip.hide)
    .on("click", (event, d) => {
      if (!(+d[metric] || 0)) return;
      event.stopPropagation();
      state.onSelectItem?.(d.exemplar || {
        exporter: d.exporter,
        importer: d.importer,
        trade_value_usd: d.trade_value_usd,
        net_weight_kg: d.net_weight_kg,
        [metric]: d[metric],
      });
    });

  const labeledCells = topN(cells.filter(d => +d[metric] > 0), metric, 8);
  svg.append("g")
    .selectAll("text")
    .data(labeledCells)
    .join("text")
    .attr("class", "matrix-cell-label")
    .attr("x", d => x(d.importer) + x.bandwidth() / 2)
    .attr("y", d => y(d.exporter) + y.bandwidth() / 2)
    .attr("dy", "0.33em")
    .text(d => metricFormatter(metric)(d[metric]).replace("US", ""));

  const legendW = 180;
  const legendX = width - margin.right - legendW;
  const legendY = height - 42;
  const gradId = `matrix-gradient-${state.year}-${metric}`;
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("x2", "100%");
  [0, 0.35, 0.68, 1].forEach(t => gradient.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", color(t * maxValue)));

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendW)
    .attr("height", 10)
    .attr("rx", 5)
    .attr("fill", `url(#${gradId})`);
  svg.append("text").attr("class", "matrix-legend-label").attr("x", legendX).attr("y", legendY - 8).text("Low");
  svg.append("text").attr("class", "matrix-legend-label").attr("x", legendX + legendW).attr("y", legendY - 8).attr("text-anchor", "end").text("High");
}
