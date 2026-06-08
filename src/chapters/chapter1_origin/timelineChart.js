import * as d3 from "d3";
import { chartFrame, getSvg } from "../../components/chartFrame.js";
import { showTooltip, hideTooltip } from "../../shared/tooltip.js";
import { formatCompact } from "../../shared/formatters.js";

const countryNamesEN = {
  "巴西": "Brazil", "越南": "Vietnam", "哥伦比亚": "Colombia",
  "印度尼西亚": "Indonesia", "埃塞俄比亚": "Ethiopia", "乌干达": "Uganda",
  "印度": "India", "秘鲁": "Peru", "洪都拉斯": "Honduras",
  "中非共和国": "Central African Republic"
};

const countryColors = {
  "Brazil": "#6f432b",
  "Vietnam": "#4a7c59",
  "Colombia": "#c98f4f",
  "Indonesia": "#be704a",
  "Ethiopia": "#a07850",
  "Uganda": "#b85c3a",
  "India": "#c4823d",
  "Peru": "#8b6e4e",
  "Honduras": "#5d8a9e",
  "Central African Republic": "#9b7a5a"
};

const countryKeys = Object.keys(countryNamesEN);

export function drawTimelineChart(containerSelector, { timelineData }) {
  const { body } = chartFrame(containerSelector, {
    title: "Coffee Production Timeline",
    tag: "Time Series",
    description: "Production trends from 1990 to 2024. Scroll to zoom the time axis, hover for details, click legend items to toggle countries.",
    wide: true
  });

  body.node()?.closest(".chart-frame")?.querySelector(".chart-frame-header em")?.remove();

  // State
  const visibleCountries = new Set(countryKeys);
  let showGlobal = true;
  let xDomain = [1990, 2024]; // mutable for zoom
  const allSelected = () => visibleCountries.size === countryKeys.length;

  // Legend
  const legendBar = body.append("div")
    .attr("class", "timeline-legend-bar")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "5px")
    .style("padding", "0 4px 10px")
    .style("align-items", "center");

  function buildLegend() {
    legendBar.html("");
    const allBtn = legendBar.append("button")
      .text((allSelected() && showGlobal) ? "Deselect All" : "Select All")
      .style("background", "transparent")
      .style("border", "1px solid var(--line)")
      .style("color", "var(--muted)")
      .style("padding", "4px 10px")
      .style("border-radius", "999px")
      .style("cursor", "pointer")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "0.65rem")
      .style("font-weight", "600")
      .style("transition", "all 0.2s");
    allBtn.on("click", () => {
      if (allSelected() && showGlobal) {
        visibleCountries.clear();
        showGlobal = false;
      } else {
        countryKeys.forEach(k => visibleCountries.add(k));
        showGlobal = true;
      }
      buildLegend();
      render();
    });

    // Zoom reset button
    const zoomReset = legendBar.append("button")
      .text("↺ Reset")
      .style("background", "transparent")
      .style("border", "1px solid var(--line)")
      .style("color", "var(--muted)")
      .style("padding", "4px 10px")
      .style("border-radius", "999px")
      .style("cursor", "pointer")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "0.65rem")
      .style("font-weight", "600")
      .style("transition", "all 0.2s");
    zoomReset.on("click", () => {
      xDomain = [1990, 2024];
      render();
    });

    // Global total toggle
    const globalBtn = legendBar.append("button")
      .style("display", "inline-flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("padding", "4px 12px")
      .style("border-radius", "999px")
      .style("border", `1px solid ${showGlobal ? "#d4842a" : "var(--line)"}`)
      .style("background", showGlobal ? "#d4842a18" : "transparent")
      .style("color", showGlobal ? "var(--text)" : "var(--muted)")
      .style("cursor", "pointer")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "0.7rem")
      .style("font-weight", "600")
      .style("transition", "all 0.2s");
    globalBtn.append("span")
      .style("display", "inline-block")
      .style("width", "8px")
      .style("height", "8px")
      .style("border-radius", "50%")
      .style("background", "#d4842a");
    globalBtn.append("span").text("Global");
    globalBtn.on("click", () => {
      showGlobal = !showGlobal;
      buildLegend();
      render();
    });
    globalBtn.on("dblclick", () => {
      // If already soloed (only global showing), restore all
      if (visibleCountries.size === 0 && showGlobal) {
        countryKeys.forEach(k => visibleCountries.add(k));
        showGlobal = true;
      } else {
        // Solo global: hide all countries, show only global
        visibleCountries.clear();
        showGlobal = true;
      }
      buildLegend();
      render();
      render();
    });


    countryKeys.forEach((cn) => {
      const en = countryNamesEN[cn];
      const color = countryColors[en] || "#999";
      const active = visibleCountries.has(cn);
      const pill = legendBar.append("button")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("gap", "6px")
        .style("padding", "3px 9px")
        .style("border-radius", "999px")
        .style("border", `1px solid ${active ? color : "var(--line)"}`)
        .style("background", active ? color + "18" : "transparent")
        .style("color", active ? "var(--text)" : "var(--muted)")
        .style("cursor", "pointer")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "0.7rem")
        .style("font-weight", "600")
        .style("transition", "all 0.2s")
        .style("opacity", active ? "1" : "0.5");
      pill.append("span")
        .style("display", "inline-block")
        .style("width", "8px")
        .style("height", "8px")
        .style("border-radius", "50%")
        .style("background", color);
      pill.append("span").text(en);

      pill.on("click", () => {
        if (visibleCountries.has(cn)) {
          visibleCountries.delete(cn);
        } else {
          visibleCountries.add(cn);
        }
        buildLegend();
        render();
      });
      pill.on("dblclick", () => {
        visibleCountries.clear();
        visibleCountries.add(cn);
        buildLegend();
        render();
      });
    });
  }
  buildLegend();

  // SVG setup
  const svgWrap = body.append("div").attr("class", "timeline-svg-wrap");
  const { svg, width } = getSvg(svgWrap, 400);

  const margin = { top: 20, right: 30, bottom: 20, left: 60 };
  const innerW = width - margin.left - margin.right;
  const mainH = 260;
  const miniH = 36;
  const miniGap = 12;
  const innerMainH = mainH - margin.top;
  const totalH = margin.top + innerMainH + 20 + miniGap + miniH + margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${totalH}`);

  const mainG = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const miniG = svg.append("g").attr("transform", `translate(${margin.left},${margin.top + innerMainH + 20 + miniGap})`);

  // Scales (mutable refs for zoom)
  let xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
  let yScale = d3.scaleLinear().range([innerMainH, 0]);

  // Clip path
  const clipId = "timeline-clip-" + Math.random().toString(36).slice(2, 8);
  svg.append("defs").append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerMainH);

  const clipG = mainG.append("g").attr("clip-path", `url(#${clipId})`);

  // Grid
  const gridG = clipG.append("g").attr("class", "timeline-grid");
  const xAxisG = mainG.append("g").attr("class", "timeline-xaxis")
    .attr("transform", `translate(0,${innerMainH})`);
  const yAxisG = mainG.append("g").attr("class", "timeline-yaxis");

  // Crosshair group
  const crosshairG = mainG.append("g").style("display", "none").style("pointer-events", "none");
  crosshairG.append("line")
    .attr("class", "timeline-crosshair")
    .attr("y1", 0).attr("y2", innerMainH)
    .attr("stroke", "rgba(91,58,38,0.2)")
    .attr("stroke-width", "1");
  // Year label bubble
  const crosshairBubble = crosshairG.append("rect")
    .attr("x", -22).attr("y", -10).attr("width", 44).attr("height", 20)
    .attr("rx", "10").attr("fill", "var(--coffee-dark)").attr("opacity", "0.85");
  const crosshairLabel = crosshairG.append("text")
    .attr("y", 4).attr("text-anchor", "middle")
    .attr("fill", "#fff").attr("font-family", "Inter, sans-serif")
    .attr("font-size", "10px").attr("font-weight", "700");

  // Hover overlay (on top of everything, no brush to block it)
  const hoverRect = mainG.append("rect")
    .attr("width", innerW).attr("height", innerMainH)
    .attr("fill", "transparent")
    .style("cursor", "crosshair");

  // Scroll wheel zoom
  hoverRect.on("wheel", function (event) {
    event.preventDefault();
    const [mx] = d3.pointer(event);
    const mouseYear = xScale.invert(mx);
    const span = xDomain[1] - xDomain[0];
    const factor = event.deltaY > 0 ? 1.25 : 0.8; // scroll down = zoom out
    const newSpan = Math.max(3, Math.min(34, span * factor));
    const ratio = (mouseYear - xDomain[0]) / span;
    xDomain = [
      Math.max(1990, mouseYear - newSpan * ratio),
      Math.min(2024, mouseYear + newSpan * (1 - ratio))
    ];
    // Clamp
    if (xDomain[1] - xDomain[0] < 3) {
      const mid = (xDomain[0] + xDomain[1]) / 2;
      xDomain = [Math.max(1990, mid - 1.5), Math.min(2024, mid + 1.5)];
    }
    if (xDomain[0] < 1990) { xDomain[0] = 1990; xDomain[1] = 1990 + newSpan; }
    if (xDomain[1] > 2024) { xDomain[1] = 2024; xDomain[0] = 2024 - newSpan; }
    xScale.domain(xDomain);
    render();
  });

  // Hover
  hoverRect.on("mousemove", function (event) {
    const [mx] = d3.pointer(event);
    const year = Math.round(xScale.invert(mx));
    const clampedYear = Math.max(1990, Math.min(2024, year));
    const xPos = xScale(clampedYear);
    crosshairG.style("display", null);
    crosshairG.select("line").attr("x1", xPos).attr("x2", xPos);
    crosshairBubble.attr("x", xPos - 22);
    crosshairLabel.attr("x", xPos).text(clampedYear);

    const row = timelineData.find(d => d.Year === clampedYear);
    if (!row) { hideTooltip(); return; }

    const ranked = countryKeys
      .filter(k => visibleCountries.has(k))
      .map(k => ({ cn: k, en: countryNamesEN[k], val: row[k + "_tonnes"] || 0, color: countryColors[countryNamesEN[k]] }))
      .sort((a, b) => b.val - a.val);

    const maxRankedVal = ranked.length > 0 ? ranked[0].val : 1;

    let listHtml = ranked.map((r, i) => {
      const barPct = Math.max(2, (r.val / maxRankedVal) * 100);
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:0.75rem;">
          <span style="color:var(--muted);min-width:16px;font-weight:600;">${i + 1}.</span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};flex-shrink:0;"></span>
          <span style="flex:1;min-width:80px;font-weight:500;">${r.en}</span>
          <span style="flex:2;min-width:60px;height:6px;background:var(--line);border-radius:3px;display:inline-block;position:relative;">
            <span style="display:block;height:100%;width:${barPct}%;background:${r.color};border-radius:3px;"></span>
          </span>
          <strong style="min-width:55px;text-align:right;font-size:0.75rem;">${formatCompact.format(r.val)} t</strong>
        </div>
      `;
    }).join("");

    const html = `
      <div style="font-weight:700;font-size:1.1rem;margin-bottom:10px;color:#C55A11;border-bottom:1px solid var(--line);padding-bottom:8px;">
        ${clampedYear}
      </div>
      <div style="font-size:0.78rem;color:var(--muted);margin-bottom:10px;">
        Global total: <strong style="color:var(--coffee-dark);">${formatCompact.format(row.Global_Production_tonnes)} t</strong>
      </div>
      <div style="font-size:0.68rem;color:var(--soft);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">
        Top producers this year
      </div>
      ${listHtml}
    `;
    showTooltip(html, event);
  });

  hoverRect.on("mouseleave", () => {
    crosshairG.style("display", "none");
    hideTooltip();
  });

  // Mini chart — with draggable window to pan time range
  let miniDomains = [1990, 2024]; // stored for drag ref

  function renderMini() {
    const miniY = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.Global_Production_tonnes) * 1.05])
      .range([miniH - 2, 1]);
    const miniX = d3.scaleLinear().domain([1990, 2024]).range([0, innerW]);

    miniDomains = [xDomain[0], xDomain[1]];

    miniG.selectAll("*").remove();

    // Full-range area
    miniG.append("path")
      .datum(timelineData)
      .attr("d", d3.area()
        .x(d => miniX(d.Year))
        .y0(miniH - 2)
        .y1(d => miniY(d.Global_Production_tonnes))
        .curve(d3.curveMonotoneX))
      .attr("fill", "#c98f4f")
      .attr("opacity", "0.2");

    // Full-range line
    miniG.append("path")
      .datum(timelineData)
      .attr("d", d3.line()
        .x(d => miniX(d.Year))
        .y(d => miniY(d.Global_Production_tonnes))
        .curve(d3.curveMonotoneX))
      .attr("fill", "none")
      .attr("stroke", "#c98f4f")
      .attr("stroke-width", "1")
      .attr("opacity", "0.6");

    // Current zoom window highlight — draggable, bolder style
    const winX = miniX(xDomain[0]);
    const winW = Math.max(6, miniX(xDomain[1]) - miniX(xDomain[0]));

    // Semi-transparent fill
    miniG.append("rect")
      .attr("class", "zoom-window-fill")
      .attr("x", winX)
      .attr("width", winW)
      .attr("y", 0)
      .attr("height", miniH - 2)
      .attr("fill", "#c98f4f")
      .attr("opacity", "0.35")
      .attr("rx", "3")
      .style("cursor", "grab");

    // Bold border
    miniG.append("rect")
      .attr("class", "zoom-window")
      .attr("x", winX)
      .attr("width", winW)
      .attr("y", 0)
      .attr("height", miniH - 2)
      .attr("fill", "none")
      .attr("stroke", "#3a5a2a")
      .attr("stroke-width", "2")
      .attr("rx", "3")
      .style("cursor", "grab");

    // Left handle
    miniG.append("rect")
      .attr("class", "zoom-handle-left")
      .attr("x", winX - 2)
      .attr("width", 5)
      .attr("y", 1)
      .attr("height", miniH - 4)
      .attr("fill", "#3a5a2a")
      .attr("rx", "2")
      .style("cursor", "ew-resize");

    // Right handle
    miniG.append("rect")
      .attr("class", "zoom-handle-right")
      .attr("x", winX + winW - 3)
      .attr("width", 5)
      .attr("y", 1)
      .attr("height", miniH - 4)
      .attr("fill", "#3a5a2a")
      .attr("rx", "2")
      .style("cursor", "ew-resize");

    miniG.append("g")
      .attr("transform", `translate(0,${miniH - 2})`)
      .call(d3.axisBottom(miniX).ticks(6).tickFormat(d3.format("d")))
      .selectAll("text").style("fill", "var(--muted)").style("font-size", "7px");
    miniG.selectAll("line,path").style("stroke", "var(--line)");
  }

  // Drag on mini chart to pan the time window
  const miniDrag = d3.drag()
    .on("start", function () {
      d3.select(this).select(".zoom-window").style("cursor", "grabbing");
    })
    .on("drag", function (event) {
      const miniX = d3.scaleLinear().domain([1990, 2024]).range([0, innerW]);
      const span = miniDomains[1] - miniDomains[0];
      const dx = event.dx;
      const yearDelta = (dx / innerW) * 34; // 34 years across full width

      let newStart = miniDomains[0] + yearDelta;
      let newEnd = miniDomains[1] + yearDelta;

      // Clamp
      if (newStart < 1990) { newStart = 1990; newEnd = 1990 + span; }
      if (newEnd > 2024) { newEnd = 2024; newStart = 2024 - span; }

      miniDomains = [newStart, newEnd];
      xDomain = [newStart, newEnd];
      render();
    })
    .on("end", function () {
      d3.select(this).select(".zoom-window").style("cursor", "grab");
    });

  miniG.call(miniDrag);

  function updateYDomain() {
    const maxVal = d3.max(timelineData, d => {
      let max = showGlobal ? (d.Global_Production_tonnes || 0) : 0;
      visibleCountries.forEach(cn => {
        const key = cn + "_tonnes";
        if (d[key] != null && d[key] > max) max = d[key];
      });
      return max;
    }) || 1000000;
    yScale.domain([0, maxVal * 1.05]);
  }

  function updateAxes() {
    xAxisG.call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(Math.min(10, xDomain[1] - xDomain[0] + 1)));
    yAxisG.call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatCompact.format(d)));
    xAxisG.selectAll("text").style("fill", "var(--muted)").style("font-size", "9px");
    xAxisG.selectAll("line,path").style("stroke", "var(--line)");
    yAxisG.selectAll("text").style("fill", "var(--muted)").style("font-size", "9px");
    yAxisG.selectAll("line,path").style("stroke", "var(--line)");
    gridG.selectAll("*").remove();
    gridG.call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(""))
      .selectAll("line").style("stroke", "var(--line)").style("stroke-opacity", "0.4");
    gridG.selectAll("path").remove();
  }

  function renderLines() {
    updateYDomain();
    const line = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX)
      .defined(d => d.value != null);

    // Global area — gradient fill (only if toggled on)
    clipG.selectAll(".global-area").remove();
    clipG.selectAll(".global-line").remove();
    if (showGlobal) {
      const gradId = "timeline-global-grad";
      svg.select("defs").selectAll(`#${gradId}`).remove();
      const grad = svg.select("defs").append("linearGradient").attr("id", gradId)
        .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
      grad.append("stop").attr("offset", "0%").attr("stop-color", "#d4842a").attr("stop-opacity", "0.3");
      grad.append("stop").attr("offset", "100%").attr("stop-color", "#d4842a").attr("stop-opacity", "0.03");
      clipG.append("path")
        .datum(timelineData)
        .attr("class", "global-area")
        .attr("d", d3.area()
          .x(d => xScale(d.Year))
          .y0(innerMainH)
          .y1(d => yScale(d.Global_Production_tonnes))
          .curve(d3.curveMonotoneX))
        .attr("fill", `url(#${gradId})`);

      clipG.append("path")
        .datum(timelineData)
        .attr("class", "global-line")
        .attr("d", d3.line()
          .x(d => xScale(d.Year))
          .y(d => yScale(d.Global_Production_tonnes))
          .curve(d3.curveMonotoneX))
        .attr("fill", "none")
        .attr("stroke", "#d4842a")
        .attr("stroke-width", "3")
        .attr("opacity", "0.9");
    }

    // Country lines
    const countryData = countryKeys.filter(k => visibleCountries.has(k)).map(cn => ({
      key: cn,
      en: countryNamesEN[cn],
      color: countryColors[countryNamesEN[cn]],
      data: timelineData.map(d => ({ Year: d.Year, value: d[cn + "_tonnes"] }))
    }));

    const lineGroups = clipG.selectAll("g.country-line-group")
      .data(countryData, d => d.key);

    lineGroups.exit().remove();

    const enterGroups = lineGroups.enter().append("g").attr("class", "country-line-group");
    enterGroups.append("path").attr("class", "country-line");

    const allGroups = enterGroups.merge(lineGroups);

    allGroups.select(".country-line")
      .transition().duration(400)
      .attr("d", d => line(d.data))
      .attr("fill", "none")
      .attr("stroke", d => d.color)
      .attr("stroke-width", d => d.key === "巴西" ? "2.5" : "1.6")
      .attr("stroke-linecap", "round")
      .attr("opacity", "0.85");
  }

  function render() {
    xScale.domain(xDomain);
    renderLines();
    updateAxes();
    renderMini();
  }

  render();

  // ResizeObserver
  const chartFrameEl = body.node()?.closest(".chart-frame");
  if (chartFrameEl) {
    const observer = new ResizeObserver(() => {
      const w = Math.max(340, svgWrap.node()?.getBoundingClientRect().width || 640);
      const h = 400;
      svg.attr("viewBox", `0 0 ${w} ${h}`);
    });
    observer.observe(chartFrameEl);
  }
}
