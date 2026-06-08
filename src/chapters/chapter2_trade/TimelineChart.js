import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter } from "./utils.js";

export function renderTimelineChart(container, flows, state, onYearChange) {
  container.selectAll("*").remove();
  const width = 1520;
  const height = 470;
  const margin = { top: 78, right: 54, bottom: 64, left: 106 };
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = d3.rollups(flows, v => ({
    year: +v[0].year,
    trade_value_usd: d3.sum(v, d => d.trade_value_usd),
    net_weight_kg: d3.sum(v, d => d.net_weight_kg),
    flows: v.length,
  }), d => +d.year).map(d => d[1]).sort((a,b)=>a.year-b.year);

  const card = container.append("div").attr("class", "viz-card timeline-card compact-card");
  card.append("div").attr("class", "viz-card-title").html(`<span>Recent-period trajectory</span><small>Hover values · click a point to update</small>`);
  const svg = card.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "timeline-svg");

  if (!data.length) {
    svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("class", "empty-note").text("Run process_trade_data.py to build year summary.");
    return;
  }

  const x = d3.scalePoint().domain(data.map(d => d.year)).range([margin.left, width - margin.right]).padding(0.28);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d[metric]) || 1]).nice().range([height - margin.bottom, margin.top]);

  const area = d3.area()
    .x(d => x(d.year))
    .y0(height - margin.bottom)
    .y1(d => y(d[metric]))
    .curve(d3.curveCatmullRom.alpha(0.5));
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d[metric]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  svg.append("g").attr("class", "timeline-grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
    .call(g => g.select(".domain").remove());
  svg.append("path").datum(data).attr("class", "timeline-area").attr("d", area);
  svg.append("path").datum(data).attr("class", "timeline-line").attr("d", line);
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).attr("class", "timeline-axis").call(d3.axisBottom(x).tickSizeOuter(0));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).attr("class", "timeline-axis").call(d3.axisLeft(y).ticks(5).tickFormat(d => metric === "net_weight_kg" ? formatKg(d).replace(" kg", "") : formatMoney(d))).call(g => g.select(".domain").remove());

  svg.append("g").selectAll("circle")
    .data(data)
    .join("circle")
    .attr("class", d => +d.year === +state.year ? "timeline-dot active" : "timeline-dot")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d[metric]))
    .attr("r", d => +d.year === +state.year ? 9 : 5.5)
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.year}</b><br/>
      ${metricFormatter(metric)(d[metric])}<br/>
      Bilateral flows: ${d.flows.toLocaleString()}<br/>
      <span>Click to switch year.</span>
    `))
    .on("mouseleave", tooltip.hide)
    .on("click", (event, d) => onYearChange(d.year));

  const active = data.find(d => +d.year === +state.year) || data.at(-1);
  svg.append("text").attr("x", width - margin.right).attr("y", margin.top - 22).attr("text-anchor", "end").attr("class", "timeline-current")
    .text(`${active.year}: ${metricFormatter(metric)(active[metric])}`);
}
