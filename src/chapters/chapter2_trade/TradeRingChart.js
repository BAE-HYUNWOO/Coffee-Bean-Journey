import * as d3 from "d3";
import { createTooltip, formatKg, formatMoney, metricFormatter, routeKey, topN } from "./utils.js";

function aggregateCountryTotals(flows, metric) {
  const totals = new Map();
  flows.forEach(d => {
    if (!d.exporter || !d.importer) return;
    const exporter = totals.get(d.exporter) || { country: d.exporter, exportValue: 0, importValue: 0, value: 0 };
    exporter.exportValue += +d[metric] || 0;
    exporter.value += +d[metric] || 0;
    totals.set(d.exporter, exporter);

    const importer = totals.get(d.importer) || { country: d.importer, exportValue: 0, importValue: 0, value: 0 };
    importer.importValue += +d[metric] || 0;
    importer.value += +d[metric] || 0;
    totals.set(d.importer, importer);
  });
  return [...totals.values()].sort((a, b) => b.value - a.value);
}

function polarToCartesian(cx, cy, r, angle) {
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
}

function ribbonPath(source, target, cx, cy) {
  const [sx, sy] = polarToCartesian(cx, cy, source.r, source.angle);
  const [tx, ty] = polarToCartesian(cx, cy, target.r, target.angle);
  const mx = cx + Math.cos((source.angle + target.angle) / 2) * 48;
  const my = cy + Math.sin((source.angle + target.angle) / 2) * 48;
  return `M ${sx} ${sy} C ${mx} ${my}, ${mx} ${my}, ${tx} ${ty}`;
}

