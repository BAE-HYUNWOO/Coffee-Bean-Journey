// src/chapters/chapter3_market/ExpansionMap.js
import { chartFrame } from "../../components/chartFrame.js";

const ZOOM_SINGLE = 3.0;
const STARBUCKS_GREEN = "#006241";
const START_YEAR = 1970;
const END_YEAR = 2026;

const REGION_MAP = {
    US: "Americas",
    CA: "Americas",
    MX: "Americas",
    BR: "Americas",
    AR: "Americas",
    CL: "Americas",
    PE: "Americas",
    CO: "Americas",
    BS: "Americas",
    AW: "Americas",
    SV: "Americas",
    GT: "Americas",
    CR: "Americas",
    BO: "Americas",
    PA: "Americas",
    TT: "Americas",
    JM: "Americas",
    UY: "Americas",
    DO: "Americas",
    PY: "Americas",
    BB: "Americas",
    GY: "Americas",
    EC: "Americas",
    PR: "Americas",
    GB: "Europe",
    FR: "Europe",
    DE: "Europe",
    IT: "Europe",
    ES: "Europe",
    NL: "Europe",
    AT: "Europe",
    CH: "Europe",
    GR: "Europe",
    CY: "Europe",
    TR: "Europe",
    IE: "Europe",
    DK: "Europe",
    RO: "Europe",
    RU: "Europe",
    BE: "Europe",
    BG: "Europe",
    CZ: "Europe",
    PT: "Europe",
    PL: "Europe",
    SE: "Europe",
    HU: "Europe",
    FI: "Europe",
    NO: "Europe",
    MC: "Europe",
    AZ: "Europe",
    AD: "Europe",
    SK: "Europe",
    MT: "Europe",
    RS: "Europe",
    JP: "Asia Pacific",
    KR: "Asia Pacific",
    CN: "Asia Pacific",
    TW: "Asia Pacific",
    SG: "Asia Pacific",
    PH: "Asia Pacific",
    MY: "Asia Pacific",
    TH: "Asia Pacific",
    ID: "Asia Pacific",
    AU: "Asia Pacific",
    NZ: "Asia Pacific",
    IN: "Asia Pacific",
    VN: "Asia Pacific",
    BN: "Asia Pacific",
    KH: "Asia Pacific",
    KZ: "Asia Pacific",
    HK: "Asia Pacific",
    MO: "Asia Pacific",
    AE: "Middle East & Africa",
    SA: "Middle East & Africa",
    KW: "Middle East & Africa",
    LB: "Middle East & Africa",
    BH: "Middle East & Africa",
    QA: "Middle East & Africa",
    OM: "Middle East & Africa",
    JO: "Middle East & Africa",
    EG: "Middle East & Africa",
    MA: "Middle East & Africa",
    ZA: "Middle East & Africa",
};

/**
 * Initializes and renders the Expansion Map visualization inside the specified container.
 * @param {string} containerId - The DOM selector for the container element.
 */
