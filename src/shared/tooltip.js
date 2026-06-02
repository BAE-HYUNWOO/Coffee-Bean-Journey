export function createTooltip() {
  let tooltip = document.querySelector(".tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

export function showTooltip(html, event) {
  const tooltip = createTooltip();
  tooltip.innerHTML = html;
  tooltip.style.opacity = "1";
  tooltip.style.transform = `translate(${event.clientX + 16}px, ${event.clientY + 16}px)`;
}

export function hideTooltip() {
  createTooltip().style.opacity = "0";
}
