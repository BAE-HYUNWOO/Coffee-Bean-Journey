import * as d3 from "d3";
import * as topojson from "topojson-client";
import { chartFrame, getSvg } from "../../components/chartFrame.js";
import { showTooltip, hideTooltip } from "../../shared/tooltip.js";
import { formatCompact } from "../../shared/formatters.js";

const countryNamesEN = {
  "东帝汶": "Timor-Leste", "中国": "China", "中国台湾省": "Taiwan",
  "中非共和国": "Central African Republic", "乌干达": "Uganda", "也门": "Yemen",
  "伯利兹": "Belize", "佛得角": "Cape Verde", "几内亚": "Guinea",
  "刚果": "Congo", "刚果民主共和国": "DR Congo", "利比里亚": "Liberia",
  "加纳": "Ghana", "加蓬": "Gabon", "卢旺达": "Rwanda", "印度": "India",
  "印度尼西亚": "Indonesia", "危地马拉": "Guatemala", "厄瓜多尔": "Ecuador",
  "古巴": "Cuba", "哥伦比亚": "Colombia", "哥斯达黎加": "Costa Rica",
  "喀麦隆": "Cameroon", "圣多美和普林西比": "Sao Tome and Principe",
  "圣文森特和格林纳丁斯": "St. Vincent and Grenadines", "圭亚那": "Guyana",
  "坦桑尼亚联合共和国": "Tanzania", "埃塞俄比亚": "Ethiopia",
  "塞拉利昂": "Sierra Leone", "墨西哥": "Mexico", "多哥": "Togo",
  "多民族玻利维亚国": "Bolivia", "多米尼克": "Dominica",
  "多米尼加共和国": "Dominican Republic",
  "委内瑞拉玻利瓦尔共和国": "Venezuela", "安哥拉": "Angola",
  "尼加拉瓜": "Nicaragua", "尼日利亚": "Nigeria", "尼泊尔": "Nepal",
  "巴布亚新几内亚": "Papua New Guinea", "巴拉圭": "Paraguay",
  "巴拿马": "Panama", "巴西": "Brazil", "布隆迪": "Burundi",
  "库克群岛": "Cook Islands", "斐济": "Fiji", "斯里兰卡": "Sri Lanka",
  "新喀里多尼亚": "New Caledonia", "柬埔寨": "Cambodia",
  "毛里求斯": "Mauritius", "汤加": "Tonga", "沙特阿拉伯": "Saudi Arabia",
  "法属波利尼西亚": "French Polynesia", "波多黎各": "Puerto Rico",
  "泰国": "Thailand", "津巴布韦": "Zimbabwe", "洪都拉斯": "Honduras",
  "海地": "Haiti", "牙买加": "Jamaica",
  "特立尼达和多巴哥": "Trinidad and Tobago", "瓜德罗普": "Guadeloupe",
  "瓦努阿图": "Vanuatu", "科摩罗": "Comoros", "科特迪瓦": "Côte d'Ivoire",
  "秘鲁": "Peru", "缅甸": "Myanmar", "美利坚合众国": "United States",
  "老挝人民民主共和国": "Laos", "肯尼亚": "Kenya", "苏里南": "Suriname",
  "莫桑比克": "Mozambique", "菲律宾": "Philippines", "萨尔瓦多": "El Salvador",
  "萨摩亚": "Samoa", "西班牙": "Spain", "贝宁": "Benin", "赞比亚": "Zambia",
  "赤道几内亚": "Equatorial Guinea", "越南": "Vietnam", "马拉维": "Malawi",
  "马提尼克": "Martinique", "马来西亚": "Malaysia",
  "马达加斯加": "Madagascar"
};

function getEnglishName(cnName) {
  return countryNamesEN[cnName] || cnName;
}

function formatFullNumber(n) {
  if (n == null || n === 0) return "—";
  return d3.format(",.0f")(n);
}

function formatPct(n, total) {
  if (!total || n == null) return "0.0%";
  return ((n / total) * 100).toFixed(1) + "%";
}

