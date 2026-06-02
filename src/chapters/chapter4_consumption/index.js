import * as d3 from 'd3';

let currentSvg = null;
let tooltip = null;

function getTooltip() {
    if (!tooltip) {
        tooltip = d3.select('body').append('div')
            .attr('class', 'chapter4-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.7)')
            .style('color', '#fff')
            .style('padding', '6px 10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', '1000');
    }
    return tooltip;
}

function showTooltip(event, text) {
    const tt = getTooltip();
    tt.style('opacity', 1)
        .html(text)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px');
}

function hideTooltip() {
    if (tooltip) tooltip.style('opacity', 0);
}

export async function init(containerId) {
    const container = d3.select(`#${containerId}`);
    container.html('<div style="padding:20px; text-align:center; background:#f0f0f0; border-radius:8px;">📊 正在加载咖啡消费数据...</div>');

    try {
        // 加载 CSV 文件 - 路径修正为 Live Server 根目录下的实际位置
        const disRaw = await d3.csv('/Coffee-Bean-Journey/public/data/chapter4_consumption/archive/disappearance.csv');
        const domRaw = await d3.csv('/Coffee-Bean-Journey/public/data/chapter4_consumption/archive/domestic-consumption.csv');

        if (!disRaw || disRaw.length === 0) throw new Error('disappearance.csv 文件为空或未找到');
        if (!domRaw || domRaw.length === 0) throw new Error('domestic-consumption.csv 文件为空或未找到');

        // 构建人口映射 country -> year -> population
        const popMap = new Map();
        for (const row of domRaw) {
            const country = row.domestic_consumption;
            if (!country) continue;
            const yearPop = new Map();
            for (const [col, val] of Object.entries(row)) {
                if (col !== 'domestic_consumption' && /^\d{4}$/.test(col) && val) {
                    const year = +col;
                    const pop = +val;
                    if (!isNaN(pop)) yearPop.set(year, pop);
                }
            }
            if (yearPop.size > 0) popMap.set(country, yearPop);
        }

        // 处理消费数据
        const records = [];
        for (const row of disRaw) {
            const country = row.disappearance;
            if (!country) continue;
            for (const [col, val] of Object.entries(row)) {
                if (col !== 'disappearance' && /^\d{4}$/.test(col) && val) {
                    const year = +col;
                    if (year < 2000) continue;
                    const total = +val;
                    if (isNaN(total)) continue;
                    const pop = popMap.get(country)?.get(year);
                    let perCapita = null;
                    if (pop && pop > 0) perCapita = (total * 60) / pop;
                    records.push({ country, year, total, perCapita });
                }
            }
        }

        if (records.length === 0) throw new Error('没有有效的消费数据（可能年份列不匹配或数值为空）');

        const latestYear = d3.max(records, d => d.year);
        const latestData = records.filter(d => d.year === latestYear)
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);

        // 清空容器并绘制图表
        container.html('');
        drawBarChart(latestData, latestYear, containerId);
    } catch (err) {
        container.html(`
            <div style="padding:20px; background:#f8d7da; color:#721c24; border-radius:8px; border-left:4px solid #f5c6cb;">
                <strong>❌ 数据加载失败</strong><br>
                ${err.message}<br>
                <span style="font-size:12px;">请检查文件是否存在: <code>/Coffee-Bean-Journey/public/data/chapter4_consumption/archive/disappearance.csv</code> 和 <code>domestic-consumption.csv</code></span>
            </div>
        `);
        console.error(err);
    }
}

function drawBarChart(data, year, containerId) {
    const width = 800, height = 500;
    const margin = { top: 40, right: 30, bottom: 120, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`).append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    currentSvg = svg;

    const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([0, innerWidth])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total)])
        .nice()
        .range([innerHeight, 0]);

    // 绘制柱子
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d.country))
        .attr('y', d => y(d.total))
        .attr('width', x.bandwidth())
        .attr('height', d => innerHeight - y(d.total))
        .attr('fill', '#6D4C41')
        .attr('rx', 4)
        .on('mouseover', function(event, d) {
            const perCapitaText = d.perCapita ? `人均: ${d.perCapita.toFixed(2)} kg/年<br>` : '';
            showTooltip(event, `<strong>${d.country}</strong><br>消费总量: ${d.total.toFixed(0)} 千袋 (${(d.total * 60 / 1000).toFixed(0)} 吨)<br>${perCapitaText}年份: ${year}`);
        })
        .on('mousemove', event => showTooltip(event))
        .on('mouseout', hideTooltip);

    // X轴
    svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end')
        .style('font-size', '10px');

    // Y轴
    svg.append('g')
        .call(d3.axisLeft(y).tickFormat(d => d + ' k bags'));

    // 标题
    svg.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`咖啡消费总量排名 (${year}年)`);

    // 脚注
    svg.append('text')
        .attr('x', innerWidth - 10)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', '#666')
        .text('单位: 千袋 (每袋60公斤)  数据来源: ICO');
}

export function update() {}

export function destroy() {
    if (currentSvg) {
        currentSvg.remove();
        currentSvg = null;
    }
    hideTooltip();
}
