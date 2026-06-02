
import { chartFrame, getSvg } from "./chartFrame.js";

export function drawMapSlot(containerSelector, options = {}) {
  const { body } = chartFrame(containerSelector, {
    title: options.title,
    tag: options.tag || "Map",
    description: options.description,
    wide: options.wide
  });

  const { svg, width, height } = getSvg(body, options.wide ? 320 : 270);

  svg.append("rect")
    .attr("x", 24)
    .attr("y", 22)
    .attr("width", width - 48)
    .attr("height", height - 44)
    .attr("rx", 32)
    .attr("class", "map-surface");

  const blobs = [
    "M93,124 C126,72 188,83 201,134 C220,191 121,204 92,160 C79,142 79,139 93,124Z",
    "M292,103 C330,69 410,78 425,129 C440,183 367,207 313,179 C269,157 262,129 292,103Z",
    "M466,171 C506,136 586,148 601,195 C615,237 543,262 490,238 C455,220 441,194 466,171Z"
  ];

  blobs.forEach((d, i) => {
    svg.append("path")
      .attr("d", d)
      .attr("transform", `scale(${width / 700}) translate(${i * 5}, ${height > 290 ? 14 : 0})`)
      .attr("class", "map-blob");
  });

  d3.range(8).forEach((i) => {
    const x = 80 + ((i * 83) % (width - 160));
    const y = 70 + ((i * 47) % (height - 130));
    svg.append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 5 + (i % 3) * 3)
      .attr("class", "map-point");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 30)
    .attr("text-anchor", "middle")
    .attr("class", "slot-label")
    .text(options.label || "World map slot");
}

export function drawBarSlot(containerSelector, options = {}) {
  const { body } = chartFrame(containerSelector, {
    title: options.title,
    tag: options.tag || "Ranking",
    description: options.description,
    wide: options.wide
  });

  const { svg, width, height } = getSvg(body, 270);
  const values = [96, 84, 72, 66, 54, 42, 34];
  const x = d3.scaleLinear().domain([0, 100]).range([0, width - 170]);

  values.forEach((value, i) => {
    const y = 38 + i * 28;
    svg.append("text")
      .attr("x", 28)
      .attr("y", y + 14)
      .attr("class", "axis-text")
      .text(`Rank ${i + 1}`);
    svg.append("rect")
      .attr("x", 100)
      .attr("y", y)
      .attr("width", x(value))
      .attr("height", 17)
      .attr("rx", 9)
      .attr("class", "bar-shape");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 24)
    .attr("text-anchor", "middle")
    .attr("class", "slot-label")
    .text(options.label || "Bar chart slot");
}

export function drawLineSlot(containerSelector, options = {}) {
  const { body } = chartFrame(containerSelector, {
    title: options.title,
    tag: options.tag || "Timeline",
    description: options.description,
    wide: options.wide
  });

  const { svg, width, height } = getSvg(body, 280);
  const data = d3.range(14).map(i => ({
    x: i,
    y: 55 + Math.sin(i / 1.45) * 23 + i * 4.6
  }));
  const x = d3.scaleLinear().domain([0, 13]).range([36, width - 38]);
  const y = d3.scaleLinear().domain([25, 145]).range([height - 48, 36]);

  svg.append("path")
    .datum(data)
    .attr("d", d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveCatmullRom))
    .attr("class", "line-shape");

  svg.append("path")
    .datum(data.map(d => ({...d, y: d.y - 22 + Math.cos(d.x) * 10})))
    .attr("d", d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveCatmullRom))
    .attr("class", "line-shape secondary");

  data.forEach(d => {
    svg.append("circle")
      .attr("cx", x(d.x))
      .attr("cy", y(d.y))
      .attr("r", 4)
      .attr("class", "line-point");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 23)
    .attr("text-anchor", "middle")
    .attr("class", "slot-label")
    .text(options.label || "Time-series slot");
}