export function renderTradeRingChart(container, flows, state) {
  container.selectAll("*").remove();
  // The ring is usually rendered in a wide but not very tall card.
  // Keep the SVG aspect ratio flatter and the radius smaller so the ring
  // stays inside the card instead of being clipped at the top/left.
  const width = 980;
  const height = 660;
  const cx = width / 2;
  const cy = height / 2 + 18;
  const outerR = Math.min(width, height) * 0.35;
  const innerR = outerR - 18;
  const metric = state.metric;
  const tooltip = createTooltip(container);
  const selectedKey = routeKey(state.selectedItem);

  const yearFlows = flows.filter(d => +d.year === +state.year && d.exporter && d.importer);
  const countries = aggregateCountryTotals(yearFlows, metric).slice(0, 24);
  const keep = new Set(countries.map(d => d.country));
  const links = topN(yearFlows.filter(d => keep.has(d.exporter) && keep.has(d.importer)), metric, Math.min(state.flowLimit || 90, 120));

  const card = container.append("div").attr("class", "viz-card trade-ring-card");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Coffee trade ring</span><small>${state.year} · circular exporter-importer corridors</small></div>
    <div class="viz-help">Hover to isolate · click ring or ribbon to pin</div>
  `);

  const svg = card.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("class", "trade-ring-svg");
  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 26).attr("class", "trade-ring-bg");

  if (!countries.length || !links.length) {
    svg.append("text")
      .attr("x", width / 2).attr("y", height / 2)
      .attr("text-anchor", "middle").attr("class", "empty-note")
      .text("Trade ring needs bilateral exporter-importer rows.");
    return;
  }

  svg.append("circle").attr("class", "ring-radial-grid").attr("cx", cx).attr("cy", cy).attr("r", outerR + 28);
  svg.append("circle").attr("class", "ring-radial-grid").attr("cx", cx).attr("cy", cy).attr("r", innerR - 58);

  const pie = d3.pie()
    .value(d => Math.max(1, d.value))
    .sort(null)
    .padAngle(0.012);
  const arcData = pie(countries);
  const countryMeta = new Map();
  arcData.forEach(d => {
    const angle = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
    countryMeta.set(d.data.country, { ...d.data, angle, r: innerR - 8, startAngle: d.startAngle, endAngle: d.endAngle });
  });

  const color = d3.scaleLinear()
    .domain([0, countries.length - 1])
    .range([0, 1]);
  const palette = t => d3.interpolateRgbBasis(["#6f95a8", "#d8a566", "#7b5b43", "#8fa47d"])(color(t));
  const arc = d3.arc().innerRadius(innerR).outerRadius(outerR);

  const linkWidth = d3.scaleSqrt().domain([0, d3.max(links, d => +d[metric] || 0) || 1]).range([0.9, 8]);
  const linkLayer = svg.append("g").attr("class", "ring-links");
  const arcLayer = svg.append("g").attr("transform", `translate(${cx},${cy})`);
  const labelLayer = svg.append("g").attr("class", "ring-labels");

  const linkSel = linkLayer.selectAll("path")
    .data(links)
    .join("path")
    .attr("class", d => `ring-link ${routeKey(d) === selectedKey ? "is-selected" : ""}`)
    .attr("d", d => {
      const source = countryMeta.get(d.exporter);
      const target = countryMeta.get(d.importer);
      if (!source || !target) return "";
      return ribbonPath(source, target, cx, cy);
    })
    .attr("stroke", d => {
      const i = countries.findIndex(c => c.country === d.exporter);
      return i >= 0 ? palette(i) : "#8ea6b5";
    })
    .attr("stroke-width", d => linkWidth(+d[metric] || 0))
    .attr("opacity", d => routeKey(d) === selectedKey ? 0.92 : 0.20)
    .on("mouseenter", function (event, d) {
      linkSel.classed("is-muted", true);
      arcSel.classed("is-active", a => a.data.country === d.exporter || a.data.country === d.importer);
      d3.select(this).classed("is-muted", false).classed("is-hovered", true).raise();
      tooltip.show(event, `
        <b>${d.exporter} → ${d.importer}</b><br/>
        ${metricFormatter(metric)(d[metric])}<br/>
        Trade value: ${formatMoney(d.trade_value_usd)}<br/>
        Net weight: ${formatKg(d.net_weight_kg)}<br/>
        <span>Click to pin this corridor.</span>
      `);
    })
    .on("mouseleave", function () {
      linkSel.classed("is-muted", false).classed("is-hovered", false);
      arcSel.classed("is-active", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d);
    });

  const arcSel = arcLayer.selectAll("path")
    .data(arcData)
    .join("path")
    .attr("class", "ring-country-arc")
    .attr("d", arc)
    .attr("stroke", (_, i) => palette(i))
    .attr("stroke-width", 13)
    .attr("fill", "none")
    .attr("opacity", 0.82)
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.data.country}</b><br/>
      Total visible flow: ${metricFormatter(metric)(d.data.value)}<br/>
      Export side: ${metricFormatter(metric)(d.data.exportValue)}<br/>
      Import side: ${metricFormatter(metric)(d.data.importValue)}<br/>
      <span>Click to pin this country.</span>
    `))
    .on("mouseleave", tooltip.hide)
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.({
        type: "country",
        country: d.data.country,
        value: d.data.value,
        role: d.data.exportValue >= d.data.importValue ? "exporter" : "importer",
        roleLabel: d.data.exportValue >= d.data.importValue ? "trade ring exporter hub" : "trade ring import hub",
      });
    });

  labelLayer.selectAll("text")
    .data(arcData)
    .join("text")
    .attr("class", "ring-country-label")
    .attr("x", d => {
      const a = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
      return cx + Math.cos(a) * (outerR + 24);
    })
    .attr("y", d => {
      const a = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
      return cy + Math.sin(a) * (outerR + 24);
    })
    .attr("text-anchor", d => {
      const a = (d.startAngle + d.endAngle) / 2;
      return a < Math.PI ? "start" : "end";
    })
    .attr("dy", "0.33em")
    .text(d => d.data.country.length > 13 ? `${d.data.country.slice(0, 12)}…` : d.data.country);

  svg.append("text").attr("class", "ring-center-label").attr("x", cx).attr("y", cy - 8).text("Trade ring");
  svg.append("text").attr("class", "ring-center-note").attr("x", cx).attr("y", cy + 16).text("directional corridors between top hubs");
}
