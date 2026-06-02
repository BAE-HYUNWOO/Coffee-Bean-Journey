import * as d3 from "d3";

export function drawLegend(containerSelector, items = []) {
  const legend = d3.select(containerSelector).append("div").attr("class", "legend");
  items.forEach((item) => {
    const row = legend.append("div").attr("class", "legend-row");
    row.append("span").style("background", item.color);
    row.append("p").text(item.label);
  });
}
