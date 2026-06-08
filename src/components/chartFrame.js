export function chartFrame(containerSelector, options = {}) {
  const {
    title = "Visualization",
    tag = "D3 panel",
    description = "",
    wide = false,
    status = "",
  } = options;

  const frame = d3.select(containerSelector)
    .append("article")
    .attr("class", `chart-frame ${wide ? "chart-wide" : ""}`);

  const header = frame.append("div").attr("class", "chart-frame-header");
  header.append("div").html(`<span>${tag}</span><h3>${title}</h3>`);
  if (status) header.append("em").text(status);

  const body = frame.append("div").attr("class", "chart-frame-body");
  if (description) {
    frame.append("p").attr("class", "chart-frame-description").text(description);
  }

  return { frame, body };
}

export function getSvg(body, height = 270) {
  const width = Math.max(340, body.node()?.getBoundingClientRect().width || 640);
  const svg = body.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  return { svg, width, height };
}
