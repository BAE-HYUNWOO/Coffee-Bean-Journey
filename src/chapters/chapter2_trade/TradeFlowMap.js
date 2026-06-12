import * as d3 from "d3";
import { arcPath, createTooltip, formatKg, formatMoney, metricFormatter, routeKey, topN } from "./utils.js";

let worldGeoPromise = null;

async function loadWorldGeoJSON() {
  if (worldGeoPromise) return worldGeoPromise;
  const base = import.meta.env.BASE_URL || "/";
  const candidates = [
    `${base}data/common/world.geojson`,
    `${base}data/common/world-countries.geojson`,
    `${base}data/world.geojson`,
    `${base}data/chapter3_market/processed/world.geojson`,
    "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
  ];

  worldGeoPromise = (async () => {
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        if (json?.features?.length) return json.features;
      } catch {
        // ignore and try next
      }
    }
    return null;
  })();

  return worldGeoPromise;
}

export function renderTradeFlowMap(container, flows, state) {
  container.selectAll("*").remove();
  const width = 1500;
  const height = 860;
  const metric = state.metric;
  const tooltip = createTooltip(container);

  const data = topN(flows.filter(d => +d.year === +state.year && d.exporter_lat && d.importer_lat), metric, state.flowLimit || 110);
  const selectedKey = routeKey(state.selectedItem);

  const card = container.append("div").attr("class", "viz-card trade-map-card");
  card.append("div").attr("class", "viz-card-title interactive-title").html(`
    <div><span>Global coffee routes</span><small>${state.year} · top ${data.length} bilateral export flows</small></div>
    <div class="viz-help">Wheel to zoom · drag to pan · hover for details</div>
  `);

  const svg = card.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("class", "trade-map-svg");

  const defs = svg.append("defs");
  const glow = defs.append("filter").attr("id", "coffee-route-glow").attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
  glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
  glow.append("feColorMatrix").attr("in", "blur").attr("type", "matrix")
    .attr("values", "0 0 0 0 0.46  0 0 0 0 0.70  0 0 0 0 0.86  0 0 0 0.72 0").attr("result", "colorBlur");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "colorBlur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const projection = d3.geoNaturalEarth1();
  projection.fitExtent([[34, 80], [width - 34, height - 42]], { type: "Sphere" });
  const path = d3.geoPath(projection);

  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 28).attr("class", "map-bg");

  // Full-card interaction surface for blank areas.
  // It must be BELOW the routes/nodes, otherwise it blocks hover tooltips.
  const zoomSurface = svg.append("rect")
    .attr("class", "map-zoom-surface")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("rx", 28)
    .style("fill", "transparent")
    .style("pointer-events", "all");

  // Dedicated viewport: every visible map layer goes inside this group, so d3.zoom
  // can freely update its SVG transform attribute.
  const layer = svg.append("g").attr("class", "map-zoom-layer");
  const landLayer = layer.append("g").attr("class", "map-land-layer");

  const graticule = d3.geoGraticule10();
  layer.append("path").datum({ type: "Sphere" }).attr("d", path).attr("class", "map-sphere");
  layer.append("path").datum(graticule).attr("d", path).attr("class", "map-graticule");

  loadWorldGeoJSON().then((features) => {
    if (!features) return;
    landLayer.selectAll("path")
      .data(features)
      .join("path")
      .attr("class", "map-land")
      .attr("d", path);
  });

  const zoomBehavior = d3.zoom()
    .filter((event) => {
      // Wheel zoom, left-button drag pan, and touch gestures are enabled.
      // Keep right-click/secondary-button drags disabled.
      return event.type === "wheel" || event.type === "mousedown" || event.type === "touchstart" || event.type === "touchmove";
    })
    .wheelDelta((event) => {
      // Responsive wheel zoom; trackpads remain smooth, mouse wheels are not too weak.
      const modeScale = event.deltaMode === 1 ? 0.075 : event.deltaMode ? 1 : 0.0032;
      return -event.deltaY * modeScale;
    })
    .scaleExtent([0.7, 7])
    .translateExtent([[-420, -360], [width + 420, height + 360]])
    .on("zoom", (event) => {
      layer.attr("transform", event.transform);
    });

  svg.call(zoomBehavior).on("dblclick.zoom", null);
  zoomSurface.call(zoomBehavior).on("dblclick.zoom", null);

  svg.on("wheel.mapZoomOnly", (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });

  zoomSurface.on("wheel.mapZoomOnly", (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });

  svg.on("dblclick", () => {
    svg.transition().duration(420).call(zoomBehavior.transform, d3.zoomIdentity);
  });

  const zoomControls = card.append("div").attr("class", "map-zoom-controls");
  zoomControls.append("button")
    .attr("type", "button")
    .attr("class", "map-zoom-button")
    .attr("aria-label", "Zoom in global coffee routes")
    .text("+")
    .on("click", (event) => {
      event.stopPropagation();
      svg.transition().duration(240).call(zoomBehavior.scaleBy, 1.35);
    });

  zoomControls.append("button")
    .attr("type", "button")
    .attr("class", "map-zoom-button")
    .attr("aria-label", "Zoom out global coffee routes")
    .text("−")
    .on("click", (event) => {
      event.stopPropagation();
      svg.transition().duration(240).call(zoomBehavior.scaleBy, 0.74);
    });

  zoomControls.append("button")
    .attr("type", "button")
    .attr("class", "map-zoom-button map-zoom-reset")
    .attr("aria-label", "Reset global coffee routes zoom")
    .text("Reset")
    .on("click", (event) => {
      event.stopPropagation();
      svg.transition().duration(360).call(zoomBehavior.transform, d3.zoomIdentity);
    });

  container.append("div").attr("class", "trade-map-source trade-map-source-outside").html(`
    <span>数据来源：</span>
    <a href="https://comtradeplus.un.org/TradeFlow?Frequency=A&Flows=X&CommodityCodes=0901&Partners=all&Reporters=all&period=recent&AggregateBy=none&BreakdownMode=plus" target="_blank" rel="noopener noreferrer">UN Comtrade Coffee Trade Flow Dataset</a>
  `);


  const valueExtent = d3.extent(data, d => d[metric]);
  const stroke = d3.scaleSqrt().domain(valueExtent[0] === valueExtent[1] ? [0, valueExtent[1] || 1] : valueExtent).range([1.0, 9.8]);
  const opacity = d3.scaleSqrt().domain(valueExtent[0] === valueExtent[1] ? [0, valueExtent[1] || 1] : valueExtent).range([0.18, 0.72]);

  const bundleTotals = d3.rollups(
    data,
    v => ({
      exporter: v[0].exporter,
      exporter_lat: +v[0].exporter_lat,
      exporter_lon: +v[0].exporter_lon,
      value: d3.sum(v, d => +d[metric] || 0),
      destLat: d3.sum(v, d => (+d.importer_lat || 0) * (+d[metric] || 0)) / (d3.sum(v, d => +d[metric] || 0) || 1),
      destLon: d3.sum(v, d => (+d.importer_lon || 0) * (+d[metric] || 0)) / (d3.sum(v, d => +d[metric] || 0) || 1),
      count: v.length,
    }),
    d => d.exporter
  ).map(d => d[1]).sort((a, b) => b.value - a.value).slice(0, 8);

  const bundleWidth = d3.scaleSqrt()
    .domain([0, d3.max(bundleTotals, d => d.value) || 1])
    .range([6, 27]);

  const bundles = layer.append("g").attr("class", "trade-bundles");
  bundles.selectAll("path")
    .data(bundleTotals)
    .join("path")
    .attr("class", "bundle-line")
    .attr("d", d => arcPath(projection, [+d.exporter_lon, +d.exporter_lat], [+d.destLon, +d.destLat]))
    .attr("stroke-width", d => bundleWidth(d.value))
    .attr("opacity", 0.36)
    .attr("filter", "url(#coffee-route-glow)");

  bundles.selectAll("text")
    .data(bundleTotals.slice(0, 5))
    .join("text")
    .attr("class", "bundle-label")
    .attr("x", d => projection([+d.exporter_lon, +d.exporter_lat])?.[0] + 12)
    .attr("y", d => projection([+d.exporter_lon, +d.exporter_lat])?.[1] - 12)
    .text(d => `${d.exporter} hub`);

  const routes = layer.append("g").attr("class", "trade-routes");
  routes.selectAll("path")
    .data(data)
    .join("path")
    .attr("d", d => arcPath(projection, [+d.exporter_lon, +d.exporter_lat], [+d.importer_lon, +d.importer_lat]))
    .attr("class", d => `route-line ${routeKey(d) === selectedKey ? "is-selected" : ""}`)
    .attr("stroke-width", d => stroke(d[metric]))
    .attr("opacity", d => routeKey(d) === selectedKey ? 0.95 : opacity(d[metric]))
    .attr("filter", "url(#coffee-route-glow)")
    .on("mouseenter", function () {
      routes.selectAll("path").classed("is-muted", true);
      d3.select(this).classed("is-muted", false).classed("is-hovered", true).raise();
    })
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.exporter} → ${d.importer}</b><br/>
      ${state.year}<br/>
      ${metricFormatter(metric)(d[metric])}<br/>
      Trade value: ${formatMoney(d.trade_value_usd)}<br/>
      Net weight: ${formatKg(d.net_weight_kg)}<br/>
      <span>Click to pin this route.</span>
    `))
    .on("mouseleave", function () {
      routes.selectAll("path").classed("is-muted", false).classed("is-hovered", false);
      tooltip.hide();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.(d);
    });

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
  const r = d3.scaleSqrt().domain([0, maxTotal]).range([4.2, 25]);

  layer.append("g").attr("class", "country-node-layer").selectAll("circle")
    .data(countries)
    .join("circle")
    .attr("class", d => d.exportValue >= d.importValue ? "country-node exporter-node" : "country-node importer-node")
    .attr("cx", d => projection([+d.lon, +d.lat])?.[0])
    .attr("cy", d => projection([+d.lon, +d.lat])?.[1])
    .attr("r", d => r(d.exportValue + d.importValue))
    .on("mousemove", (event, d) => tooltip.show(event, `
      <b>${d.country}</b><br/>
      Export side: ${metricFormatter(metric)(d.exportValue)}<br/>
      Import side: ${metricFormatter(metric)(d.importValue)}<br/>
      <span>Click to pin this country.</span>
    `))
    .on("mouseleave", tooltip.hide)
    .on("click", (event, d) => {
      event.stopPropagation();
      state.onSelectItem?.({ type: "country", country: d.country, value: d.exportValue + d.importValue, role: d.exportValue >= d.importValue ? "exporter" : "importer", roleLabel: d.exportValue >= d.importValue ? "mainly exporter" : "mainly importer" });
    });

  svg.append("text").attr("x", width - 32).attr("y", height - 24).attr("text-anchor", "end").attr("class", "map-caption").text("Scroll wheel zooms · drag the map to pan · click routes/countries to pin details");

  if (!data.length) {
    svg.append("text")
      .attr("x", width / 2).attr("y", height / 2)
      .attr("text-anchor", "middle").attr("class", "empty-note")
      .text("No bilateral Partner=All flows found yet. Add raw data and run process_trade_data.py.");
  }
}
