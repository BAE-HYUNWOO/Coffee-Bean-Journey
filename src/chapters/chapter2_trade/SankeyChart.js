import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, routeKey, topN } from "./utils.js";

function renderMiniRanking(svg, items, opt) {
  const { x, y, width, title, metric, role, state, tooltip } = opt;
  const height = 190;
  const labelW = 118;
  const valueW = 74;
  const barH = 15;
  const rowGap = 7;
  const max = d3.max(items, d => d[1]) || 1;
  const xScale = d3.scaleLinear().domain([0, max]).range([0, width - labelW - valueW - 18]);

  const g = svg.append("g").attr("class", "sankey-mini-ranking").attr("transform", `translate(${x},${y})`);
  g.append("text")
    .attr("class", "sankey-ranking-title")
    .attr("x", 0)
    .attr("y", 0)
    .text(title);
  g.append("text")
    .attr("class", "sankey-ranking-note")
    .attr("x", width)
    .attr("y", 0)
    .attr("text-anchor", "end")
    .text("same totals as ranking cards");

  const rows = g.selectAll("g.sankey-mini-row")
    .data(items)
    .join("g")
    .attr("class", "sankey-mini-row")
    .attr("transform", (_, i) => `translate(0,${26 + i * (barH + rowGap)})`)
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d[0]}</b><br/>
      ${metricFormatter(metric)(d[1])}<br/>
      <span>Click to pin this country.</span>
    `))
    .on("mouseleave", tooltip.hide)
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.({
        type: "country",
        country: d[0],
        value: d[1],
        role,
        roleLabel: role === "exporter" ? "top exporter" : "top import market",
      });
    });

  rows.append("text")
    .attr("class", "sankey-mini-label")
    .attr("x", labelW - 8)
    .attr("y", barH / 2)
    .attr("dy", "0.34em")
    .attr("text-anchor", "end")
    .text(d => d[0]);

  rows.append("rect")
    .attr("class", "sankey-mini-bar-bg")
    .attr("x", labelW)
    .attr("y", 0)
    .attr("width", width - labelW - valueW)
    .attr("height", barH)
    .attr("rx", 8);

  rows.append("rect")
    .attr("class", "sankey-mini-bar")
    .attr("x", labelW)
    .attr("y", 0)
    .attr("width", d => Math.max(5, xScale(d[1])))
    .attr("height", barH)
    .attr("rx", 8);

  rows.append("text")
    .attr("class", "sankey-mini-value")
    .attr("x", d => Math.min(labelW + xScale(d[1]) + 8, width - valueW + 4))
    .attr("y", barH / 2)
    .attr("dy", "0.34em")
    .text(d => metricFormatter(metric)(d[1]));

  return height;
}

export function renderSankeyChart(container, flows, state) {
  container.selectAll("*").remove();
  const width = 960;
  const height = 720;
  const margin = { top: 78, right: 172, bottom: 250, left: 172 };
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
    <div><span>Exporters → importers</span><small>${state.year} · Sankey ribbons + top exporter/importer totals</small></div>
    <div class="viz-help">Hover to isolate · click a ribbon or bar to pin</div>
  `);

  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "sankey-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "sankey-bg");

  if (!allYearData.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Sankey needs partner-level rows. In UN Comtrade, set Partners = All.");
    return;
  }

  const exporterTotals = d3.rollups(allYearData, v => d3.sum(v, d => d[metric]), d => d.exporter)
    .sort((a,b)=>b[1]-a[1]);
  const importerTotals = d3.rollups(allYearData, v => d3.sum(v, d => d[metric]), d => d.importer)
    .sort((a,b)=>b[1]-a[1]);
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
  const yLeft = d3.scalePoint().domain([...exporters]).range([margin.top + 10, sankeyBottom]).padding(0.55);
  const yRight = d3.scalePoint().domain([...importers]).range([margin.top + 10, sankeyBottom]).padding(0.55);
  const xLeft = margin.left;
  const xRight = width - margin.right;

  const totalsLeft = new Map(topExporters);
  const totalsRight = new Map(topImporters);
  const totalMax = d3.max([...totalsLeft.values(), ...totalsRight.values()]) || 1;
  const barWidth = d3.scaleLinear().domain([0, totalMax]).range([18, 88]);
  const stroke = d3.scaleSqrt().domain([0, d3.max(links, d => d[metric]) || 1]).range([1.4, 11.5]);

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
      const c1 = xLeft + 190;
      const c2 = xRight - 190;
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

  const rankY = height - 210;
  renderMiniRanking(svg, exporterTotals.slice(0, 8), {
    x: 34,
    y: rankY,
    width: 420,
    title: "Top coffee exporters",
    metric,
    role: "exporter",
    state,
    tooltip,
  });
  renderMiniRanking(svg, importerTotals.slice(0, 8), {
    x: width - 454,
    y: rankY,
    width: 420,
    title: "Top coffee import markets",
    metric,
    role: "importer",
    state,
    tooltip,
  });
}
