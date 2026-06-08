import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

function aggregateBy(data, key, metric) {
  return d3.rollups(data, v => ({
    name: v[0][key],
    trade_value_usd: d3.sum(v, d => d.trade_value_usd),
    net_weight_kg: d3.sum(v, d => d.net_weight_kg),
  }), d => d[key]).map(d => d[1]).sort((a,b)=>b[metric]-a[metric]);
}

export function renderRankingCharts(container, flows, state) {
  container.selectAll("*").remove();
  const metric = state.metric;
  const yearFlows = flows.filter(d => +d.year === +state.year);
  const exporters = topN(aggregateBy(yearFlows, "exporter", metric), metric, 8);
  const importers = topN(aggregateBy(yearFlows, "importer", metric), metric, 8);

  const grid = container.append("div").attr("class", "ranking-grid");
  renderBarCard(grid.append("div"), exporters, {
    title: "Top coffee exporters",
    subtitle: `${state.year} · origin side · click bars to pin`,
    key: "name",
    metric,
    role: "exporter",
    state,
  });
  renderBarCard(grid.append("div"), importers, {
    title: "Top coffee import markets",
    subtitle: `${state.year} · destination side · click bars to pin`,
    key: "name",
    metric,
    role: "importer",
    state,
  });
}

function renderBarCard(container, data, opt) {
  const width = 520;
  const height = 300;
  const margin = { top: 54, right: 30, bottom: 26, left: 160 };
  const tooltip = createTooltip(container);
  const card = container.append("div").attr("class", "viz-card ranking-card compact-card");
  card.append("div").attr("class", "viz-card-title").html(`<span>${opt.title}</span><small>${opt.subtitle}</small>`);
  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "ranking-svg");
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d[opt.metric]) || 1]).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(data.map(d => d[opt.key])).range([margin.top, height - margin.bottom]).padding(0.28);

  const rows = svg.append("g").selectAll("g")
    .data(data)
    .join("g")
    .attr("class", "ranking-row")
    .on("mouseenter", function () { d3.select(this).classed("is-hovered", true); })
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d[opt.key]}</b><br/>
      ${metricFormatter(opt.metric)(d[opt.metric])}<br/>
      Trade value: ${formatMoney(d.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.net_weight_kg)}<br/>
      <span>Click to pin this country.</span>
    `))
    .on("mouseleave", function () { d3.select(this).classed("is-hovered", false); tooltip.hide(); })
    .on("click", (event, d) => {
      event.stopPropagation();
      opt.state?.onSelectItem?.({ type: "country", country: d[opt.key], value: d[opt.metric], role: opt.role, roleLabel: opt.role === "exporter" ? "top exporter" : "top import market" });
    });

  rows.append("rect")
    .attr("class", "ranking-bar-bg")
    .attr("x", margin.left)
    .attr("y", d => y(d[opt.key]))
    .attr("width", width - margin.left - margin.right)
    .attr("height", y.bandwidth());

  rows.append("rect")
    .attr("class", "ranking-bar")
    .attr("x", margin.left)
    .attr("y", d => y(d[opt.key]))
    .attr("width", d => Math.max(2, x(d[opt.metric]) - margin.left))
    .attr("height", y.bandwidth());

  rows.append("text")
    .attr("class", "ranking-label")
    .attr("x", margin.left - 10)
    .attr("y", d => y(d[opt.key]) + y.bandwidth() / 2)
    .attr("dy", "0.34em")
    .attr("text-anchor", "end")
    .text(d => d[opt.key]);

  rows.append("text")
    .attr("class", "ranking-value")
    .attr("x", d => Math.min(x(d[opt.metric]) + 8, width - margin.right))
    .attr("y", d => y(d[opt.key]) + y.bandwidth() / 2)
    .attr("dy", "0.34em")
    .text(d => metricFormatter(opt.metric)(d[opt.metric]));

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note").text("No ranking data yet.");
  }
}