// ISO 3166-1 alpha-3 → numeric-3 mapping (TopoJSON id is numeric, CSV has alpha-3)
const isoA3toN3 = {
  "TLS":"626","CHN":"156","TWN":"158","CAF":"140","UGA":"800","YEM":"887","BLZ":"084",
  "CPV":"132","GIN":"324","COG":"178","COD":"180","LBR":"430","GHA":"288","GAB":"266",
  "RWA":"646","IND":"356","IDN":"360","GTM":"320","ECU":"218","CUB":"192","COL":"170",
  "CRI":"188","CMR":"120","STP":"678","VCT":"670","GUY":"328","TZA":"834","ETH":"231",
  "SLE":"694","MEX":"484","TGO":"768","BOL":"068","DMA":"212","DOM":"214","VEN":"862",
  "AGO":"024","NIC":"558","NGA":"566","NPL":"524","PNG":"598","PRY":"600","PAN":"591",
  "BRA":"076","BDI":"108","COK":"184","FJI":"242","LKA":"144","NCL":"540","KHM":"116",
  "MUS":"480","TON":"776","SAU":"682","PYF":"258","PRI":"630","THA":"764","ZWE":"716",
  "HND":"340","HTI":"332","JAM":"388","TTO":"780","GLP":"312","VUT":"548","COM":"174",
  "CIV":"384","PER":"604","MMR":"104","USA":"840","LAO":"418","KEN":"404","SUR":"740",
  "MOZ":"508","PHL":"608","SLV":"222","WSM":"882","ESP":"724","BEN":"204","ZMB":"894",
  "GNQ":"226","VNM":"704","MWI":"454","MTQ":"474","MYS":"458","MDG":"450"
};

