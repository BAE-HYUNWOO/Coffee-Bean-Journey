import * as d3 from "d3";
import { chartFrame, getSvg } from "../../components/chartFrame.js";
import { drawMetricCards } from "../../components/metricCards.js";
import { showTooltip, hideTooltip } from "../../shared/tooltip.js";
import { formatCompact } from "../../shared/formatters.js";
import "./style.css";

const HOTSPOTS = [
  { name: "Brazil", region: "Latin America", x: 0.32, y: 0.62, risk: 78, label: "Heat + rainfall instability" },
  { name: "Colombia", region: "Latin America", x: 0.24, y: 0.55, risk: 67, label: "Mountain suitability shift" },
  { name: "Ethiopia", region: "Africa", x: 0.56, y: 0.51, risk: 72, label: "Arabica origin pressure" },
  { name: "Vietnam", region: "Southeast Asia", x: 0.74, y: 0.52, risk: 69, label: "Robusta heat exposure" },
  { name: "Indonesia", region: "Southeast Asia", x: 0.79, y: 0.65, risk: 64, label: "Island rainfall volatility" },
];

const SCENARIO_DATA = [
  { year: 2020, moderate: 100, stress: 100 },
  { year: 2025, moderate: 96, stress: 93 },
  { year: 2030, moderate: 91, stress: 84 },
  { year: 2035, moderate: 86, stress: 75 },
  { year: 2040, moderate: 81, stress: 66 },
  { year: 2045, moderate: 76, stress: 57 },
  { year: 2050, moderate: 72, stress: 49 },
];

const CLIMATE_POINTS = [
  { temp: 19.2, yield: 82, region: "Highland Arabica" },
  { temp: 20.1, yield: 88, region: "Highland Arabica" },
  { temp: 21.5, yield: 79, region: "Highland Arabica" },
  { temp: 23.0, yield: 72, region: "Transition zone" },
  { temp: 24.2, yield: 65, region: "Transition zone" },
  { temp: 25.1, yield: 58, region: "Transition zone" },
  { temp: 26.4, yield: 49, region: "Heat stressed" },
  { temp: 27.6, yield: 42, region: "Heat stressed" },
  { temp: 28.2, yield: 36, region: "Heat stressed" },
  { temp: 29.0, yield: 31, region: "Heat stressed" },
];

function drawRiskMap(containerSelector) {
  const { frame, body } = chartFrame(containerSelector, {
    title: "Climate risk hotspots",
    tag: "Risk map",
    description: "Illustrative hotspot view: hover the circles to compare climate pressure across major coffee regions.",
    wide: true,
  });
  frame.classed("climate-risk-frame", true);

  const { svg, width, height } = getSvg(body, 430);

  svg.append("rect")
    .attr("x", 18)
    .attr("y", 18)
    .attr("width", width - 36)
    .attr("height", height - 36)
    .attr("rx", 32)
    .attr("fill", "rgba(255,255,255,0.34)")
    .attr("stroke", "rgba(91,58,38,0.12)");

  const blobs = [
    "M64,190 C95,92 196,75 247,148 C285,206 217,298 126,279 C76,267 44,245 64,190Z",
    "M345,150 C400,80 508,91 540,176 C570,256 477,320 386,286 C332,265 300,204 345,150Z",
    "M587,203 C650,134 760,154 797,225 C839,308 720,368 629,318 C579,290 545,251 587,203Z",
  ];

  const scale = Math.min(width / 870, height / 430);
  const offsetX = (width - 870 * scale) / 2;
  const offsetY = 20;

  svg.append("g")
    .selectAll("path")
    .data(blobs)
    .join("path")
    .attr("d", d => d)
    .attr("transform", `translate(${offsetX},${offsetY}) scale(${scale})`)
    .attr("fill", "rgba(43,26,18,0.08)")
    .attr("stroke", "rgba(43,26,18,0.13)")
    .attr("stroke-width", 1.2 / scale);

  const hotspotLayer = svg.append("g").attr("class", "climate-hotspots");
  const riskScale = d3.scaleLinear().domain([50, 80]).range([9, 24]);

  hotspotLayer.selectAll("circle")
    .data(HOTSPOTS)
    .join("circle")
    .attr("cx", d => d.x * width)
    .attr("cy", d => d.y * height)
    .attr("r", d => riskScale(d.risk))
    .attr("class", "climate-hotspot")
    .on("mouseenter", (event, d) => {
      d3.select(event.currentTarget).classed("is-active", true);
      showTooltip(`<strong>${d.name}</strong>${d.region}<br/>Risk index: ${d.risk}/100<br/>${d.label}`, event);
    })
    .on("mousemove", (event, d) => showTooltip(`<strong>${d.name}</strong>${d.region}<br/>Risk index: ${d.risk}/100<br/>${d.label}`, event))
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).classed("is-active", false);
      hideTooltip();
    });

  hotspotLayer.selectAll("text")
    .data(HOTSPOTS)
    .join("text")
    .attr("x", d => d.x * width)
    .attr("y", d => d.y * height - riskScale(d.risk) - 9)
    .attr("text-anchor", "middle")
    .attr("class", "climate-hotspot-label")
    .text(d => d.name);
}

