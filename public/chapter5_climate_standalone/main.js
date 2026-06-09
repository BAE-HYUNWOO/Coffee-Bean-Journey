const GRID_DATA_URL = "数据/d3_ready_grid.csv"; 
const SCATTER_DATA_URL = "数据/d3_ready_scatter.csv";
const WORLD_GEOJSON = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// ==========================================
// 1. 绘制气候风险地图 (带连续型图例)
// ==========================================
function drawRiskMap() {
    const width = document.getElementById("risk-map").clientWidth;
    const height = 500;
    const svg = d3.select("#risk-map").append("svg").attr("width", width).attr("height", height);
    const projection = d3.geoNaturalEarth1().scale(width / 5.5).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    Promise.all([d3.json(WORLD_GEOJSON), d3.csv(GRID_DATA_URL)]).then(function([world, gridData]) {
        // 底图稍微深一点，衬托数据点
        svg.append("g").selectAll("path").data(world.features).enter().append("path")
            .attr("d", path).attr("fill", "#ccd1d9").attr("stroke", "#ffffff").attr("stroke-width", 0.5);

        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateYlOrRd)
            .domain(d3.extent(gridData, d => +d.temp_diff));

        svg.append("g").selectAll("circle").data(gridData).enter().append("circle")
            .attr("cx", d => projection([+d.lon, +d.lat])[0])
            .attr("cy", d => projection([+d.lon, +d.lat])[1])
            .attr("r", 1.5) // 缩小像素点，让图表更精致
            .attr("fill", d => colorScale(+d.temp_diff))
            .attr("opacity", 0.7);

        // 绘制连续型图例 (右上角)
        drawContinuousLegend("#legend-risk", colorScale, "升温幅度 (°C)");
    });
}

// 辅助函数：绘制连续型色带图例
function drawContinuousLegend(selector, colorScale, title) {
    const w = 200, h = 15;
    const legendSvg = d3.select(selector).append("svg").attr("width", w + 50).attr("height", 40);
    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "linear-gradient");
    
    linearGradient.selectAll("stop")
        .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
        .enter().append("stop").attr("offset", d => d.offset).attr("stop-color", d => d.color);

    legendSvg.append("rect").attr("width", w).attr("height", h).attr("y", 15).style("fill", "url(#linear-gradient)");
    
    legendSvg.append("text").attr("x", 0).attr("y", 10).text(title).style("font-size", "12px").style("fill", "#333");
    legendSvg.append("text").attr("x", 0).attr("y", 40).text("低").style("font-size", "10px");
    legendSvg.append("text").attr("x", w).attr("y", 40).text("高").style("font-size", "10px").attr("text-anchor", "end");
}

// ==========================================
// 2. 绘制未来种植区变化模拟地图 (扩展至全球)
// ==========================================
function drawSimMap() {
    const width = document.getElementById("sim-map").clientWidth;
    const height = 500;
    const svg = d3.select("#sim-map").append("svg").attr("width", width).attr("height", height);
    const projection = d3.geoNaturalEarth1().scale(width / 5.5).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    Promise.all([d3.json(WORLD_GEOJSON), d3.csv(GRID_DATA_URL)]).then(function([world, gridData]) {
        svg.append("g").selectAll("path").data(world.features).enter().append("path")
            .attr("d", path).attr("fill", "#e1e5ea").attr("stroke", "#ffffff").attr("stroke-width", 0.5);

        const circles = svg.append("g").selectAll("circle").data(gridData).enter().append("circle")
            .attr("cx", d => projection([+d.lon, +d.lat])[0])
            .attr("cy", d => projection([+d.lon, +d.lat])[1])
            .attr("r", 2)
            .attr("fill", "#27ae60")
            .attr("opacity", d => +d.hist_suit === 1 ? 0.8 : 0); // 现状下不适宜的区域透明不可见

        let isFuture = false;
        d3.select("#toggle-sim").on("click", function() {
            isFuture = !isFuture;
            d3.select(this).text(isFuture ? "恢复至 当前现状" : "切换至 2050 年预测");
            
            circles.transition().duration(1000)
                .attr("opacity", d => {
                    const suit = isFuture ? +d.future_suit : +d.hist_suit;
                    return suit === 1 ? 0.8 : 0;
                })
                .attr("fill", d => {
                    // 绿色代表适宜，消失的地方颜色渐渐变淡
                    return "#27ae60"; 
                });
        });
    });
}