export function drawChoroplethMap(containerSelector, { mapData, worldTopoJSON }) {
  // Build dataMap keyed by ISO numeric code (matching TopoJSON geometry id)
  const dataMap = new Map(
    mapData.map(d => [isoA3toN3[d.ISO_Code] || d.ISO_Code, d])
  );
  const totalProduction = d3.sum(mapData, d => d.Production_tonnes || 0);
  const totalArea = d3.sum(mapData, d => d.Area_Harvested_ha || 0);

  const metricLabels = {
    production: { label: "Production (tonnes)", unit: "t", field: "Production_tonnes", total: totalProduction },
    area: { label: "Harvested Area (ha)", unit: "ha", field: "Area_Harvested_ha", total: totalArea },
    yield: { label: "Yield (kg/ha)", unit: "kg/ha", field: "Yield_kg_per_ha", total: null }
  };

  let currentMetric = "production";

  const { body } = chartFrame(containerSelector, {
    title: "World Coffee Production Map",
    tag: "Choropleth",
    description: "Explore coffee-growing regions across 83 countries. Toggle metrics, hover for details, click for country stats.",
    wide: false
  });

  body.node()?.closest(".chart-frame")?.querySelector(".chart-frame-header em")?.remove();

  // Controls
  const controls = body.append("div")
    .attr("class", "map-controls")
    .style("display", "flex")
    .style("gap", "10px")
    .style("margin-bottom", "10px")
    .style("flex-wrap", "wrap")
    .style("align-items", "center")
    .style("padding", "0 8px");

  controls.append("span")
    .style("font-size", "0.7rem")
    .style("font-weight", "850")
    .style("letter-spacing", "0.13em")
    .style("text-transform", "uppercase")
    .style("color", "var(--soft)")
    .text("Metric:");

  const metricSelect = controls.append("select")
    .style("background", "var(--paper)")
    .style("border", "1px solid var(--line)")
    .style("color", "var(--text)")
    .style("padding", "5px 10px")
    .style("border-radius", "8px")
    .style("font-family", "Inter, sans-serif")
    .style("font-size", "0.76rem")
    .style("outline", "none")
    .style("cursor", "pointer");
  metricSelect.selectAll("option")
    .data(["production", "area", "yield"])
    .enter().append("option")
    .attr("value", d => d)
    .text(d => metricLabels[d].label);

  controls.append("span")
    .style("font-size", "0.7rem")
    .style("font-weight", "850")
    .style("letter-spacing", "0.13em")
    .style("text-transform", "uppercase")
    .style("color", "var(--soft)")
    .text("Search:");

  const searchInput = controls.append("input")
    .attr("type", "text")
    .attr("placeholder", "Country name...")
    .style("background", "var(--paper)")
    .style("border", "1px solid var(--line)")
    .style("color", "var(--text)")
    .style("padding", "5px 10px")
    .style("border-radius", "8px")
    .style("font-family", "Inter, sans-serif")
    .style("font-size", "0.76rem")
    .style("outline", "none")
    .style("width", "150px");

  controls.append("button")
    .text("⟲ Reset")
    .style("background", "transparent")
    .style("border", "1px solid var(--line)")
    .style("color", "var(--muted)")
    .style("padding", "5px 14px")
    .style("border-radius", "999px")
    .style("cursor", "pointer")
    .style("font-family", "Inter, sans-serif")
    .style("font-size", "0.7rem")
    .style("font-weight", "600")
    .style("transition", "all 0.2s");

  // SVG — wider aspect ratio for better map proportions
  const svgContainer = body.append("div").attr("class", "map-svg-wrap");
  const mapHeight = 380;
  const { svg, width } = getSvg(svgContainer, mapHeight);

  // Ocean background — light grayish-blue
  svg.append("rect")
    .attr("width", width)
    .attr("height", mapHeight)
    .attr("fill", "#8FBCD4");

  // Clip path so zoomed map content stays within ocean bounds
  svg.append("defs").append("clipPath")
    .attr("id", "map-clip")
    .append("rect")
    .attr("width", width)
    .attr("height", mapHeight);

  // Projection — scale to fit world nicely
  const projection = d3.geoNaturalEarth1()
    .scale(width / 6.2)
    .translate([width / 2, mapHeight / 2]);
  const pathGen = d3.geoPath().projection(projection);

  // Wrapper group: clip stays fixed in SVG space regardless of zoom
  const clipG = svg.append("g").attr("clip-path", "url(#map-clip)");
  const g = clipG.append("g");

  // Zoom — with translate bounds to prevent infinite panning
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, mapHeight]])
    .on("zoom", (event) => { g.attr("transform", event.transform); });
  svg.call(zoom);
  // Initial zoom — focus on the coffee belt (tropics) for a more impactful first view
  // Initial view — only a light zoom so the coffee belt is visible
  // without cutting too much of the surrounding continents.
  const initialScale = 1.08;
  const initialTx = width / 2 - (width / 2) * initialScale;
  const initialTy = mapHeight / 2 - (mapHeight / 2) * initialScale + 18;
  const initialTransform = d3.zoomIdentity.translate(initialTx, initialTy).scale(initialScale);
  svg.call(zoom.transform, initialTransform);

  svg.on("dblclick.zoom", () => {
    svg.transition().duration(500).call(zoom.transform, initialTransform);
  });

  // Color scales — warm coffee tones: cream → gold → orange → deep brown
  // Uses log scale so small producers are visible, large ones dominate visually
  function getColorScale(metric) {
    const values = mapData.filter(d => (d[metricLabels[metric].field] || 0) > 0)
      .map(d => d[metricLabels[metric].field]);
    if (metric === "production" || metric === "area") {
      const minVal = d3.min(values.filter(v => v > 0));
      const maxVal = d3.max(values);
      return d3.scaleLog()
        .domain([minVal, maxVal])
        .range(["#FFF2CC", "#2D1A0A"])
        .interpolate(d3.interpolateHsl);
    } else {
      return d3.scaleLinear()
        .domain([d3.min(values), d3.max(values)])
        .range(["#FFF2CC", "#2D1A0A"])
        .interpolate(d3.interpolateHsl);
    }
  }

  let colorScale = getColorScale("production");

  // Legend
  const legendDiv = body.append("div")
    .attr("class", "map-legend")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "6px")
    .style("padding", "6px 8px")
    .style("font-family", "Inter, sans-serif")
    .style("font-size", "0.68rem")
    .style("color", "var(--muted)")
    .style("flex-wrap", "wrap");

  function niceThresholds(min, max, count) {
    // Start from at least 1 to avoid tiny decimals
    const logMin = Math.log10(Math.max(1, min));
    const logMax = Math.log10(max);
    const step = (logMax - logMin) / (count - 1);

    const result = [];
    for (let i = 0; i < count; i++) {
      let v = Math.pow(10, logMin + step * i);
      // Round to 1 significant figure
      const exp = Math.floor(Math.log10(v));
      const mantissa = v / Math.pow(10, exp);
      v = Math.round(mantissa) * Math.pow(10, exp);
      result.push(v);
    }
    // Deduplicate
    return [...new Set(result)];
  }

  function formatLegendValue(v, unit) {
    let num;
    if (v >= 1e6) num = (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    else if (v >= 1e3) num = (v / 1e3).toFixed(0) + "K";
    else if (v >= 100) num = v.toFixed(0);
    else if (v >= 1) num = v.toFixed(1).replace(/\.0$/, "");
    else num = v.toFixed(2);
    return num + " " + unit;
  }

  function updateLegend() {
    const meta = metricLabels[currentMetric];
    const values = mapData.filter(d => (d[meta.field] || 0) > 0).map(d => d[meta.field]);
    const minV = d3.min(values.filter(v => v > 0));
    const maxV = d3.max(values);

    const thresholds = niceThresholds(minV, maxV, 7);

    const legendScale = d3.scaleLog()
      .domain([minV, maxV])
      .range(["#FFF2CC", "#2D1A0A"])
      .interpolate(d3.interpolateHsl);

    legendDiv.html("");

    thresholds.forEach((v) => {
      legendDiv.append("span")
        .style("display", "inline-block")
        .style("width", "14px")
        .style("height", "14px")
        .style("min-width", "14px")
        .style("border-radius", "50%")
        .style("background", legendScale(v))
        .style("border", "1px solid rgba(0,0,0,0.08)")
        .style("flex-shrink", "0");
      legendDiv.append("span")
        .style("text-align", "center")
        .style("white-space", "nowrap")
        .style("font-weight", "500")
        .text(formatLegendValue(v, meta.unit));
    });
  }
  updateLegend();

  // Detail panel (inline, below map)
  const detailDiv = body.append("div")
    .attr("class", "map-detail")
    .style("display", "none")
    .style("margin", "12px 8px 0")
    .style("padding", "16px")
    .style("border", "1px solid var(--line)")
    .style("border-radius", "16px")
    .style("background", "var(--paper)")
    .style("font-family", "Inter, sans-serif");

  function render() {
    if (!worldTopoJSON || !worldTopoJSON.objects) {
      console.warn("World TopoJSON not ready");
      return;
    }
    const features = topojson.feature(worldTopoJSON, worldTopoJSON.objects.countries).features;

    const paths = g.selectAll("path")
      .data(features, d => d.id);

    paths.exit().remove();

    const enterPaths = paths.enter().append("path")
      .attr("class", "country-path");

    const allPaths = enterPaths.merge(paths);

    allPaths
      .attr("d", pathGen)
      .attr("fill", d => {
        const iso = d.id; // TopoJSON geometry id = ISO numeric code string
        const entry = dataMap.get(iso);
        if (!entry) return "#D8D8D8";
        const val = entry[metricLabels[currentMetric].field];
        if (val == null || val === 0) return "#D8D8D8";
        return colorScale(val);
      })
      .attr("stroke", "rgba(91,58,38,0.14)")
      .attr("stroke-width", "0.4px")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("stroke", "#5a3a1a")
          .attr("stroke-width", "2px");
        const iso = d.id;
        const entry = dataMap.get(iso);
        if (!entry) { hideTooltip(); return; }
        const meta = metricLabels[currentMetric];
        const rankArr = [...mapData].sort((a, b) => (b.Production_tonnes || 0) - (a.Production_tonnes || 0));
        const rank = rankArr.findIndex(r => (isoA3toN3[r.ISO_Code] || r.ISO_Code) === iso) + 1;
        const html = `
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:6px;color:#C55A11;">
            ${getEnglishName(entry.Country)}
          </div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:8px;">
            Producer rank #${rank} of ${mapData.filter(d => (d.Production_tonnes || 0) > 0).length}
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:0.72rem;">
            <span>Production</span>
            <strong>${formatFullNumber(entry.Production_tonnes)} t</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:0.72rem;">
            <span>Area</span>
            <strong>${formatFullNumber(entry.Area_Harvested_ha)} ha</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:0.72rem;">
            <span>Yield</span>
            <strong>${formatFullNumber(entry.Yield_kg_per_ha)} kg/ha</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:0.72rem;color:#C55A11;border-top:1px solid rgba(0,0,0,0.06);margin-top:4px;padding-top:6px;">
            <span>Global Share</span>
            <strong>${formatPct(entry.Production_tonnes, totalProduction)}</strong>
          </div>
        `;
        showTooltip(html, event);
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("stroke", "rgba(91,58,38,0.14)")
          .attr("stroke-width", "0.4px");
        hideTooltip();
      })
      .on("click", function (event, d) {
        const iso = d.id;
        const entry = dataMap.get(iso);
        if (!entry) { detailDiv.style("display", "none"); return; }
        showCountryDetail(entry);
      });
  }

  function showCountryDetail(entry) {
    const enName = getEnglishName(entry.Country);
    const prodShare = formatPct(entry.Production_tonnes, totalProduction);
    const areaShare = formatPct(entry.Area_Harvested_ha, totalArea);

    detailDiv.style("display", "block").html(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong style="font-size:1rem;color:var(--coffee-dark);">${enName}</strong>
        <button class="map-detail-close" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.2rem;line-height:1;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        <div style="text-align:center;padding:12px 8px;background:#f6ead9;border-radius:12px;">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--soft);">Production</div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--coffee-dark);margin-top:4px;">${formatCompact.format(entry.Production_tonnes)} t</div>
          <div style="font-size:0.62rem;color:var(--muted);margin-top:2px;">${prodShare} of world</div>
        </div>
        <div style="text-align:center;padding:12px 8px;background:#f6ead9;border-radius:12px;">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--soft);">Area</div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--coffee-dark);margin-top:4px;">${formatCompact.format(entry.Area_Harvested_ha)} ha</div>
          <div style="font-size:0.62rem;color:var(--muted);margin-top:2px;">${areaShare} of world</div>
        </div>
        <div style="text-align:center;padding:12px 8px;background:#f6ead9;border-radius:12px;">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--soft);">Yield</div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--coffee-dark);margin-top:4px;">${d3.format(",.0f")(entry.Yield_kg_per_ha)}</div>
          <div style="font-size:0.62rem;color:var(--muted);margin-top:2px;">kg/ha</div>
        </div>
      </div>
    `);

    detailDiv.select(".map-detail-close").on("click", () => {
      detailDiv.style("display", "none");
    });
  }

  metricSelect.on("change", function () {
    currentMetric = this.value;
    colorScale = getColorScale(currentMetric);
    updateLegend();
    render();
  });

  searchInput.on("input", function () {
    const query = this.value.trim().toLowerCase();
    if (!query) return;
    const match = mapData.find(d =>
      d.Country.toLowerCase().includes(query) ||
      getEnglishName(d.Country).toLowerCase().includes(query) ||
      (d.ISO_Code || "").toLowerCase() === query
    );
    if (!match) return;
    const features = topojson.feature(worldTopoJSON, worldTopoJSON.objects.countries).features;
    const feature = features.find(f => f.id === (isoA3toN3[match.ISO_Code] || match.ISO_Code));
    if (!feature) return;
    const centroid = d3.geoCentroid(feature);
    if (!centroid || isNaN(centroid[0])) return;
    const [cx, cy] = projection(centroid);
    if (isNaN(cx) || isNaN(cy)) return;
    const tx = width / 2 - cx * 4;
    const ty = mapHeight / 2 - cy * 4;
    svg.transition().duration(800).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(4)
    );
  });

  controls.select("button").on("click", () => {
    svg.transition().duration(500).call(zoom.transform, initialTransform);
  });

  // Initial render
  render();

  // ResizeObserver
  const chartFrameEl = body.node()?.closest(".chart-frame");
  if (chartFrameEl) {
    const observer = new ResizeObserver(() => {
      const newWidth = Math.max(340, svgContainer.node()?.getBoundingClientRect().width || 640);
      svg.attr("viewBox", `0 0 ${newWidth} ${mapHeight}`);
      svg.selectAll("rect").attr("width", newWidth).attr("height", mapHeight);
      projection.scale(newWidth / 6.2).translate([newWidth / 2, mapHeight / 2]);
      render();
    });
    observer.observe(chartFrameEl);
  }
}
