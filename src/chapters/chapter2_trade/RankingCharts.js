import * as d3 from "d3";
import { formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

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
  const exporters = topN(aggregateBy(yearFlows, "exporter", metric), metric, 10);
  const importers = topN(aggregateBy(yearFlows, "importer", metric), metric, 10);

  const grid = container.append("div").attr("class", "ranking-grid");
  renderBarCard(grid.append("div"), exporters, {
    title: "Top coffee exporters",
    subtitle: `${state.year} · origin side`,
    key: "name",
    metric,
  });
  renderBarCard(grid.append("div"), importers, {
    title: "Top coffee import markets",
    subtitle: `${state.year} · destination side`,
    key: "name",
    metric,
  });
}

function renderBarCard(container, data, opt) {
  const width = 480;
  const height = 360;
  const margin = { top: 58, right: 24, bottom: 28, left: 156 };
  const card = container.append("div").attr("class", "viz-card ranking-card");
  card.append("div").attr("class", "viz-card-title").html(`<span>${opt.title}</span><small>${opt.subtitle}</small>`);
  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "ranking-svg");
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d[opt.metric]) || 1]).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(data.map(d => d[opt.key])).range([margin.top, height - margin.bottom]).padding(0.25);

  svg.append("g").selectAll("rect")
    .data(data)
    .join("rect")
    .attr("class", "ranking-bar")
    .attr("x", margin.left)
    .attr("y", d => y(d[opt.key]))
    .attr("width", d => Math.max(2, x(d[opt.metric]) - margin.left))
    .attr("height", y.bandwidth());

  svg.append("g").selectAll("text.label")
    .data(data)
    .join("text")
    .attr("class", "ranking-label")
    .attr("x", margin.left - 10)
    .attr("y", d => y(d[opt.key]) + y.bandwidth() / 2)
    .attr("dy", "0.34em")
    .attr("text-anchor", "end")
    .text(d => d[opt.key]);

  svg.append("g").selectAll("text.value")
    .data(data)
    .join("text")
    .attr("class", "ranking-value")
    .attr("x", d => Math.min(x(d[opt.metric]) + 8, width - margin.right))
    .attr("y", d => y(d[opt.key]) + y.bandwidth() / 2)
    .attr("dy", "0.34em")
    .text(d => metricFormatter(opt.metric)(d[opt.metric]));

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note").text("No ranking data yet.");
  }
}
