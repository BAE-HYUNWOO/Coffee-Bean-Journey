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
  // Temporarily position off-screen to measure
  tooltip.style.transform = "translate(-9999px, -9999px)";
  tooltip.style.opacity = "1";

  // Measure and adjust
  const rect = tooltip.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  let x = event.clientX + gap;
  let y = event.clientY + gap;

  // Flip left if overflows right edge
  if (x + rect.width > vw - gap) {
    x = event.clientX - rect.width - gap;
  }
  // Flip up if overflows bottom edge
  if (y + rect.height > vh - gap) {
    y = event.clientY - rect.height - gap;
  }
  // Clamp to viewport
  x = Math.max(gap, x);
  y = Math.max(gap, y);

  tooltip.style.transform = `translate(${x}px, ${y}px)`;
}

export function hideTooltip() {
  createTooltip().style.opacity = "0";
}
