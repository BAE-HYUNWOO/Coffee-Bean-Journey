import * as d3 from "d3";
import { arcPath, createTooltip, formatKg, formatMoney, metricFormatter, topN } from "./utils.js";

export function renderTradeFlowMap(container, flows, state) {
  container.selectAll("*").remove();
  const width = 980;
  const height = 560;
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = topN(flows.filter(d => +d.year === +state.year && d.exporter_lat && d.importer_lat), metric, state.flowLimit || 90);

  const card = container.append("div").attr("class", "viz-card trade-map-card");
  card.append("div").attr("class", "viz-card-title").html(`
    <span>Global coffee routes</span>
    <small>${state.year} · top ${data.length} bilateral export flows</small>
  `);

  const svg = card.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "trade-map-svg");

  const defs = svg.append("defs");
  const glow = defs.append("filter").attr("id", "coffee-route-glow").attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
  glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
  glow.append("feColorMatrix").attr("in", "blur").attr("type", "matrix")
    .attr("values", "1 0 0 0 0.95  0 1 0 0 0.55  0 0 1 0 0.16  0 0 0 0.85 0").attr("result", "colorBlur");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "colorBlur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const projection = d3.geoNaturalEarth1().scale(178).translate([width / 2, height / 2 + 18]);
  const path = d3.geoPath(projection);

  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "map-bg");

  const graticule = d3.geoGraticule10();
  svg.append("path").datum({ type: "Sphere" }).attr("d", path).attr("class", "map-sphere");
  svg.append("path").datum(graticule).attr("d", path).attr("class", "map-graticule");

  const valueExtent = d3.extent(data, d => d[metric]);
  const stroke = d3.scaleSqrt().domain(valueExtent[0] === valueExtent[1] ? [0, valueExtent[1] || 1] : valueExtent).range([0.8, 8]);
  const opacity = d3.scaleSqrt().domain(valueExtent[0] === valueExtent[1] ? [0, valueExtent[1] || 1] : valueExtent).range([0.18, 0.78]);

  const routes = svg.append("g").attr("class", "trade-routes");
  routes.selectAll("path")
    .data(data)
    .join("path")
    .attr("d", d => arcPath(projection, [+d.exporter_lon, +d.exporter_lat], [+d.importer_lon, +d.importer_lat]))
    .attr("class", "route-line")
    .attr("stroke-width", d => stroke(d[metric]))
    .attr("opacity", d => opacity(d[metric]))
    .attr("filter", "url(#coffee-route-glow)")
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.exporter} → ${d.importer}</b><br/>
      ${state.year}<br/>
      Trade value: ${formatMoney(d.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.net_weight_kg)}
    `))
    .on("mouseleave", tooltip.hide);

  const countryTotals = new Map();
  data.forEach(d => {
    const e = countryTotals.get(d.exporter) || { country: d.exporter, lat: d.exporter_lat, lon: d.exporter_lon, exportValue: 0, importValue: 0 };
    e.exportValue += d[metric];
    countryTotals.set(d.exporter, e);
    const i = countryTotals.get(d.importer) || { country: d.importer, lat: d.importer_lat, lon: d.importer_lon, exportValue: 0, importValue: 0 };
    i.importValue += d[metric];
    countryTotals.set(d.importer, i);
  });
  const countries = [...countryTotals.values()];
  const maxTotal = d3.max(countries, d => d.exportValue + d.importValue) || 1;
  const r = d3.scaleSqrt().domain([0, maxTotal]).range([2.5, 14]);

  svg.append("g").selectAll("circle")
    .data(countries)
    .join("circle")
    .attr("class", d => d.exportValue >= d.importValue ? "country-node exporter-node" : "country-node importer-node")
    .attr("cx", d => projection([+d.lon, +d.lat])?.[0])
    .attr("cy", d => projection([+d.lon, +d.lat])?.[1])
    .attr("r", d => r(d.exportValue + d.importValue))
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.country}</b><br/>
      Export side: ${metricFormatter(metric)(d.exportValue)}<br/>
      Import side: ${metricFormatter(metric)(d.importValue)}
    `))
    .on("mouseleave", tooltip.hide);

  svg.append("text").attr("x", 28).attr("y", 44).attr("class", "map-label").text("Coffee moves from tropical producers to high-consumption markets");
  svg.append("text").attr("x", width - 28).attr("y", height - 28).attr("text-anchor", "end").attr("class", "map-caption").text("HS0901 · UN Comtrade · exports · recent annual periods");

  if (!data.length) {
    svg.append("text")
      .attr("x", width / 2).attr("y", height / 2)
      .attr("text-anchor", "middle").attr("class", "empty-note")
      .text("No bilateral Partner=All flows found yet. Add raw data and run process_trade_data.py.");
  }
}
