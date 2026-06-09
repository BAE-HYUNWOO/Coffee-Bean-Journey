import * as d3 from "d3";
import { chartFrame, getSvg } from "../../components/chartFrame.js";
import { showTooltip, hideTooltip } from "../../shared/tooltip.js";
import { formatCompact } from "../../shared/formatters.js";

const countryNamesEN = {
  "巴西": "Brazil", "越南": "Vietnam", "哥伦比亚": "Colombia",
  "印度尼西亚": "Indonesia", "埃塞俄比亚": "Ethiopia", "乌干达": "Uganda",
  "印度": "India", "秘鲁": "Peru", "洪都拉斯": "Honduras",
  "中非共和国": "C.A.R.", "墨西哥": "Mexico",
  "危地马拉": "Guatemala", "哥斯达黎加": "Costa Rica",
  "萨尔瓦多": "El Salvador", "厄瓜多尔": "Ecuador",
  "科特迪瓦": "Côte d'Ivoire", "布隆迪": "Burundi", "几内亚": "Guinea"
};

const countryColors = {
  "Brazil": "#6f432b", "Vietnam": "#4a7c59", "Colombia": "#c98f4f",
  "Indonesia": "#be704a", "Ethiopia": "#7f9e70", "Uganda": "#b85c3a",
  "India": "#c4823d", "Peru": "#8b6e4e", "Honduras": "#5d8a9e",
  "C.A.R.": "#9b7a5a", "Mexico": "#8b7355",
  "Guatemala": "#7a9a6e", "Costa Rica": "#b8936e",
  "El Salvador": "#6e8a7a", "Ecuador": "#a08060",
  "Côte d'Ivoire": "#c4946a", "Burundi": "#9a7060", "Guinea": "#8a8a70"
};