export function drawExpansionSlot(containerId, { worldData, expansionData, storesData }) {
    const { body } = chartFrame(containerId, {
        title: "Starbucks Global Expansion",
        tag: "Choropleth",
        description:
            "Illustrates how Starbucks expanded its business globally after being founded in the United States.",
        wide: true,
    });

    body.node()?.closest(".chart-frame")?.querySelector(".chart-frame-header em")?.remove();

    const wrapper = body.append("div").attr("class", "chapter3-wrapper");

    // --- 1. Map Section ---
    const mapSection = wrapper.append("div").attr("class", "map-section");
    const hoverTooltip = mapSection.append("div").attr("class", "hover-tooltip");
    const milestoneAnchor = mapSection.append("div").attr("class", "milestone-anchor");

    const infoBox = mapSection.append("div").attr("class", "info-box");
    infoBox.html(`
        <h2 id="info-year">${START_YEAR}</h2>
        <div class="subtitle">Global Expansion</div>
        <div class="info-stat-title">Countries Entered</div>
        <div class="info-stat-value" id="info-countries">0</div>
        <div class="region-list" id="info-regions"></div>
    `);

    const scrubberContainer = mapSection.append("div").attr("class", "scrubber-container");
    scrubberContainer
        .append("div")
        .attr("class", "scrubber-header")
        .text("Drag or use ← → arrows to navigate");
    const scrubberSvg = scrubberContainer.append("svg").attr("id", "scrubber-svg");

    setTimeout(() => {
        const mapWidth = mapSection.node().getBoundingClientRect().width;
        const mapHeight = mapSection.node().getBoundingClientRect().height;

        const svg = mapSection
            .append("svg")
            .attr("id", "map-svg")
            .attr("width", mapWidth)
            .attr("height", mapHeight)
            .style("width", `${mapWidth}px`)
            .style("height", `${mapHeight}px`);

        const defs = svg.append("defs");
        const filter = defs
            .append("filter")
            .attr("id", "drop-shadow")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "140%")
            .attr("height", "140%");
        filter
            .append("feDropShadow")
            .attr("dx", "1")
            .attr("dy", "3")
            .attr("stdDeviation", "3")
            .attr("flood-color", "#0b1c24")
            .attr("flood-opacity", "0.6");

        const canvas = mapSection
            .append("canvas")
            .attr("id", "map-canvas")
            .attr("width", mapWidth)
            .attr("height", mapHeight)
            .style("width", `${mapWidth}px`)
            .style("height", `${mapHeight}px`);

        const ctx = canvas.node().getContext("2d");
        const mapGroup = svg.append("g").attr("filter", "url(#drop-shadow)");

        // --- State Variables ---
        let currentYear = START_YEAR;
        let storesByCountry = {};
        let expansionDataRef = [];
        let milestoneYears = [];
        let projection, path, zoom;
        let activeMilestoneData = [];

        expansionDataRef = expansionData;
        milestoneYears = [...new Set(expansionData.map((d) => d.year))].sort((a, b) => a - b);

        storesData.forEach((store) => {
            if (!storesByCountry[store.code]) storesByCountry[store.code] = [];
            storesByCountry[store.code].push(store);
        });

        function getMarketData(geoFeature) {
            const explicitMap = {
                USA: "US",
                England: "GB",
                "South Korea": "KR",
                "Republic of Korea": "KR",
                Taiwan: "TW",
                "United Arab Emirates": "AE",
                Russia: "RU",
                China: "CN",
            };
            const code2 = explicitMap[geoFeature.id] || explicitMap[geoFeature.properties.name];
            if (code2) return expansionDataRef.find((m) => m.code === code2);
            return expansionDataRef.find(
                (m) =>
                    geoFeature.properties.name.includes(m.country) ||
                    m.country.includes(geoFeature.properties.name),
            );
        }

        let geoFeatures =
            worldData.type === "FeatureCollection"
                ? worldData
                : topojson.feature(worldData, Object.values(worldData.objects)[0]);
        projection = d3.geoNaturalEarth1().fitSize([mapWidth, mapHeight], geoFeatures);
        path = d3.geoPath().projection(projection);

        mapGroup
            .selectAll("path")
            .data(geoFeatures.features)
            .enter()
            .append("path")
            .attr("class", "country")
            .attr("d", path)
            .attr("id", (d) => `country-${d.id || d.properties.name}`)
            .on("mouseover", function (event, d) {
                const market = getMarketData(d);
                if (market && market.year <= currentYear) {
                    d3.select(this)
                        .style("stroke", "#ffffff")
                        .style("stroke-width", "1px")
                        .style("stroke-dasharray", "none");

                    hoverTooltip
                        .html(
                            `<img src="https://flagcdn.com/w40/${market.code.toLowerCase()}.png" alt="flag">
                            <div class="tt-text">
                                <span class="tt-country">${market.country}</span>
                                <span class="tt-city">Entered: ${market.city} (${market.year})</span>
                            </div>`,
                        )
                        .style("opacity", 1);
                }
            })
            .on("mousemove", function (event) {
                const [x, y] = d3.pointer(event, mapSection.node());
                hoverTooltip.style("left", x + 15 + "px").style("top", y + 15 + "px");
            })
            .on("mouseout", function (event, d) {
                const market = getMarketData(d);
                const isActive = market && market.year <= currentYear;

                if (isActive) {
                    d3.select(this)
                        .style("stroke", "#ffffff")
                        .style("stroke-width", "0.5px")
                        .style("stroke-dasharray", "none");
                } else {
                    d3.select(this)
                        .style("stroke", "#fcfcfc")
                        .style("stroke-width", "0.3px")
                        .style("stroke-dasharray", "2, 2");
                }
                hoverTooltip.style("opacity", 0);
            });

        function getVisibleStores(year) {
            let visible = [];
            for (const code in storesByCountry) {
                const marketInfo = expansionDataRef.find((m) => m.code === code);
                if (!marketInfo || year < marketInfo.year) continue;

                const stores = storesByCountry[code];
                const entryYear = marketInfo.year;

                let count = 0;
                if (year >= 2021) count = stores.length;
                else if (year === entryYear) count = 1;
                else {
                    const progress = (year - entryYear) / (2021 - entryYear);
                    count = Math.max(1, Math.floor(stores.length * progress));
                }
                visible = visible.concat(stores.slice(0, count));
            }
            return visible;
        }

        zoom = d3
            .zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                mapGroup.attr("transform", event.transform);

                mapGroup
                    .selectAll(".city-marker")
                    .attr("r", 5 / event.transform.k)
                    .attr("stroke-width", 1.5 / event.transform.k);

                drawCanvasPoints(
                    ctx,
                    getVisibleStores(currentYear),
                    event.transform,
                    projection,
                    mapWidth,
                    mapHeight,
                );

                milestoneAnchor.selectAll(".milestone-tooltip").style("transform", function (d) {
                    if (!d) return;
                    const screenX = event.transform.applyX(d.x);
                    const screenY = event.transform.applyY(d.y);
                    return `translate(calc(${screenX}px + 12px), calc(${screenY}px - 50%))`;
                });
            });
        svg.call(zoom);

        const scrubberControl = setupScrubber(
            scrubberSvg,
            START_YEAR,
            END_YEAR,
            milestoneYears,
            (newYear) => {
                if (newYear !== currentYear) setYear(newYear);
            },
        );

        window.addEventListener("keydown", handleKeyboard);

        function handleKeyboard(e) {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (e.key === "ArrowRight") {
                e.preventDefault();
                const next = milestoneYears.find((y) => y > currentYear) || END_YEAR;
                if (next) setYear(next);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                let prev = [...milestoneYears].reverse().find((y) => y < currentYear);
                if (!prev) prev = START_YEAR;
                setYear(prev);
            }
        }

        function setYear(year) {
            currentYear = year;
            d3.select("#info-year").text(currentYear);

            const activeCodes = new Set(
                expansionDataRef.filter((d) => d.year <= currentYear).map((d) => d.code),
            );

            mapGroup
                .selectAll(".country")
                .classed("active", function (d) {
                    const market = getMarketData(d);
                    return market && activeCodes.has(market.code);
                })
                .style("stroke", function (d) {
                    const market = getMarketData(d);
                    return market && activeCodes.has(market.code) ? "#ffffff" : "#fcfcfc";
                })
                .style("stroke-dasharray", function (d) {
                    const market = getMarketData(d);
                    return market && activeCodes.has(market.code) ? "none" : "2, 2";
                });

            const regionCounts = {
                Americas: 0,
                Europe: 0,
                "Asia Pacific": 0,
                "Middle East & Africa": 0,
            };
            activeCodes.forEach((code) => {
                const region = REGION_MAP[code] || "Other";
                if (regionCounts[region] !== undefined) regionCounts[region]++;
            });

            d3.select("#info-countries").text(activeCodes.size);
            d3.select("#info-regions").html(
                Object.entries(regionCounts)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(
                        ([region, count]) =>
                            `<div class="region-item"><span class="region-name">${region}</span><span class="region-value">${count}</span></div>`,
                    )
                    .join(""),
            );

            scrubberControl.update(currentYear);

            const isMilestone = milestoneYears.includes(currentYear);
            mapGroup.selectAll(".city-marker").remove();

            if (isMilestone) {
                const markets = expansionDataRef.filter((d) => d.year === currentYear);

                activeMilestoneData = markets.map((m) => {
                    const [x, y] = projection([m.lon, m.lat]);
                    return { ...m, x, y };
                });

                const currentK = d3.zoomTransform(svg.node()).k;
                mapGroup
                    .selectAll(".city-marker")
                    .data(activeMilestoneData)
                    .enter()
                    .append("circle")
                    .attr("class", "city-marker")
                    .attr("cx", (d) => d.x)
                    .attr("cy", (d) => d.y)
                    .attr("r", 5 / currentK)
                    .attr("fill", STARBUCKS_GREEN)
                    .attr("stroke", "#ffffff")
                    .attr("stroke-width", 1.5 / currentK);

                const tooltips = milestoneAnchor
                    .selectAll(".milestone-tooltip")
                    .data(activeMilestoneData, (d) => d.code);
                tooltips.exit().remove();

                const tooltipsEnter = tooltips
                    .enter()
                    .append("div")
                    .attr("class", "milestone-tooltip")
                    .html(
                        (
                            d,
                        ) => `<img src="https://flagcdn.com/w40/${d.code.toLowerCase()}.png" alt="flag">
                        <div class="tt-text">
                            <span class="tt-country">${d.country}</span>
                            <span class="tt-city">Entered: ${d.city} (${d.year})</span>
                        </div>`,
                    );

                tooltipsEnter
                    .merge(tooltips)
                    .style("opacity", 0)
                    .transition()
                    .duration(800)
                    .style("opacity", 1);

                let minX = Infinity,
                    maxX = -Infinity,
                    minY = Infinity,
                    maxY = -Infinity;
                activeMilestoneData.forEach((d) => {
                    if (d.x < minX) minX = d.x;
                    if (d.x > maxX) maxX = d.x;
                    if (d.y < minY) minY = d.y;
                    if (d.y > maxY) maxY = d.y;
                });

                const targetX = (minX + maxX) / 2;
                const targetY = (minY + maxY) / 2;

                let targetZoom = ZOOM_SINGLE;
                if (activeMilestoneData.length > 1) {
                    const dx = maxX - minX;
                    const dy = maxY - minY;
                    if (dx > 0 || dy > 0) {
                        const scaleX = mapWidth / (dx * 1.7);
                        const scaleY = mapHeight / (dy * 1.7);
                        targetZoom = Math.min(scaleX, scaleY, ZOOM_SINGLE);
                        targetZoom = Math.max(targetZoom, 1);
                    }
                }

                const tooltipOffsetX = 40;

                svg.transition()
                    .duration(1000)
                    .call(
                        zoom.transform,
                        d3.zoomIdentity
                            .translate(mapWidth / 2 - tooltipOffsetX, mapHeight / 2)
                            .scale(targetZoom)
                            .translate(-targetX, -targetY),
                    );
            } else {
                activeMilestoneData = [];
                milestoneAnchor
                    .selectAll(".milestone-tooltip")
                    .transition()
                    .duration(500)
                    .style("opacity", 0)
                    .remove();
                svg.transition().duration(1000).call(zoom.transform, d3.zoomIdentity);
            }

            const currentZoom = d3.zoomTransform(svg.node());
            drawCanvasPoints(
                ctx,
                getVisibleStores(currentYear),
                currentZoom,
                projection,
                mapWidth,
                mapHeight,
            );
        }

        setYear(START_YEAR);
        return () => window.removeEventListener("keydown", handleKeyboard);
    }, 100);
}