export function drawSankeySlot(containerSelector, options = {}) {
  const { body } = chartFrame(containerSelector, {
    title: options.title,
    tag: options.tag || "Flow",
    description: options.description,
    wide: true
  });

  const { svg, width, height } = getSvg(body, 330);

  const left = [62, 135, 208];
  const mid = [94, 178];
  const right = [75, 150, 225];

  function node(x, y, label) {
    svg.append("rect")
      .attr("x", x)
      .attr("y", y)
      .attr("width", 104)
      .attr("height", 32)
      .attr("rx", 16)
      .attr("class", "sankey-node");
    svg.append("text")
      .attr("x", x + 52)
      .attr("y", y + 21)
      .attr("text-anchor", "middle")
      .attr("class", "node-text")
      .text(label);
  }

  left.forEach((y, i) => node(34, y, `Origin ${i + 1}`));
  mid.forEach((y, i) => node(width / 2 - 52, y, `Hub ${i + 1}`));
  right.forEach((y, i) => node(width - 138, y, `Market ${i + 1}`));

  left.forEach((ly, i) => {
    mid.forEach((my, j) => {
      svg.append("path")
        .attr("d", `M138,${ly + 16} C${width * 0.28},${ly + 16} ${width * 0.35},${my + 16} ${width / 2 - 52},${my + 16}`)
        .attr("class", "flow-shape")
        .attr("stroke-width", 5 + ((i + j) % 3) * 4);
    });
  });

  mid.forEach((my, i) => {
    right.forEach((ry, j) => {
      if ((i + j) !== 3) {
        svg.append("path")
          .attr("d", `M${width / 2 + 52},${my + 16} C${width * 0.64},${my + 16} ${width * 0.74},${ry + 16} ${width - 138},${ry + 16}`)
          .attr("class", "flow-shape")
          .attr("stroke-width", 5 + ((i + j) % 3) * 4);
      }
    });
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 24)
    .attr("text-anchor", "middle")
    .attr("class", "slot-label")
    .text(options.label || "Sankey / flow slot");
}

export function drawScatterSlot(containerSelector, options = {}) {
  const { body } = chartFrame(containerSelector, {
    title: options.title,
    tag: options.tag || "Relationship",
    description: options.description,
    wide: options.wide
  });

  const { svg, width, height } = getSvg(body, 270);
  const x = d3.scaleLinear().domain([0, 100]).range([44, width - 35]);
  const y = d3.scaleLinear().domain([0, 100]).range([height - 48, 35]);

  d3.range(38).forEach(i => {
    const xv = (i * 19) % 100;
    const yv = 78 - xv * 0.42 + ((i * 31) % 38);
    svg.append("circle")
      .attr("cx", x(xv))
      .attr("cy", y(Math.max(8, Math.min(95, yv))))
      .attr("r", 4 + (i % 4))
      .attr("class", "scatter-point");
  });

  svg.append("line")
    .attr("x1", x(6))
    .attr("y1", y(80))
    .attr("x2", x(95))
    .attr("y2", y(38))
    .attr("class", "trend-shape");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 23)
    .attr("text-anchor", "middle")
    .attr("class", "slot-label")
    .text(options.label || "Scatter plot slot");
}

export function drawNetworkSlot(containerSelector, options = {}) {
  const { body } = chartFrame(containerSelector, {
    title: options.title,
    tag: options.tag || "Network",
    description: options.description,
    wide: options.wide
  });

  const { svg, width, height } = getSvg(body, 270);
  const nodes = d3.range(11).map(i => ({
    x: width * (0.16 + ((i * 37) % 72) / 100),
    y: height * (0.18 + ((i * 29) % 62) / 100),
    r: 5 + (i % 4) * 3
  }));

  nodes.forEach((a, i) => {
    nodes.forEach((b, j) => {
      if (i < j && (i + j) % 4 === 0) {
        svg.append("line")
          .attr("x1", a.x)
          .attr("y1", a.y)
          .attr("x2", b.x)
          .attr("y2", b.y)
          .attr("class", "network-edge");
      }
    });
  });

  nodes.forEach((n, i) => {
    svg.append("circle")
      .attr("cx", n.x)
      .attr("cy", n.y)
      .attr("r", n.r)
      .attr("class", i === 0 ? "network-node hub" : "network-node");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 23)
    .attr("text-anchor", "middle")
    .attr("class", "slot-label")
    .text(options.label || "Network graph slot");
}
