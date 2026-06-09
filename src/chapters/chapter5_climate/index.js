import * as d3 from "d3";
import { showTooltip, hideTooltip } from "../../shared/tooltip.js";
import "./style.css";

const BASE = import.meta.env.BASE_URL || "/";
const GRID_DATA_URLS = [
  `${BASE}data/chapter5_climate/processed/d3_ready_grid.csv`,
  `${BASE}chapter5_climate_standalone/%E6%95%B0%E6%8D%AE/d3_ready_grid.csv`,
  `${BASE}chapter5_climate_standalone/数据/d3_ready_grid.csv`,
];
const SCATTER_DATA_URLS = [
  `${BASE}data/chapter5_climate/processed/d3_ready_scatter.csv`,
  `${BASE}chapter5_climate_standalone/%E6%95%B0%E6%8D%AE/d3_ready_scatter.csv`,
  `${BASE}chapter5_climate_standalone/数据/d3_ready_scatter.csv`,
];
const WORLD_URLS = [
  `${BASE}data/common/world.geojson`,
  `${BASE}chapter5_climate_standalone/world.geojson`,
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
];

const COUNTRY_COORDS = {
  "巴西": [-55, -10],
  "越南": [108, 14],
  "哥伦比亚": [-73, 4],
  "印度尼西亚": [115, -2],
  "埃塞俄比亚": [39, 9],
};

const COUNTRY_EN = {
  "巴西": "Brazil",
  "越南": "Vietnam",
  "哥伦比亚": "Colombia",
  "印度尼西亚": "Indonesia",
  "埃塞俄比亚": "Ethiopia",
};

const safeNum = (value, fallback = 0) => {
  const n = +value;
  return Number.isFinite(n) ? n : fallback;
};

const compact = (value) => {
  const n = safeNum(value);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return d3.format(",")(Math.round(n));
};

async function loadFirst(urls, loader) {
  let lastError;
  for (const url of urls) {
    try {
      const data = await loader(url);
      if (data && (!Array.isArray(data) || data.length)) return data;
    } catch (err) {
      lastError = err;
      console.warn(`[Chapter 5] Failed to load ${url}`, err);
    }
  }
  throw lastError || new Error("No Chapter 5 data source could be loaded.");
}

async function loadChapter5Data() {
  const [grid, scatter, world] = await Promise.all([
    loadFirst(GRID_DATA_URLS, d3.csv),
    loadFirst(SCATTER_DATA_URLS, d3.csv),
    loadFirst(WORLD_URLS, d3.json).catch(() => null),
  ]);

  const gridData = grid.map(d => ({
    lon: safeNum(d.lon),
    lat: safeNum(d.lat),
    hist_temp: safeNum(d.hist_temp),
    future_temp: safeNum(d.future_temp),
    temp_diff: safeNum(d.temp_diff),
    hist_suit: safeNum(d.hist_suit),
    future_suit: safeNum(d.future_suit),
  })).filter(d => Number.isFinite(d.lon) && Number.isFinite(d.lat));

  const scatterData = scatter.map(d => ({
    Country: d.Country,
    countryEn: COUNTRY_EN[d.Country] || d.Country,
    Production_tonnes: safeNum(d.Production_tonnes ?? d.production ?? d.Production),
    Hist_Temp: safeNum(d.Hist_Temp),
    Future_Temp: safeNum(d.Future_Temp),
    Temp_Rise: safeNum(d.Temp_Rise),
    coords: COUNTRY_COORDS[d.Country],
  })).filter(d => d.Country && d.coords);

  return { gridData, scatterData, world };
}

function makeCard(parent, { id, tag, title, subtitle, className = "" }) {
  const card = parent.append("section").attr("class", `climate-card ${className}`.trim());
  const head = card.append("div").attr("class", "climate-card-head");
  head.append("div").html(`<span>${tag}</span><h4>${title}</h4>`);
  if (subtitle) head.append("p").text(subtitle);
  card.append("div").attr("id", id).attr("class", "climate-chart-body");
  return card;
}

function addWorld(svg, world, projection, path) {
  const layer = svg.append("g").attr("class", "climate-world-layer");
  svg.append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "climate-graticule")
    .attr("d", path);

  if (world?.features?.length) {
    layer.selectAll("path")
      .data(world.features)
      .join("path")
      .attr("class", "climate-land")
      .attr("d", path);
  } else {
    svg.append("text")
      .attr("x", 22)
      .attr("y", 28)
      .attr("class", "climate-small-note")
      .text("World base map unavailable; climate points still rendered.");
  }
}