/* --- Components --- */

/**
 * Creates and initializes the interactive timeline scrubber.
 */
function setupScrubber(svg, startYear, endYear, milestones, onDrag) {
    const parentNode = svg.node().parentElement;
    const width = parentNode.clientWidth;
    const height = parentNode.clientHeight;
    const paddingX = Math.max(15, width * 0.05);
    const centerY = height / 2;

    const x = d3
        .scaleLinear()
        .domain([startYear, endYear])
        .range([paddingX, width - paddingX])
        .clamp(true);
    const g = svg.append("g").attr("transform", `translate(0, ${centerY})`);

    g.append("line")
        .attr("class", "scrubber-track")
        .attr("x1", paddingX)
        .attr("x2", width - paddingX)
        .attr("y1", 0)
        .attr("y2", 0);
    const progressLine = g
        .append("line")
        .attr("class", "scrubber-progress")
        .attr("x1", paddingX)
        .attr("x2", paddingX)
        .attr("y1", 0)
        .attr("y2", 0);

    g.selectAll(".scrubber-milestone")
        .data(milestones)
        .enter()
        .append("circle")
        .attr("class", "scrubber-milestone")
        .attr("cx", (d) => x(d))
        .attr("cy", 0)
        .attr("r", 2.5);

    const xAxis = d3
        .axisBottom(x)
        .tickValues([1970, 1980, 1990, 2000, 2010, 2020])
        .tickFormat(d3.format("d"));
    g.append("g").attr("transform", `translate(0, 8)`).call(xAxis).select(".domain").remove();
    g.selectAll(".tick line").remove();
    g.selectAll(".tick text").attr("fill", "#666").attr("font-size", "10px");

    const handle = g
        .append("rect")
        .attr("class", "scrubber-handle")
        .attr("x", paddingX - 4)
        .attr("y", -10)
        .attr("width", 8)
        .attr("height", 20)
        .attr("rx", 4);

    const drag = d3.drag().on("drag", (event) => onDrag(Math.round(x.invert(event.x))));
    handle.call(drag);
    svg.on("click", (event) => onDrag(Math.round(x.invert(event.offsetX))));

    return {
        update: (year) => {
            const xPos = x(year);
            handle.attr("x", xPos - 4);
            progressLine.attr("x2", xPos);
        },
    };
}

/**
 * Draws individual store location points onto the HTML5 Canvas.
 */
function drawCanvasPoints(ctx, stores, transform, projection, width, height) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (!stores || stores.length === 0) {
        ctx.restore();
        return;
    }

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    stores.forEach((store) => {
        const coords = projection([+store.lon, +store.lat]);
        if (coords) {
            ctx.moveTo(coords[0], coords[1]);
            ctx.arc(coords[0], coords[1], 0.7 / transform.k, 0, 2 * Math.PI);
        }
    });
    ctx.fill();
    ctx.restore();
}