export function drawBarRaceChart(containerSelector, { rankingData, timelineData: tlData }) {
  const { body } = chartFrame(containerSelector, {
    title: "Top 10 Producers Race",
    tag: "Animated Ranking",
    description: "Ranking evolution of top coffee producers, 1990–2024. Press play to watch from the beginning.",
    wide: false
  });

  body.node()?.closest(".chart-frame")?.querySelector(".chart-frame-header em")?.remove();

  // State — start at 2024 (latest year)
  let currentYear = 2024;
  let playing = false;
  let timer = null;
  let speed = 1000;

  const years = d3.range(1990, 2025);

  // Build ranking map
  const rankingMap = new Map();
  years.forEach(y => {
    const rows = rankingData.filter(d => d.Year === y).sort((a, b) => b.Production_tonnes - a.Production_tonnes);
    const prevRows = y > 1990
      ? rankingData.filter(d => d.Year === y - 1).sort((a, b) => b.Production_tonnes - a.Production_tonnes)
      : [];
    const prevRankMap = new Map(prevRows.map((r, i) => [r.Country, i + 1]));
    rankingMap.set(y, rows.slice(0, 10).map((r, i) => ({
      country: r.Country,
      en: countryNamesEN[r.Country] || r.Country,
      production: r.Production_tonnes,
      rank: i + 1,
      prevRank: prevRankMap.get(r.Country) || null,
      color: countryColors[countryNamesEN[r.Country]] || "#999"
    })));
  });

  // Controls
  const controls = body.append("div")
    .attr("class", "bar-race-controls")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("padding", "0 8px 10px")
    .style("flex-wrap", "wrap");

  // Play button
  const playBtn = controls.append("button")
    .attr("class", "race-play-btn")
    .style("width", "36px").style("height", "36px")
    .style("border-radius", "50%")
    .style("border", "1px solid var(--accent)")
    .style("background", "transparent")
    .style("color", "var(--accent)")
    .style("font-size", "0.9rem")
    .style("cursor", "pointer")
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("transition", "all 0.2s")
    .style("flex-shrink", "0")
    .text("▶");

  // Year display
  const yearDisplay = controls.append("div")
    .attr("class", "race-year-display")
    .style("font-family", "'Cormorant Garamond', serif")
    .style("font-size", "2.2rem")
    .style("font-weight", "700")
    .style("color", "var(--accent)")
    .style("min-width", "70px")
    .style("text-align", "center")
    .style("line-height", "1")
    .text("2024");

  // Speed buttons
  const speeds = [
    { label: "0.5×", val: 2000 },
    { label: "1×", val: 1000 },
    { label: "2×", val: 500 },
    { label: "5×", val: 200 }
  ];

  speeds.forEach(s => {
    const btn = controls.append("button")
      .attr("class", "race-speed-btn")
      .text(s.label)
      .style("background", speed === s.val ? "var(--accent)" : "transparent")
      .style("color", speed === s.val ? "#fff" : "var(--muted)")
      .style("border", speed === s.val ? "1px solid var(--accent)" : "1px solid var(--line)")
      .style("padding", "3px 8px")
      .style("border-radius", "999px")
      .style("cursor", "pointer")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "0.65rem")
      .style("font-weight", "600")
      .style("transition", "all 0.2s");
    btn.on("click", () => {
      speed = s.val;
      controls.selectAll("button.race-speed-btn").each(function () {
        const spdVal = speeds.find(sp => sp.label === d3.select(this).text())?.val;
        d3.select(this)
          .style("background", speed === spdVal ? "var(--accent)" : "transparent")
          .style("color", speed === spdVal ? "#fff" : "var(--muted)")
          .style("border", speed === spdVal ? "1px solid var(--accent)" : "1px solid var(--line)");
      });
      if (playing) { stopPlay(); startPlay(); }
    });
  });

  // Year slider
  const slider = controls.append("input")
    .attr("type", "range")
    .attr("min", 1990).attr("max", 2024).attr("value", 2024)
    .style("width", "100px")
    .style("accent-color", "var(--accent)")
    .style("cursor", "pointer");

  // SVG
  // The bar-race card is tall and narrow in the final layout.
  // A taller viewBox avoids vertical letterboxing and lets the ranking fill the card.
  const svgWrap = body.append("div").attr("class", "bar-race-svg-wrap");
  const { svg, width } = getSvg(svgWrap, 620);

  const margin = { top: 18, right: 132, bottom: 22, left: 68 };
  const innerW = width - margin.left - margin.right;
  const innerH = 560;
  svg.attr("viewBox", `0 0 ${width} ${innerH + margin.top + margin.bottom}`);

  const chartG = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().range([0, innerW]);
  const yScale = d3.scaleBand().range([0, innerH]).padding(0.15);

  // Progress bar
  const progressBar = body.append("div")
    .style("width", "100%")
    .style("height", "4px")
    .style("background", "var(--line)")
    .style("border-radius", "2px")
    .style("margin-top", "8px")
    .style("cursor", "pointer");

  const progressFill = progressBar.append("div")
    .style("height", "100%")
    .style("background", "var(--accent)")
    .style("border-radius", "2px")
    .style("width", "100%")
    .style("transition", "width 0.3s ease");

  progressBar.on("click", function (event) {
    const rect = this.getBoundingClientRect();
    const pct = (event.clientX - rect.left) / rect.width;
    const yr = Math.round(1990 + pct * 34);
    stopPlay();
    seekTo(yr);
  });

  function updateProgress() {
    const pct = ((currentYear - 1990) / 34) * 100;
    progressFill.style("width", pct + "%");
  }

  function renderFrame(year) {
    const data = rankingMap.get(year) || [];
    const maxProd = d3.max(data, d => d.production) || 1;
    xScale.domain([0, maxProd * 1.15]);
    yScale.domain(data.map(d => d.country));

    // Bars
    const barGroups = chartG.selectAll("g.bar-group").data(data, d => d.country);
    barGroups.exit().remove();
    const enterGroups = barGroups.enter().append("g").attr("class", "bar-group");

    const allGroups = enterGroups.merge(barGroups);
    allGroups.transition().duration(speed * 0.7).ease(d3.easeCubicInOut)
      .attr("transform", d => `translate(0,${yScale(d.country)})`);

    // Bar rect
    const rects = allGroups.selectAll("rect.bar-rect").data(d => [d]);
    rects.exit().remove();
    rects.enter().append("rect").attr("class", "bar-rect")
      .merge(rects)
      .transition().duration(speed * 0.7).ease(d3.easeCubicInOut)
      .attr("x", 0)
      .attr("y", yScale.bandwidth() * 0.1)
      .attr("width", d => Math.max(4, xScale(d.production)))
      .attr("height", yScale.bandwidth() * 0.8)
      .attr("fill", d => d.color)
      .attr("rx", "6")
      .attr("opacity", "0.9");

    // Rank number — left of bar, right-aligned
    allGroups.selectAll("text.rank-num").data(d => [d]).join("text")
      .attr("class", "rank-num")
      .attr("x", -8)
      .attr("y", yScale.bandwidth() / 2 + 5)
      .attr("text-anchor", "end")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", d => d.rank <= 3 ? "12px" : "10px")
      .attr("font-weight", "700")
      .attr("fill", d => d.rank === 1 ? "#FFD700" : d.rank === 2 ? "#C0C0C0" : d.rank === 3 ? "#CD7F32" : "var(--muted)")
      .attr("stroke", "rgba(0,0,0,0.3)")
      .attr("stroke-width", "2")
      .attr("paint-order", "stroke")
      .text(d => d.rank);

    // Country name — inside the bar, white with shadow for legibility
    allGroups.selectAll("text.country-name").data(d => [d]).join("text")
      .attr("class", "country-name")
      .attr("x", 10)
      .attr("y", yScale.bandwidth() / 2 + 5)
      .attr("font-family", "'Cormorant Garamond', serif")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", "#fff")
      .attr("stroke", "rgba(0,0,0,0.25)")
      .attr("stroke-width", "3")
      .attr("paint-order", "stroke")
      .text(d => d.en);

    // Production value + rank change — right of bar end
    allGroups.selectAll("text.prod-val").data(d => [d]).join("text")
      .attr("class", "prod-val")
      .attr("x", d => Math.max(4, xScale(d.production)) + 10)
      .attr("y", yScale.bandwidth() / 2 - 2)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "9px")
      .attr("font-weight", "700")
      .attr("fill", "var(--coffee-dark)")
      .text(d => formatCompact.format(d.production) + " t");

    // Rank change indicator on a second line below the value
    allGroups.selectAll("text.rank-change").data(d => [d]).join("text")
      .attr("class", "rank-change")
      .attr("x", d => Math.max(4, xScale(d.production)) + 10)
      .attr("y", yScale.bandwidth() / 2 + 12)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "8px")
      .attr("font-weight", "700")
      .attr("fill", d => {
        if (d.prevRank === null) return "transparent";
        if (d.rank < d.prevRank) return "#2d7a3a";
        if (d.rank > d.prevRank) return "#c0392b";
        return "var(--muted)";
      })
      .text(d => {
        if (d.prevRank === null) return "";
        const diff = d.prevRank - d.rank;
        if (diff > 0) return "↑" + diff;
        if (diff < 0) return "↓" + Math.abs(diff);
        return "—";
      });

    // Hover
    allGroups.on("mouseenter", function (event, d) {
      // Sparkline data
      const sparkData = years.map(y => {
        const rows = rankingMap.get(y) || [];
        const found = rows.find(r => r.country === d.country);
        return { year: y, production: found ? found.production : 0, rank: found ? found.rank : null };
      }).filter(r => r.rank !== null);

      const sparkW = 140, sparkH = 28;
      const sparkX = d3.scaleLinear().domain([1990, 2024]).range([0, sparkW]);
      const sparkY = d3.scaleLinear()
        .domain([0, d3.max(sparkData, r => r.production) || 1])
        .range([sparkH, 0]);
      const sparkLine = d3.line()
        .x(r => sparkX(r.year))
        .y(r => sparkY(r.production))
        .curve(d3.curveMonotoneX);

      // Global total for this year
      const yearRow = tlData.find(r => r.Year === currentYear);
      const globalTotal = yearRow ? yearRow.Global_Production_tonnes : 1;
      const globalPct = ((d.production / globalTotal) * 100).toFixed(1);

      // Year-over-year change
      const prevYearRow = rankingMap.get(currentYear - 1);
      const prevEntry = prevYearRow ? prevYearRow.find(r => r.country === d.country) : null;
      const prevProd = prevEntry ? prevEntry.production : null;
      const yoyPct = prevProd ? (((d.production - prevProd) / prevProd) * 100).toFixed(1) : null;

      const rankDelta = d.prevRank !== null ? d.prevRank - d.rank : null;

      const html = `
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px;color:${d.color};border-bottom:1px solid var(--line);padding-bottom:6px;">
          ${d.en}  #${d.rank}
        </div>
        <div style="font-size:0.72rem;color:var(--coffee-dark);margin-bottom:8px;font-weight:600;">
          ${d3.format(",.0f")(d.production)} tonnes
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.68rem;margin-bottom:8px;">
          <div style="color:var(--soft);">Global share</div>
          <div style="text-align:right;font-weight:600;">${globalPct}%</div>
          <div style="color:var(--soft);">YoY change</div>
          <div style="text-align:right;font-weight:600;color:${yoyPct > 0 ? '#2d7a3a' : yoyPct < 0 ? '#c0392b' : 'var(--muted)'};">
            ${yoyPct !== null ? (yoyPct > 0 ? '+' : '') + yoyPct + '%' : '—'}
          </div>
          <div style="color:var(--soft);">Rank change</div>
          <div style="text-align:right;font-weight:600;color:${rankDelta > 0 ? '#2d7a3a' : rankDelta < 0 ? '#c0392b' : 'var(--muted)'};">
            ${rankDelta !== null ? (rankDelta > 0 ? '↑' : rankDelta < 0 ? '↓' : '—') + Math.abs(rankDelta) : '—'}
          </div>
        </div>
        <div style="font-size:0.6rem;color:var(--soft);margin-top:6px;margin-bottom:2px;">1990–2024 trend</div>
        <svg width="${sparkW}" height="${sparkH}" style="display:block;">
          <path d="${sparkLine(sparkData)}" fill="none" stroke="${d.color}" stroke-width="1.5" opacity="0.7"/>
        </svg>
      `;
      showTooltip(html, event);
    });

    allGroups.on("mousemove", function () { });
    allGroups.on("mouseleave", function () { hideTooltip(); });

    yearDisplay.text(year);
    slider.property("value", year);
    updateProgress();
  }

  function seekTo(year) {
    currentYear = Math.max(1990, Math.min(2024, year));
    renderFrame(currentYear);
  }

  function startPlay() {
    // If at the end (2024), restart from 1990
    if (currentYear >= 2024) {
      currentYear = 1989; // will become 1990 on first tick
    }
    playing = true;
    playBtn.text("⏸");
    playBtn.style("background", "var(--accent)").style("color", "#fff");
    timer = setInterval(() => {
      currentYear++;
      if (currentYear > 2024) {
        stopPlay();
        return;
      }
      renderFrame(currentYear);
    }, speed);
  }

  function stopPlay() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = null;
    playBtn.text("▶");
    playBtn.style("background", "transparent").style("color", "var(--accent)");
  }

  playBtn.on("click", () => {
    if (playing) stopPlay();
    else startPlay();
  });

  slider.on("input", function () {
    stopPlay();
    seekTo(+this.value);
  });

  // Keyboard
  function keyHandler(e) {
    const section = document.querySelector("#origin-visual");
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    if (e.key === " ") { e.preventDefault(); playBtn.node().click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); stopPlay(); seekTo(currentYear - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); stopPlay(); seekTo(currentYear + 1); }
  }
  document.addEventListener("keydown", keyHandler);

  // Initial render — show 2024
  renderFrame(2024);
  updateProgress();
}
