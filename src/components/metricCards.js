import * as d3 from "d3";

export function drawMetricCards(containerSelector, cards = []) {
  const root = d3.select(containerSelector).append("div").attr("class", "chapter-stats");
  cards.forEach((card) => {
    const item = root.append("div").attr("class", "chapter-stat");
    item.append("strong").text(card.value);
    item.append("span").text(card.label);
  });
}