function makeProjection(width, height, world) {
  const projection = d3.geoEquirectangular();
  const geo = world?.features?.length ? world : { type: "Sphere" };
  projection.fitExtent([[18, 18], [width - 18, height - 18]], geo);
  return projection;
}

function drawRiskMap(selector, { gridData, world }) {
  const el = document.querySelector(selector);
  const width = Math.max(720, el.clientWidth || 900);
  const height = 470;
  const svg = d3.select(el).html("").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const projection = makeProjection(width, height, world);
  const path = d3.geoPath(projection);
  const tempExtent = d3.extent(gridData, d => d.temp_diff);
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain(tempExtent);
  const sample = gridData.filter((_, i) => i % 1 === 0);

  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 28).attr("class", "climate-map-bg");
  addWorld(svg, world, projection, path);

  svg.append("g")
    .attr("class", "climate-risk-points")
    .selectAll("circle")
    .data(sample)
    .join("circle")
    .attr("cx", d => projection([d.lon, d.lat])?.[0])
    .attr("cy", d => projection([d.lon, d.lat])?.[1])
    .attr("r", 1.25)
    .attr("fill", d => color(d.temp_diff))
    .attr("opacity", 0.62)
    .on("mouseenter", (event, d) => showTooltip(`<strong>Projected warming</strong>${d.temp_diff.toFixed(1)}°C<br/>Now: ${d.hist_temp.toFixed(1)}°C · Future: ${d.future_temp.toFixed(1)}°C`, event))
    .on("mousemove", (event, d) => showTooltip(`<strong>Projected warming</strong>${d.temp_diff.toFixed(1)}°C<br/>Now: ${d.hist_temp.toFixed(1)}°C · Future: ${d.future_temp.toFixed(1)}°C`, event))
    .on("mouseleave", hideTooltip);

  const legendW = 240;
  const legendX = width - legendW - 34;
  const legendY = 32;
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "climate-risk-gradient");
  d3.range(0, 1.01, 0.1).forEach(t => grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", color(tempExtent[0] + t * (tempExtent[1] - tempExtent[0]))));
  svg.append("text").attr("x", legendX).attr("y", legendY - 8).attr("class", "climate-legend-title").text("Temperature rise");
  svg.append("rect").attr("x", legendX).attr("y", legendY).attr("width", legendW).attr("height", 12).attr("rx", 6).attr("fill", "url(#climate-risk-gradient)");
  svg.append("text").attr("x", legendX).attr("y", legendY + 30).attr("class", "climate-legend-label").text(`${tempExtent[0].toFixed(1)}°C`);
  svg.append("text").attr("x", legendX + legendW).attr("y", legendY + 30).attr("text-anchor", "end").attr("class", "climate-legend-label").text(`${tempExtent[1].toFixed(1)}°C`);
}

function drawSuitabilityMap(selector, { gridData, world }) {
  const el = document.querySelector(selector);
  const width = Math.max(720, el.clientWidth || 900);
  const height = 470;
  const root = d3.select(el).html("");
  const controls = root.append("div").attr("class", "climate-toggle-row");
  controls.append("button").attr("class", "active").attr("data-mode", "current").text("Current");
  controls.append("button").attr("data-mode", "future").text("2050 projection");
  controls.append("span").text("Green = suitable · copper = lost · blue = newly suitable");

  const svg = root.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const projection = makeProjection(width, height, world);
  const path = d3.geoPath(projection);
  const filtered = gridData.filter(d => d.hist_suit || d.future_suit);

  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 28).attr("class", "climate-map-bg pale");
  addWorld(svg, world, projection, path);

  const points = svg.append("g")
    .selectAll("circle")
    .data(filtered)
    .join("circle")
    .attr("cx", d => projection([d.lon, d.lat])?.[0])
    .attr("cy", d => projection([d.lon, d.lat])?.[1])
    .attr("r", 2)
    .attr("class", "suitability-point")
    .on("mouseenter", (event, d) => showTooltip(`<strong>Coffee suitability</strong>Now: ${d.hist_suit ? "suitable" : "not suitable"}<br/>2050: ${d.future_suit ? "suitable" : "not suitable"}<br/>Temperature change: ${d.temp_diff.toFixed(1)}°C`, event))
    .on("mousemove", (event, d) => showTooltip(`<strong>Coffee suitability</strong>Now: ${d.hist_suit ? "suitable" : "not suitable"}<br/>2050: ${d.future_suit ? "suitable" : "not suitable"}<br/>Temperature change: ${d.temp_diff.toFixed(1)}°C`, event))
    .on("mouseleave", hideTooltip);

  const applyMode = (mode) => {
    controls.selectAll("button").classed("active", function () { return this.dataset.mode === mode; });
    points.transition().duration(550)
      .attr("opacity", d => mode === "current"
        ? (d.hist_suit ? 0.78 : 0)
        : (d.hist_suit || d.future_suit ? 0.78 : 0))
      .attr("fill", d => {
        if (mode === "current") return "#5f8d63";
        if (d.hist_suit && d.future_suit) return "#5f8d63";
        if (d.hist_suit && !d.future_suit) return "#c87948";
        return "#719db4";
      });
  };

  controls.selectAll("button").on("click", function () { applyMode(this.dataset.mode); });
  applyMode("current");
}

