// src/chapters/chapter3_market/franchiseCharts.js
import * as d3 from "d3";
import { chartFrame } from "../../components/chartFrame.js";

const BRAND_COLORS = {
    Starbucks: "#006241",
    "Tim Hortons": "#DD0000",
    Luckin: "#0033A0",
    "Dunkin'": "#FF671F",
    Costa: "#600000",
};

/**
 * Renders the 2025 Global Top 5 Coffee Franchise Revenue/Profit Comparison Bar Chart.
 * Displays horizontal or vertical bars mapping revenue and profit by brand.
 */
export function drawEVChart(containerId, rawData) {
    // Initialize chart frame container with metadata
    const { body } = chartFrame(containerId, {
        title: "Enterprise Value Breakdown",
        tag: "Bar Chart",
        description:
            "Deconstruction of Enterprise Value: Market Cap + Total Debt - Cash (Unit: Billion USD)",
        wide: false,
    });

    // Create a relative-positioned wrapper for the chart components
    const wrapper = body
        .append("div")
        .attr("class", "ch3-chart-1-wrapper")
        .style("position", "relative");

    // Initialize or select global tooltip container for the EV chart
    let tooltipChart = d3.select("body").select(".ev-chart-tooltip");
    if (tooltipChart.empty()) {
        tooltipChart = d3
            .select("body")
            .append("div")
            .attr("class", "ev-chart-tooltip sb-chart-tooltip")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("pointer-events", "none")
            .style("z-index", 1000);
    }

    // Render chart asynchronously to ensure stable parent layout dimensions
    setTimeout(() => {
        const margin = { top: 15, right: 0, bottom: 10, left: 0 };
        const containerWidth = wrapper.node().getBoundingClientRect().width;
        const containerHeight = wrapper.node().getBoundingClientRect().height;

        const width = Math.max(0, containerWidth - margin.left - margin.right);
        const height = Math.max(0, containerHeight - margin.top - margin.bottom);

        // Append responsive SVG container and canvas main group
        const svg = wrapper
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Parse raw string records into numeric variables
        const data = rawData.map((d) => ({
            company: d.company,
            ticker: d.ticker,
            marketCap: +d.market_cap,
            debt: +d.debt,
            cash: +d.cash,
            ev: +d.EV,
        }));

        // Brand-specific color palette mapped by stock tickers
        const COMPANY_COLORS = {
            NSRGY: "#1C469B", // Nestlé Blue
            SBUX: "#006241", // Starbucks Green
            KDP: "#A21D21", // Keurig Dr Pepper Burgundy
            QSR: "#DD0000", // Tim Hortons Red
            SJM: "#FF671F", // Dunkin Orange
        };

        // Y-axis: Ordinal band scale for company tickers
        const y = d3
            .scaleBand()
            .domain(data.map((d) => d.ticker))
            .rangeRound([0, height])
            .paddingInner(0.4);

        // X-axis: Linear quantitative scale based on maximum stacked value
        const maxTotal = d3.max(data, (d) => d.marketCap + d.debt);
        const x = d3.scaleLinear().domain([0, maxTotal]).range([0, width]);

        // Generate individual row container groups for each company
        const barGroups = svg
            .selectAll(".bar-group")
            .data(data)
            .join("g")
            .attr("class", "bar-group")
            .attr("transform", (d) => `translate(0, ${y(d.ticker)})`);

        // 1. Render Market Cap segments (base bars)
        barGroups
            .append("rect")
            .attr("class", "ev-part")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", y.bandwidth())
            .attr("width", (d) => x(d.marketCap))
            .attr("fill", (d) => COMPANY_COLORS[d.ticker])
            .attr("rx", 3) // Rounded corners for styling
            .attr("opacity", 0.85)
            .datum((d) => ({
                ...d,
                part: "Market Cap",
                amount: d.marketCap,
                defaultOpacity: 0.85,
            }));

        // 2. Render Total Debt segments (stacked on Market Cap)
        barGroups
            .append("rect")
            .attr("class", "ev-part")
            .attr("x", (d) => x(d.marketCap))
            .attr("y", 0)
            .attr("height", y.bandwidth())
            .attr("width", (d) => x(d.marketCap + d.debt) - x(d.marketCap))
            .attr("fill", (d) => COMPANY_COLORS[d.ticker])
            .attr("rx", 3)
            .attr("opacity", 0.4) // Reduced opacity to differentiate from market cap
            .datum((d) => ({ ...d, part: "Total Debt", amount: d.debt, defaultOpacity: 0.4 }));

        // 3. Render Cash & Equivalents segments as a subtractive overlay
        barGroups
            .append("rect")
            .attr("class", "ev-part")
            .attr("x", (d) => x(d.marketCap + d.debt - d.cash))
            .attr("y", 0)
            .attr("height", y.bandwidth())
            .attr("width", (d) => x(d.cash) - x(0))
            .attr("fill", "rgba(255, 255, 255, 0.7)")
            .attr("stroke", (d) => COMPANY_COLORS[d.ticker])
            .attr("stroke-width", 1.5)
            .attr("rx", 3)
            .style("stroke-dasharray", "3 2")
            .datum((d) => ({
                ...d,
                part: "Cash & Equivalents",
                amount: d.cash,
                defaultOpacity: 1.0,
                isCash: true,
            }));

        // 4. Append company ticker labels inside the bars
        barGroups
            .append("text")
            .attr("x", 6) // Positioned close to the left edge of the bar
            .attr("y", y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .text((d) => d.ticker)
            .style("fill", "#ffffff")
            .style("font-family", "Inter, sans-serif")
            .style("font-weight", "bold")
            .style("font-size", "13px")
            .style("pointer-events", "none");

        // --- Interactive mouse event handlers for highlighting and tooltips ---
        svg.selectAll(".ev-part")
            .on("mouseover", function (event, d) {
                // Dim other segments within the active company row to focus on the hovered part
                svg.selectAll(".ev-part")
                    .transition()
                    .duration(150)
                    .attr("opacity", function (dData) {
                        if (dData.ticker === d.ticker) {
                            return dData.part === d.part ? 1.0 : 0.15;
                        }
                        return dData.defaultOpacity;
                    });

                // Highlight the currently targeted segment
                d3.select(this).transition().duration(50).attr("opacity", 1.0);

                const bulletColor = d.isCash ? "#888888" : COMPANY_COLORS[d.ticker];

                // Inject and display dynamic tooltip content
                tooltipChart.html(`
                    <div style="font-weight:bold; margin-bottom:4px; font-size:13px;">${d.company} (${d.ticker})</div>
                    <div style="border-bottom: 1px solid #555; margin-bottom: 6px;"></div>
                    <span style="color:${bulletColor}">●</span> ${d.part}: <strong>$${d.amount.toFixed(1)}B</strong><br/>
                    <div style="margin-top: 5px;"></div>
                    <span style="color:#a8a8a8">■</span> Enterprise Value: <strong>$${d.ev.toFixed(1)}B</strong>
                `);

                tooltipChart.style("opacity", 1);
            })
            .on("mousemove", function (event) {
                // Update tooltip position relative to the cursor
                tooltipChart
                    .style("left", event.pageX + 15 + "px")
                    .style("top", event.pageY - 20 + "px");
            })
            .on("mouseout", function () {
                // Restore all segments back to their default opacity values
                svg.selectAll(".ev-part")
                    .transition()
                    .duration(200)
                    .attr("opacity", (dData) => dData.defaultOpacity);

                tooltipChart.style("opacity", 0);
            });
    }, 100);
}

/**
 * Renders the 2021-2025 Starbucks Growth Trajectory Mixed Chart.
 * Displays revenue (line) and store counts (bar) with brushable timeline and Index/Absolute modes.
 */
export function drawStarbucksChart(containerId, rawData) {
    // Initialize chart frame container with header controls
    const { frame, body } = chartFrame(containerId, {
        title: "Starbucks Growth Trajectory",
        tag: "Mixed Chart",
        description: "Revenue (Line) and Stores (Bar) with Absolute and Index views.",
        wide: false,
    });

    const header = frame.select(".chart-frame-header");

    // Main wrapper container for the layout
    const wrapper = body.append("div").attr("class", "ch3-chart-2-wrapper");

    // Append switchable perspective control buttons in the header
    const controls = header.append("div").attr("class", "chart-controls");
    const btnAbsolute = controls.append("button").attr("class", "chart-btn").text("Absolute");
    const btnIndex = controls.append("button").attr("class", "chart-btn").text("Index");

    // Initialize or select tooltips for data tracking and time brush summaries
    let tooltipChart = d3.select("body").select(".sb-chart-tooltip");
    if (tooltipChart.empty()) {
        tooltipChart = d3.select("body").append("div").attr("class", "sb-chart-tooltip");
    }

    let tooltipBrush = d3.select("body").select(".sb-brush-tooltip");
    if (tooltipBrush.empty()) {
        tooltipBrush = d3.select("body").append("div").attr("class", "sb-brush-tooltip");
    }

    // Sort and type-cast raw input data
    const parsedData = rawData
        .map((d) => ({
            year: +d.date,
            revenue: +d.revenue,
            stores: +d.stores,
        }))
        .sort((a, b) => a.year - b.year);

    // Track active application states
    let isIndexMode = false;
    let selectedRange = [d3.min(parsedData, (d) => d.year), d3.max(parsedData, (d) => d.year)];
    let currentPlotData = []; // Stores parsed values bounded within the current timeline brush

    // Render chart components asynchronously to sync with DOM dimensions
    setTimeout(() => {
        const rect = wrapper.node().getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        const margin = { top: 15, right: 45, bottom: 85, left: 45 };
        const width = Math.max(0, containerWidth - margin.left - margin.right);
        const height = Math.max(0, containerHeight - margin.top - margin.bottom);

        const svg = wrapper
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        // Setup primary drawing space
        const chartG = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        // Initialize persistent vector graphic containers for axis transitions
        const xAxisG = chartG.append("g").attr("transform", `translate(0,${height})`);
        const yLeftG = chartG.append("g");
        const yRightG = chartG.append("g").attr("transform", `translate(${width}, 0)`);

        // Initialize dashed index base indicator lines (hidden by default)
        const indexRefLine = chartG
            .append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("stroke", "#616161")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 4")
            .style("opacity", 0);

        const indexRefText = chartG
            .append("text")
            .attr("x", width)
            .style("fill", "#616161")
            .style("font-size", "10px")
            .style("text-anchor", "end")
            .style("opacity", 0);

        // Core path container for the quantitative line chart
        const linePath = chartG
            .append("path")
            .attr("fill", "none")
            .attr("stroke", "#b44949")
            .attr("stroke-width", 2.5);

        // Build and append static legend tags
        chartG
            .append("rect")
            .attr("x", 10)
            .attr("y", 10)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "#006241")
            .attr("opacity", 0.8)
            .attr("rx", 2);
        chartG
            .append("text")
            .attr("x", 26)
            .attr("y", 20)
            .text("Stores")
            .style("fill", "#4e4e4e")
            .style("font-size", "10px");
        chartG
            .append("line")
            .attr("x1", 10)
            .attr("x2", 22)
            .attr("y1", 30)
            .attr("y2", 30)
            .attr("stroke", "#b44949")
            .attr("stroke-width", 3);
        chartG.append("circle").attr("cx", 16).attr("cy", 30).attr("r", 4).attr("fill", "#b44949");
        chartG
            .append("text")
            .attr("x", 26)
            .attr("y", 34)
            .text("Revenue")
            .style("fill", "#4e4e4e")
            .style("font-size", "10px");

        // Construct lower timeline scrubber section
        const scrubberHeight = 30;
        const scrubberMargin = {
            top: containerHeight - scrubberHeight - 17,
            right: margin.right,
            left: margin.left,
        };
        const scrubberG = svg
            .append("g")
            .attr("transform", `translate(${scrubberMargin.left},${scrubberMargin.top})`);

        // X-axis scale for the scrubber track
        const xScrub = d3
            .scaleLinear()
            .domain([d3.min(parsedData, (d) => d.year), d3.max(parsedData, (d) => d.year)])
            .range([0, width]);

        const xAxisScrub = d3.axisBottom(xScrub).tickFormat(d3.format("d")).ticks(10);
        const scrubAxisG = scrubberG
            .append("g")
            .attr("transform", `translate(0, ${scrubberHeight})`)
            .call(xAxisScrub);

        scrubAxisG.selectAll("text").style("fill", "#666666").style("font-size", "11px");
        scrubAxisG.select(".domain").style("opacity", 0);
        scrubAxisG.selectAll(".tick line").style("opacity", 0.2);

        // Y-axis scale and background area path for context preview in scrubber
        const yScrub = d3
            .scaleLinear()
            .domain([0, d3.max(parsedData, (d) => d.revenue)])
            .range([scrubberHeight, 0]);

        const scrubArea = d3
            .area()
            .x((d) => xScrub(d.year))
            .y0(scrubberHeight)
            .y1((d) => yScrub(d.revenue));
        scrubberG
            .append("path")
            .datum(parsedData)
            .attr("fill", "#006241")
            .attr("opacity", 0.3)
            .attr("d", scrubArea);

        // Configure interactive D3 Brush control bounds and lifecycle events
        const brush = d3
            .brushX()
            .extent([
                [0, 0],
                [width, scrubberHeight],
            ])
            .on("brush", function (event) {
                if (!event.selection || !event.sourceEvent) return;
                const [x0, x1] = event.selection;
                selectedRange = [Math.round(xScrub.invert(x0)), Math.round(xScrub.invert(x1))];
                if (selectedRange[0] >= selectedRange[1]) selectedRange[1] = selectedRange[0] + 1;
                updateChart();

                if (tooltipBrush.style("opacity") === "1") updateBrushTooltipContent();
            })
            .on("end", function (event) {
                // Fallback to absolute bounds if brush selection is cleared
                if (!event.selection) {
                    selectedRange = [
                        d3.min(parsedData, (d) => d.year),
                        d3.max(parsedData, (d) => d.year),
                    ];
                    d3.select(this)
                        .transition()
                        .call(brush.move, [xScrub(selectedRange[0]), xScrub(selectedRange[1])]);
                    updateChart();
                    if (tooltipBrush.style("opacity") === "1") updateBrushTooltipContent();
                    return;
                }
                if (!event.sourceEvent) return;
                const [x0, x1] = event.selection;
                let startYear = Math.round(xScrub.invert(x0));
                let endYear = Math.round(xScrub.invert(x1));
                if (startYear >= endYear) endYear = startYear + 1;

                startYear = Math.max(
                    startYear,
                    d3.min(parsedData, (d) => d.year),
                );
                endYear = Math.min(
                    endYear,
                    d3.max(parsedData, (d) => d.year),
                );

                // Snap brush selection to exact discrete integer points (years)
                selectedRange = [startYear, endYear];
                d3.select(this)
                    .transition()
                    .call(brush.move, [xScrub(startYear), xScrub(endYear)]);
                updateChart();
                if (tooltipBrush.style("opacity") === "1") updateBrushTooltipContent();
            });

        // Instantiate structural brush elements and apply specific style definitions
        const brushG = scrubberG.append("g").attr("class", "brush").call(brush);
        brushG.call(brush.move, [xScrub(selectedRange[0]), xScrub(selectedRange[1])]);
        brushG
            .selectAll(".selection")
            .attr("fill", "rgba(0, 98, 65, 0.15)")
            .attr("stroke", "#006241")
            .attr("stroke-width", 1.5);
        brushG.selectAll(".handle").attr("fill", "#006241");

        // Bind tracking tooltips over the active interactive timeline frame
        brushG
            .selectAll(".selection")
            .on("mouseenter", (event) => {
                tooltipBrush.style("opacity", 1);
                updateBrushTooltipContent();
            })
            .on("mousemove", (event) => {
                const tooltipWidth = tooltipBrush.node().offsetWidth;
                const tooltipHeight = tooltipBrush.node().offsetHeight;
                tooltipBrush
                    .style("left", event.pageX - tooltipWidth - 10 + "px")
                    .style("top", event.pageY - tooltipHeight - 5 + "px");
            })
            .on("mouseleave", () => {
                tooltipBrush.style("opacity", 0);
            });

        // Compute and generate structural content for the time frame summary window
        function updateBrushTooltipContent() {
            if (!currentPlotData || currentPlotData.length === 0) return;
            const start = currentPlotData[0];
            const end = currentPlotData[currentPlotData.length - 1];

            const revMin = d3.min(currentPlotData, (d) => d.revenue);
            const revMax = d3.max(currentPlotData, (d) => d.revenue);
            const storeMin = d3.min(currentPlotData, (d) => d.stores);
            const storeMax = d3.max(currentPlotData, (d) => d.stores);

            const formatRev = (v) => (isIndexMode ? v.toFixed(1) + "%" : "$" + v.toFixed(1) + "B");
            const formatStore = (v) => (isIndexMode ? v.toFixed(1) + "%" : v.toLocaleString());

            const revGrowth = start.revenue
                ? (((end.revenue - start.revenue) / start.revenue) * 100).toFixed(1)
                : 0;
            const storeGrowth = start.stores
                ? (((end.stores - start.stores) / start.stores) * 100).toFixed(1)
                : 0;
            const getGrowthColor = (g) => (g >= 0 ? "#4ade80" : "#f87171");

            tooltipBrush.html(`
                <div style="font-weight:bold; margin-bottom: 4px;">${start.year} - ${end.year} Summary</div>
                <div style="border-bottom: 1px solid #444; margin-bottom: 6px;"></div>
                <span style="color:#f4a261">●</span> <strong>Revenue</strong><br/>
                &nbsp;&nbsp;Min/Max: ${formatRev(revMin)} / ${formatRev(revMax)}<br/>
                &nbsp;&nbsp;Growth: <span style="color:${getGrowthColor(revGrowth)}; font-weight:bold">${revGrowth >= 0 ? "+" : ""}${revGrowth}%</span><br/>
                <div style="margin-top: 6px;"></div>
                <span style="color:#8eb69b">■</span> <strong>Stores</strong><br/>
                &nbsp;&nbsp;Min/Max: ${formatStore(storeMin)} / ${formatStore(storeMax)}<br/>
                &nbsp;&nbsp;Growth: <span style="color:${getGrowthColor(storeGrowth)}; font-weight:bold">${storeGrowth >= 0 ? "+" : ""}${storeGrowth}%</span>
            `);
        }

        // Apply visual button styling based on active mode
        function updateButtons() {
            btnIndex.classed("btn-active", isIndexMode).classed("btn-inactive", !isIndexMode);
            btnAbsolute.classed("btn-active", !isIndexMode).classed("btn-inactive", isIndexMode);
        }

        // Attach layout toggle events to mode switch buttons
        btnIndex.on("click", () => {
            if (!isIndexMode) {
                isIndexMode = true;
                updateButtons();
                updateChart();
            }
        });
        btnAbsolute.on("click", () => {
            if (isIndexMode) {
                isIndexMode = false;
                updateButtons();
                updateChart();
            }
        });

        // Core chart redraw engine handling geometric mutations and structural updates
        function updateChart() {
            const filteredData = parsedData.filter(
                (d) => d.year >= selectedRange[0] && d.year <= selectedRange[1],
            );
            if (filteredData.length === 0) return;
            const baseYearData = filteredData[0];

            // Normalize values dynamically if Index View is active (Base Year = 100%)
            currentPlotData = filteredData.map((d) => {
                if (isIndexMode) {
                    return {
                        year: d.year,
                        revenue: (d.revenue / baseYearData.revenue) * 100,
                        stores: (d.stores / baseYearData.stores) * 100,
                    };
                } else {
                    return { year: d.year, revenue: d.revenue, stores: d.stores };
                }
            });

            // Primary qualitative horizontal position scale
            const x = d3
                .scaleBand()
                .domain(currentPlotData.map((d) => d.year))
                .range([0, width])
                .padding(0.3);

            // Establish unified geometric transition parameters
            const t = d3.transition().duration(500);

            // Re-render and align X-axis ticks
            xAxisG.transition(t).call(
                d3
                    .axisBottom(x)
                    .tickSizeOuter(0)
                    .tickValues(
                        x
                            .domain()
                            .filter(
                                (d, i) =>
                                    i % Math.max(1, Math.ceil(currentPlotData.length / 10)) === 0,
                            ),
                    ),
            );

            xAxisG.selectAll(".tick line").style("opacity", 0);
            xAxisG.select(".domain").style("stroke", "#747474").style("stroke-width", 1.1);

            let yLeft, yRight, yIndex;

            if (isIndexMode) {
                let maxVal = Math.max(
                    0,
                    d3.max(currentPlotData, (d) => Math.max(d.revenue, d.stores)) * 1.1,
                );
                yIndex = d3.scaleLinear().domain([0, maxVal]).range([height, 0]);

                // Transition to single-axis layout for Index view
                yLeftG.transition(t).call(
                    d3
                        .axisLeft(yIndex)
                        .tickSizeOuter(0)
                        .tickFormat((d) => d.toFixed(0) + "%")
                        .ticks(5),
                );

                yLeftG.selectAll(".tick line").style("opacity", 0);
                yLeftG.select(".domain").style("stroke", "#747474").style("stroke-width", 1.1);
                yRightG.transition(t).style("opacity", 0); // Hide the absolute secondary axis

                // Display horizontal baseline (100%) guidelines
                indexRefLine
                    .transition(t)
                    .attr("y1", yIndex(100))
                    .attr("y2", yIndex(100))
                    .style("opacity", 1);
                indexRefText
                    .transition(t)
                    .attr("y", yIndex(100) - 5)
                    .style("opacity", 1)
                    .text("Base Year (100%)");
            } else {
                let maxStores = d3.max(currentPlotData, (d) => d.stores) || 1;
                let maxRevenue = d3.max(currentPlotData, (d) => d.revenue) || 1;

                yLeft = d3
                    .scaleLinear()
                    .domain([0, maxStores * 1.1])
                    .range([height, 0]);
                yRight = d3
                    .scaleLinear()
                    .domain([0, maxRevenue * 1.1])
                    .range([height, 0]);

                // Transition left axis to represent Absolute store counts
                yLeftG
                    .transition(t)
                    .call(d3.axisLeft(yLeft).tickSizeOuter(0).ticks(5))
                    .selectAll("text")
                    .style("fill", "#006241");

                yLeftG.selectAll(".tick line").style("opacity", 0);
                yLeftG.select(".domain").style("stroke", "#747474").style("stroke-width", 1.1);

                // Transition right axis to represent Absolute financial revenue figures
                yRightG
                    .transition(t)
                    .style("opacity", 1)
                    .call(
                        d3
                            .axisRight(yRight)
                            .tickSizeOuter(0)
                            .ticks(5)
                            .tickFormat((d) => "$" + d + "B"),
                    )
                    .selectAll("text")
                    .style("fill", "#b44949");

                yRightG.selectAll(".tick line").style("opacity", 0);
                yRightG.select(".domain").style("stroke", "#747474").style("stroke-width", 1.1);

                // Clear layout structures unique to Index perspective
                indexRefLine.transition(t).style("opacity", 0);
                indexRefText.transition(t).style("opacity", 0);
            }

            // --- Update historical bar charts (Stores) using D3 data join pattern ---
            const bars = chartG
                .selectAll(".bar")
                .data(currentPlotData, (d) => d.year)
                .join(
                    (enter) =>
                        enter
                            .append("rect")
                            .attr("class", "bar")
                            .attr("x", (d) => x(d.year))
                            .attr("width", x.bandwidth())
                            .attr("y", height) // Slide up transition from the floor line
                            .attr("height", 0)
                            .attr("fill", "#006241")
                            .attr("opacity", 0.8)
                            .attr("rx", 2)
                            .call((enter) =>
                                enter
                                    .transition(t)
                                    .attr("y", (d) =>
                                        isIndexMode ? yIndex(d.stores) : yLeft(d.stores),
                                    )
                                    .attr("height", (d) =>
                                        Math.max(
                                            0,
                                            height -
                                                (isIndexMode ? yIndex(d.stores) : yLeft(d.stores)),
                                        ),
                                    ),
                            ),
                    (update) =>
                        update.call((update) =>
                            update
                                .transition(t)
                                .attr("x", (d) => x(d.year))
                                .attr("width", x.bandwidth())
                                .attr("y", (d) =>
                                    isIndexMode ? yIndex(d.stores) : yLeft(d.stores),
                                )
                                .attr("height", (d) =>
                                    Math.max(
                                        0,
                                        height - (isIndexMode ? yIndex(d.stores) : yLeft(d.stores)),
                                    ),
                                ),
                        ),
                    (exit) =>
                        exit.call((exit) =>
                            exit.transition(t).attr("y", height).attr("height", 0).remove(),
                        ),
                );

            // --- Update continuous metric trends (Revenue path geometry) ---
            const lineGen = d3
                .line()
                .x((d) => x(d.year) + x.bandwidth() / 2)
                .y((d) => (isIndexMode ? yIndex(d.revenue) : yRight(d.revenue)));

            linePath.datum(currentPlotData).transition(t).attr("d", lineGen);

            // --- Render interactive data nodes along line vertices ---
            const dots = chartG
                .selectAll(".dot")
                .data(currentPlotData, (d) => d.year)
                .join(
                    (enter) =>
                        enter
                            .append("circle")
                            .attr("class", "dot")
                            .attr("cx", (d) => x(d.year) + x.bandwidth() / 2)
                            .attr("cy", (d) =>
                                isIndexMode ? yIndex(d.revenue) : yRight(d.revenue),
                            )
                            .attr("r", 0)
                            .attr("fill", "#b44949")
                            .call((enter) => enter.transition(t).attr("r", 4)),
                    (update) =>
                        update.call(
                            (update) =>
                                update
                                    .transition(t)
                                    .attr("cx", (d) => x(d.year) + x.bandwidth() / 2)
                                    .attr("cy", (d) =>
                                        isIndexMode ? yIndex(d.revenue) : yRight(d.revenue),
                                    )
                                    .attr("r", 3), // Fixed size during active transition ticks to stop clipping bugs
                        ),
                    (exit) => exit.call((exit) => exit.transition(t).attr("r", 0).remove()),
                );

            // --- Shared mouse tracking handlers for elements ---
            const handleMouseOver = function (event, d) {
                tooltipChart.style("opacity", 1);

                const formatRev = isIndexMode
                    ? d.revenue.toFixed(1) + "%"
                    : "$" + d.revenue.toFixed(1) + "B";
                const formatStore = isIndexMode
                    ? d.stores.toFixed(1) + "%"
                    : d.stores.toLocaleString();

                tooltipChart.html(`
                    <div style="font-weight:bold; margin-bottom:4px;">${d.year}</div>
                    <span style="color:#f4a261">●</span> Revenue: <strong>${formatRev}</strong><br/>
                    <span style="color:#8eb69b">■</span> Stores: <strong>${formatStore}</strong>
                `);

                const isDot = d3.select(this).classed("dot");

                // Apply focus highlight modifications based on node type
                d3.select(this)
                    .transition()
                    .duration(100)
                    .attr("opacity", 1)
                    .attr("r", isDot ? 6 : null);
            };

            const handleMouseMove = function (event) {
                const tooltipWidth = tooltipChart.node().offsetWidth;
                const tooltipHeight = tooltipChart.node().offsetHeight;
                tooltipChart
                    .style("left", event.pageX - tooltipWidth + "px")
                    .style("top", event.pageY - tooltipHeight + "px");
            };

            const handleMouseOut = function () {
                tooltipChart.style("opacity", 0);

                const isDot = d3.select(this).classed("dot");

                // Reset standard visual style settings on boundary exit
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", !isDot ? 0.8 : 1)
                    .attr("r", isDot ? 4 : null);
            };

            // Bind listeners to data elements
            bars.on("mouseover", handleMouseOver)
                .on("mousemove", handleMouseMove)
                .on("mouseout", handleMouseOut);
            dots.on("mouseover", handleMouseOver)
                .on("mousemove", handleMouseMove)
                .on("mouseout", handleMouseOut);
        }

        // Initialize state tracking configurations and prompt initial layout paint
        updateButtons();
        updateChart();
    }, 100);
}
