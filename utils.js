import * as d3 from "d3";

export const DATA_BASE = "/data/chapter2_trade/processed/";

export function formatMoney(value) {
  const v = Number(value) || 0;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function formatKg(value) {
  const v = Number(value) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B kg`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M kg`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K kg`;
  return `${v.toFixed(0)} kg`;
}

export function metricLabel(metric) {
  return metric === "net_weight_kg" ? "Net weight" : "Trade value";
}

export function metricFormatter(metric) {
  return metric === "net_weight_kg" ? formatKg : formatMoney;
}

export function safeNumber(v) {
  const n = Number(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function topN(data, metric, n = 20) {
  return [...data]
    .filter(d => safeNumber(d[metric]) > 0)
    .sort((a, b) => safeNumber(b[metric]) - safeNumber(a[metric]))
    .slice(0, n);
}

export function createTooltip(root) {
  let tip = root.select(".chapter2-tooltip");
  if (tip.empty()) {
    tip = root.append("div").attr("class", "chapter2-tooltip");
  }
  const show = (event, html) => {
    tip.html(html)
      .style("opacity", 1)
      .style("transform", `translate(${event.offsetX + 18}px, ${event.offsetY + 18}px)`);
  };
  const hide = () => tip.style("opacity", 0);
  return { show, hide };
}

export function cleanContainer(node) {
  d3.select(node).selectAll("*").remove();
}

export function arcPath(projection, sourceLonLat, targetLonLat) {
  const s = projection(sourceLonLat);
  const t = projection(targetLonLat);
  if (!s || !t || s.some(Number.isNaN) || t.some(Number.isNaN)) return null;
  const dx = t[0] - s[0];
  const dy = t[1] - s[1];
  const dr = Math.sqrt(dx * dx + dy * dy) * 1.35;
  return `M${s[0]},${s[1]} A${dr},${dr} 0 0,1 ${t[0]},${t[1]}`;
}