function drawDumbbell(selector, { scatterData }) {
  const el = document.querySelector(selector);
  const width = Math.max(560, el.clientWidth || 640);
  const height = 370;
  const margin = { top: 26, right: 42, bottom: 42, left: 118 };
  const svg = d3.select(el).html("").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const data = [...scatterData].sort((a, b) => b.Production_tonnes - a.Production_tonnes);
  const x = d3.scaleLinear()
    .domain([d3.min(data, d => Math.min(d.Hist_Temp, d.Future_Temp)) - 1, d3.max(data, d => Math.max(d.Hist_Temp, d.Future_Temp)) + 1])
    .nice()
    .range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(data.map(d => d.countryEn)).range([margin.top, height - margin.bottom]).padding(0.62);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}°C`)).call(g => g.select(".domain").remove());
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
  svg.append("g").attr("class", "climate-gridlines").selectAll("line").data(x.ticks(6)).join("line").attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", margin.top - 10).attr("y2", height - margin.bottom);

  svg.append("g").selectAll("line.connector").data(data).join("line")
    .attr("class", "climate-dumbbell-connector")
    .attr("x1", d => x(d.Hist_Temp)).attr("x2", d => x(d.Future_Temp))
    .attr("y1", d => y(d.countryEn) + y.bandwidth()/2).attr("y2", d => y(d.countryEn) + y.bandwidth()/2);

  ["Hist_Temp", "Future_Temp"].forEach((key) => {
    svg.append("g").selectAll("circle").data(data).join("circle")
      .attr("class", `climate-temp-dot ${key === "Hist_Temp" ? "hist" : "future"}`)
      .attr("cx", d => x(d[key]))
      .attr("cy", d => y(d.countryEn) + y.bandwidth()/2)
      .attr("r", 7)
      .on("mouseenter", (event, d) => showTooltip(`<strong>${d.countryEn}</strong>${key === "Hist_Temp" ? "Current" : "Future"}: ${d[key].toFixed(1)}°C<br/>Rise: ${d.Temp_Rise.toFixed(1)}°C`, event))
      .on("mousemove", (event, d) => showTooltip(`<strong>${d.countryEn}</strong>${key === "Hist_Temp" ? "Current" : "Future"}: ${d[key].toFixed(1)}°C<br/>Rise: ${d.Temp_Rise.toFixed(1)}°C`, event))
      .on("mouseleave", hideTooltip);
  });

  svg.append("text").attr("x", width - margin.right).attr("y", 22).attr("text-anchor", "end").attr("class", "climate-small-note").text("Blue = current · copper = 2050");
}

function drawBubbleMap(selector, { scatterData, world }) {
  const el = document.querySelector(selector);
  const width = Math.max(560, el.clientWidth || 640);
  const height = 370;
  const svg = d3.select(el).html("").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const projection = makeProjection(width, height, world);
  const path = d3.geoPath(projection);
  const size = d3.scaleSqrt().domain([0, d3.max(scatterData, d => d.Production_tonnes) || 1]).range([8, 34]);
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain(d3.extent(scatterData, d => d.Temp_Rise));

  svg.append("rect").attr("width", width).attr("height", height).attr("rx", 24).attr("class", "climate-map-bg pale");
  addWorld(svg, world, projection, path);

  const nodes = svg.append("g").selectAll("g")
    .data(scatterData)
    .join("g")
    .attr("transform", d => `translate(${projection(d.coords)})`)
    .attr("class", "climate-production-node")
    .on("mouseenter", (event, d) => showTooltip(`<strong>${d.countryEn}</strong>Production: ${compact(d.Production_tonnes)} t<br/>Current: ${d.Hist_Temp.toFixed(1)}°C · Future: ${d.Future_Temp.toFixed(1)}°C<br/>Rise: ${d.Temp_Rise.toFixed(1)}°C`, event))
    .on("mousemove", (event, d) => showTooltip(`<strong>${d.countryEn}</strong>Production: ${compact(d.Production_tonnes)} t<br/>Current: ${d.Hist_Temp.toFixed(1)}°C · Future: ${d.Future_Temp.toFixed(1)}°C<br/>Rise: ${d.Temp_Rise.toFixed(1)}°C`, event))
    .on("mouseleave", hideTooltip);

  nodes.append("circle").attr("r", d => size(d.Production_tonnes)).attr("fill", d => color(d.Temp_Rise));
  nodes.append("text").attr("dy", d => -(size(d.Production_tonnes) + 8)).attr("text-anchor", "middle").text(d => d.countryEn);
}

function drawConclusion(selector) {
  const box = d3.select(selector).html("").append("div").attr("class", "climate-conclusion-box");
  box.append("h4").text("What the climate layer adds to the coffee journey");
  box.append("p").html("Climate change is not only a production problem. It reshapes <b>where coffee can grow</b>, which origin countries carry the highest exposure, and how future scarcity can travel through trade and consumption.");
  box.append("div").attr("class", "climate-conclusion-grid").html(`
    <span><b>1</b> Suitable zones shrink or migrate.</span>
    <span><b>2</b> Core producers face uneven warming.</span>
    <span><b>3</b> Supply risk can become price and quality risk.</span>
  `);
}

function renderError(container, err) {
  container.html(`
    <div class="chapter5-climate-error">
      <h3>Chapter 5 climate data could not be loaded</h3>
      <p>Make sure the standalone data folder was pushed, especially <code>public/chapter5_climate_standalone/数据/d3_ready_grid.csv</code> and <code>d3_ready_scatter.csv</code>.</p>
      <pre>${err?.message || err}</pre>
    </div>
  `);
}

export async function renderChapter5(containerSelector) {
  const container = d3.select(containerSelector);
  container.attr("class", "chapter5-climate-root");
  container.html(`
    <div class="chapter5-climate-shell">
      <div class="climate-board-head">
        <div>
          <span>Visualization board</span>
          <h3>Climate future</h3>
        </div>
        <div id="chapter5-stats" class="climate-stat-grid"></div>
      </div>
      <div id="chapter5-climate-viz" class="chapter5-climate-viz"></div>
    </div>
  `);

  try {
    const data = await loadChapter5Data();
    const viz = d3.select("#chapter5-climate-viz");
    const histSuitable = data.gridData.filter(d => d.hist_suit).length;
    const futureSuitable = data.gridData.filter(d => d.future_suit).length;
    const avgRise = d3.mean(data.scatterData, d => d.Temp_Rise) || d3.mean(data.gridData, d => d.temp_diff) || 0;
    const maxProducer = d3.max(data.scatterData, d => d.Production_tonnes) || 0;

    d3.select("#chapter5-stats").html(`
      <div><b>${data.gridData.length.toLocaleString()}</b><span>climate grid points</span></div>
      <div><b>${((futureSuitable - histSuitable) / Math.max(1, histSuitable) * 100).toFixed(1)}%</b><span>suitability shift</span></div>
      <div><b>+${avgRise.toFixed(1)}°C</b><span>avg producer warming</span></div>
      <div><b>${compact(maxProducer)} t</b><span>largest producer bubble</span></div>
    `);

    makeCard(viz, { id: "climate-risk-map", tag: "01 · Global warming", title: "Where does the planet heat up?", subtitle: "A gridded view of projected temperature change, drawn from the cleaned WorldClim layer.", className: "wide" });
    makeCard(viz, { id: "climate-suitability-map", tag: "02 · Coffee belt", title: "Which places remain suitable for coffee?", subtitle: "Toggle current and 2050 conditions to see the simulated 18°C–24°C coffee zone shift.", className: "wide" });
    makeCard(viz, { id: "climate-dumbbell", tag: "03 · Producer stress", title: "How much warmer do core producers become?", subtitle: "Dumbbell chart comparing current and future average temperature for major coffee origins." });
    makeCard(viz, { id: "climate-bubble", tag: "04 · Production exposure", title: "Where do production and warming overlap?", subtitle: "Bubble size shows current production; color indicates expected temperature rise." });
    viz.append("div").attr("id", "climate-conclusion").attr("class", "wide climate-conclusion-slot");

    drawRiskMap("#climate-risk-map", data);
    drawSuitabilityMap("#climate-suitability-map", data);
    drawDumbbell("#climate-dumbbell", data);
    drawBubbleMap("#climate-bubble", data);
    drawConclusion("#climate-conclusion");
  } catch (err) {
    console.error(err);
    renderError(container, err);
  }
}

export { renderChapter5 as renderChapter5Climate };
export default renderChapter5;
