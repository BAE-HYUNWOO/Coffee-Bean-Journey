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

export function routeKey(d) {
  if (!d) return "";
  return `${d.year ?? ""}::${d.exporter ?? d.source ?? ""}::${d.importer ?? d.target ?? ""}`;
}

export function routeDetailHTML(d, metric = "trade_value_usd") {
  if (!d) {
    return `<b>Click a route or country</b><br/>Hover for quick tooltips, click to pin details here.`;
  }
  if (d.type === "country") {
    return `
      <b>${d.country}</b><br/>
      Role: ${d.roleLabel || d.role || "trade node"}<br/>
      Selected metric: ${metricFormatter(metric)(d.value || 0)}<br/>
      Click another node, route, or bar to replace this card.
    `;
  }
  return `
    <b>${d.exporter} → ${d.importer}</b><br/>
    Year: ${d.year}<br/>
    Trade value: ${formatMoney(d.trade_value_usd)}<br/>
    Net weight: ${formatKg(d.net_weight_kg)}<br/>
    Unit value: ${Number(d.value_per_kg || 0).toFixed(2)} $/kg
  `;
}

export function createTooltip(root) {
  let tip = root.select(".chapter2-tooltip");
  if (tip.empty()) {
    tip = root.append("div").attr("class", "chapter2-tooltip");
  }
  const show = (event, html) => {
    const [x, y] = d3.pointer(event, root.node());
    tip.html(html)
      .style("opacity", 1)
      .style("transform", `translate(${x + 18}px, ${y + 18}px)`);
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