function drawScenarioChart(containerSelector) {
  const { frame, body } = chartFrame(containerSelector, {
    title: "Suitability scenario",
    tag: "Future index",
    description: "A compact scenario view shows why the same coffee belt can shrink under stronger heat stress.",
    wide: false,
  });
  frame.classed("climate-scenario-frame", true);

  const { svg, width, height } = getSvg(body, 360);
  const margin = { top: 28, right: 32, bottom: 46, left: 48 };
  const x = d3.scaleLinear().domain(d3.extent(SCENARIO_DATA, d => d.year)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([40, 105]).range([height - margin.bottom, margin.top]);
  const line = key => d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveMonotoneX);

  svg.append("g")
    .selectAll("line")
    .data(y.ticks(5))
    .join("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", "rgba(91,58,38,0.10)");

  [
    ["moderate", "Adaptation scenario"],
    ["stress", "High stress scenario"],
  ].forEach(([key, label], index) => {
    svg.append("path")
      .datum(SCENARIO_DATA)
      .attr("d", line(key))
      .attr("class", `climate-scenario-line ${key}`);

    svg.append("text")
      .attr("x", x(2050) - 8)
      .attr("y", y(SCENARIO_DATA.at(-1)[key]) - (index ? -16 : 10))
      .attr("text-anchor", "end")
      .attr("class", "climate-line-label")
      .text(label);
  });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}`))
    .call(g => g.select(".domain").remove());

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", margin.top - 12)
    .attr("class", "climate-axis-note")
    .text("Suitability index, 2020 = 100");
}

function drawClimateScatter(containerSelector) {
  const { frame, body } = chartFrame(containerSelector, {
    title: "Temperature and yield stress",
    tag: "Relationship",
    description: "Each dot represents an illustrative production zone. Higher average temperature gradually pushes expected yield down.",
    wide: false,
  });
  frame.classed("climate-scatter-frame", true);

  const { svg, width, height } = getSvg(body, 360);
  const margin = { top: 24, right: 28, bottom: 52, left: 58 };
  const x = d3.scaleLinear().domain([18, 30]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([25, 92]).range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}°C`))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}`))
    .call(g => g.select(".domain").remove());

  svg.append("path")
    .datum(CLIMATE_POINTS)
    .attr("d", d3.line().x(d => x(d.temp)).y(d => y(d.yield)).curve(d3.curveCatmullRom))
    .attr("class", "climate-trend-line");

  svg.append("g")
    .selectAll("circle")
    .data(CLIMATE_POINTS)
    .join("circle")
    .attr("cx", d => x(d.temp))
    .attr("cy", d => y(d.yield))
    .attr("r", 7)
    .attr("class", d => `climate-dot ${d.region.toLowerCase().replaceAll(" ", "-")}`)
    .on("mouseenter", (event, d) => {
      showTooltip(`<strong>${d.region}</strong>Temperature: ${d.temp}°C<br/>Yield index: ${d.yield}`, event);
    })
    .on("mousemove", (event, d) => showTooltip(`<strong>${d.region}</strong>Temperature: ${d.temp}°C<br/>Yield index: ${d.yield}`, event))
    .on("mouseleave", hideTooltip);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("class", "climate-axis-note")
    .text("Average growing-season temperature");
}

export function renderChapter5(containerSelector) {
  const container = d3.select(containerSelector);
  container.html(`
    <div class="chapter-panel-head">
      <div>
        <span>Visualization board</span>
        <h3>Climate future</h3>
      </div>
      <div id="chapter5_climate-stats"></div>
    </div>

    <div class="climate-story-lead">
      <strong>Future question</strong>
      <span>What happens if the places that grow coffee become hotter, drier, or less predictable?</span>
    </div>

    <div class="visual-grid climate-grid">
      <div id="climate-map" class="wide-slot"></div>
      <div id="climate-line"></div>
      <div id="climate-scatter"></div>
    </div>
  `);

  drawMetricCards("#chapter5_climate-stats", [
    { value: "5", label: "Hotspots" },
    { value: "2050", label: "Scenario horizon" },
    { value: "Risk", label: "Suitability shift" },
  ]);

  drawRiskMap("#climate-map");
  drawScenarioChart("#climate-line");
  drawClimateScatter("#climate-scatter");
}