// ==========================================
// 3. 模块三重构 A：哑铃图 (升温跨度)
// ==========================================
function drawDumbbellChart() {
    const container = document.getElementById("dumbbell-chart");
    const margin = {top: 30, right: 30, bottom: 40, left: 70};
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select("#dumbbell-chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv(SCATTER_DATA_URL).then(function(data) {
        // Y 轴：国家名称
        const y = d3.scaleBand().range([0, height]).domain(data.map(d => d.Country)).padding(1);
        svg.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

        // X 轴：温度
        const minTemp = d3.min(data, d => Math.min(+d.Hist_Temp, +d.Future_Temp)) - 1;
        const maxTemp = d3.max(data, d => Math.max(+d.Hist_Temp, +d.Future_Temp)) + 1;
        const x = d3.scaleLinear().domain([minTemp, maxTemp]).range([0, width]);
        svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));

        // 画连接线
        svg.selectAll("line.connector").data(data).enter().append("line").attr("class", "connector")
            .attr("x1", d => x(+d.Hist_Temp)).attr("x2", d => x(+d.Future_Temp))
            .attr("y1", d => y(d.Country)).attr("y2", d => y(d.Country))
            .attr("stroke", "#bdc3c7").attr("stroke-width", "3px");

        // 画现状点 (蓝色)
        svg.selectAll("circle.hist").data(data).enter().append("circle").attr("class", "hist")
            .attr("cx", d => x(+d.Hist_Temp)).attr("cy", d => y(d.Country))
            .attr("r", 6).style("fill", "#3498db");

        // 画未来点 (红色)
        svg.selectAll("circle.fut").data(data).enter().append("circle").attr("class", "fut")
            .attr("cx", d => x(+d.Future_Temp)).attr("cy", d => y(d.Country))
            .attr("r", 6).style("fill", "#e74c3c");

        // 图例
        svg.append("circle").attr("cx",width-80).attr("cy",-10).attr("r",4).style("fill", "#3498db");
        svg.append("text").attr("x",width-70).attr("y",-7).text("现状").style("font-size","10px");
        svg.append("circle").attr("cx",width-40).attr("cy",-10).attr("r",4).style("fill", "#e74c3c");
        svg.append("text").attr("x",width-30).attr("y",-7).text("2050年").style("font-size","10px");
    });
}

// ==========================================
// 3. 模块三重构 B：气泡地图 (产量与风险)
// ==========================================
function drawBubbleMap() {
    const container = document.getElementById("bubble-map");
    const width = container.clientWidth;
    const height = 350;

    const svg = d3.select("#bubble-map").append("svg").attr("width", width).attr("height", height);
    // 这里使用放大版的投影，只聚焦主要产区
// 恢复为与前两张图一致的全局标准缩放比例，并完美居中
const projection = d3.geoNaturalEarth1()
.scale(width / 5.5) 
.translate([width / 2, height / 2]);    const path = d3.geoPath().projection(projection);

    Promise.all([d3.json(WORLD_GEOJSON), d3.csv(SCATTER_DATA_URL)]).then(function([world, scatterData]) {
        svg.append("g").selectAll("path").data(world.features).enter().append("path")
            .attr("d", path).attr("fill", "#e8ecef").attr("stroke", "#ffffff");

        // 气泡大小比例尺 (产量)
        const sizeScale = d3.scaleSqrt().domain([0, d3.max(scatterData, d => +d.Production_tonnes)]).range([2, 25]);
        // 气泡颜色比例尺 (升温差值)
        const colorScale = d3.scaleSequential().interpolator(d3.interpolateYlOrRd).domain(d3.extent(scatterData, d => +d.Temp_Rise));

        // 国家经纬度坐标（用于在地图上定位气泡）
        const coords = { '巴西': [-55, -10], '越南': [108, 14], '哥伦比亚': [-73, 4], '印度尼西亚': [115, -2], '埃塞俄比亚': [39, 9] };

        svg.selectAll("circle").data(scatterData).enter().append("circle")
            .attr("cx", d => projection(coords[d.Country])[0])
            .attr("cy", d => projection(coords[d.Country])[1])
            .attr("r", d => sizeScale(+d.Production_tonnes))
            .style("fill", d => colorScale(+d.Temp_Rise))
            .style("stroke", "#2c3e50").style("stroke-width", 1).style("opacity", 0.8);

        svg.selectAll("text").data(scatterData).enter().append("text")
            .attr("x", d => projection(coords[d.Country])[0])
            .attr("y", d => projection(coords[d.Country])[1] - sizeScale(+d.Production_tonnes) - 5)
            .text(d => d.Country).style("text-anchor", "middle").style("font-size", "11px").style("font-weight", "bold").style("fill", "#333");
    });
}

// 触发绘图
drawRiskMap();
drawSimMap();
drawDumbbellChart();
drawBubbleMap();