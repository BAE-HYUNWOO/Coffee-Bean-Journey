import * as d3 from "d3";
import { pages, chapters } from "./chapterRegistry.js";
import { initScrollProgress } from "./shared/scrollProgress.js";
import "./styles/finalPolish.css";
import "./styles/chapterRefineFinal.css";
import "./styles/chapter2StickyControlsPatch.css";
import "./styles/originWidePatch.css";
import "./styles/sectionPolishPatch.css";
import "./styles/finalLayoutTuning.css";
import "./chapters/chapter4_consumption/chapter4Cards.js";
import "./shared/finalLayoutTune.js";

const HERO_SLIDE_ROOTS = ["/images/hero-slides"];
const HERO_SLIDE_FILENAMES = [
  ...Array.from({ length: 6 }, (_, index) => `hero-${index + 1}.png`),
  "coffee-1.jpg",
  "coffee-2.jpg",
  "coffee-3.jpg",
  "coffee-4.jpg",
  "coffee-5.jpg",
];
const HERO_SLIDE_CANDIDATES = HERO_SLIDE_FILENAMES.flatMap((fileName) =>
  HERO_SLIDE_ROOTS.map((root) => `${import.meta.env.BASE_URL}${root.replace(/^\//, "")}/${fileName}`)
);

const HOME_OVERVIEW_ITEMS = [
  {
    id: "origin",
    number: "01",
    title: "Origin",
    stat: "81 countries · 11.3M t",
    meta: "FAOSTAT production geography",
    blurb: "Where coffee grows, who produces the most, and how output changes over time.",
    themeClass: "overview-origin",
  },
  {
    id: "trade",
    number: "02",
    title: "Trade",
    stat: "$41.4B · 148 exporters",
    meta: "UN Comtrade global flow network",
    blurb: "Major exporter-importer corridors, route intensity, and cross-border coffee circulation.",
    themeClass: "overview-trade",
  },
  {
    id: "market",
    number: "03",
    title: "Market",
    stat: "Global brand footprint",
    meta: "Starbucks stores and expansion",
    blurb: "How coffee demand became a worldwide retail network across countries and years.",
    themeClass: "overview-market",
  },
  {
    id: "consumption",
    number: "04",
    title: "Consumption",
    stat: "Habits · caffeine · taste",
    meta: "ICO / CQI / nutrition data",
    blurb: "Daily coffee culture through bean type, beverage choice, and consumption patterns.",
    themeClass: "overview-consumption",
  },
  {
    id: "prosperity",
    number: "05",
    title: "Future",
    stat: "Climate suitability & risk",
    meta: "WorldClim + climate indicators",
    blurb: "How temperature and rainfall pressure may reshape coffee regions in the future.",
    themeClass: "overview-future",
  },
];

const app = d3.select("#app");
let heroSlideTimer = null;

function imageExists(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function initHeroSlideshow() {
  const slideshow = document.querySelector(".home-slideshow");
  if (!slideshow) return;

  const loadedSlides = (await Promise.all(HERO_SLIDE_CANDIDATES.map(imageExists))).filter(Boolean);

  if (loadedSlides.length === 0) {
    slideshow.classList.add("is-empty");
    return;
  }

  loadedSlides.forEach((src, index) => {
    const slide = document.createElement("div");
    slide.className = `hero-slide ${index === 0 ? "is-active" : ""}`;
    slide.style.backgroundImage = `url("${src}")`;
    slideshow.appendChild(slide);
  });

  let activeIndex = 0;
  heroSlideTimer = window.setInterval(() => {
    const slides = [...slideshow.querySelectorAll(".hero-slide")];
    if (slides.length <= 1) return;

    slides[activeIndex].classList.remove("is-active");
    activeIndex = (activeIndex + 1) % slides.length;
    slides[activeIndex].classList.add("is-active");
  }, 4500);
}

function setActiveNav(pageId) {
  d3.selectAll(".nav-link").classed("is-active", function () {
    return d3.select(this).attr("href") === `#${pageId}`;
  });
}

function renderNavigation() {
  d3.select(".site-header").remove();

  const header = app.append("header").attr("class", "site-header");

  header.append("div").attr("id", "scroll-progress").attr("class", "scroll-progress");

  header.append("a")
    .attr("href", "#home")
    .attr("class", "site-logo")
    .attr("aria-label", "Go to opening")
    .html(`
      <span class="logo-bean"></span>
      <span class="logo-text">Coffee Journey</span>
    `);

  const menu = header.append("nav").attr("class", "site-menu").attr("aria-label", "Primary navigation");

  [{ id: "home", path: "#home", navTitle: "Home" }, ...chapters].forEach((page) => {
    menu.append("a")
      .attr("href", page.path || `#${page.id}`)
      .attr("class", "nav-link")
      .text(page.navTitle || page.label || page.id);
  });
}

function renderOpening(main) {
  const hero = main.append("section")
    .attr("class", "home-top-hero unified-opening clean-opening compact-opening")
    .attr("id", "home")
    .attr("aria-label", "Coffee journey opening image");

  hero.append("div").attr("class", "home-slideshow");
  hero.append("div").attr("class", "hero-soft-overlay");

  const titleLayer = hero.append("div").attr("class", "opening-title-layer reveal-item");
  titleLayer.append("p").attr("class", "opening-kicker").text("Data Visualization Project");
  titleLayer.append("h1").text("A Coffee Bean's Journey Around the World");
}


function renderHomeOverview(main) {
  const overview = main.append("section")
    .attr("class", "home-overview reveal-item")
    .attr("aria-label", "Story overview");

  const shell = overview.append("div").attr("class", "home-overview-shell");

  const head = shell.append("div").attr("class", "home-overview-head");
  head.append("span").attr("class", "section-label").text("Overview");
  head.append("h2").text("Five views of one global coffee system");
  head.append("p").text("Before scrolling into each chapter, this overview shows the main data angle of each part—from production and trade to market structure, consumption, and climate risk.");

  const grid = shell.append("div").attr("class", "home-overview-grid");

  HOME_OVERVIEW_ITEMS.forEach((item) => {
    const card = grid.append("a")
      .attr("class", `home-overview-card ${item.themeClass}`)
      .attr("href", `#${item.id}`);

    card.append("span").attr("class", "overview-chip").text(`Chapter ${item.number}`);
    card.append("h3").text(item.title);
    card.append("strong").attr("class", "overview-stat").text(item.stat);
    card.append("p").attr("class", "overview-meta").text(item.meta);
    card.append("p").attr("class", "overview-blurb").text(item.blurb);
  });
}

function renderChapterSection(main, page) {
  const section = main.append("section")
    .attr("id", page.id)
    .attr("class", `story-chapter ${page.themeClass || ""}`)
    .attr("data-chapter", page.number || "");

  const shell = section.append("div").attr("class", "chapter-shell reveal-item");

  const intro = shell.append("aside").attr("class", "chapter-intro compact-chapter-intro");
  intro.append("p").attr("class", "section-label").text(`Chapter ${page.number || ""}`);
  intro.append("div")
    .attr("class", "chapter-watermark-title")
    .html(`<span>Chapter ${page.number || ""}</span><strong>${page.navTitle || page.title || page.id}</strong>`);

  intro.append("h2").text(page.title || page.navTitle || page.id);
  if (page.question) intro.append("p").attr("class", "page-question").text(page.question);
  if (page.description) intro.append("p").attr("class", "page-description").text(page.description);

  const board = shell.append("div")
    .attr("class", "chapter-visual-board")
    .attr("id", `${page.id}-visual`);

  try {
    if (typeof page.render !== "function") {
      throw new TypeError(`${page.id}.render is not a function`);
    }
    page.render(`#${page.id}-visual`);
  } catch (error) {
    console.error(`Failed to render ${page.id}`, error);
    board.html(`
      <div class="chapter-error-card">
        <strong>Visualization failed to render</strong>
        <span>${error?.message || "Unknown error"}</span>
      </div>
    `);
  }
}

function renderConclusion(main) {
  const conclusion = main.append("section").attr("id", "conclusion").attr("class", "story-conclusion reveal-item");
  conclusion.append("p").attr("class", "section-label").text("Conclusion");
  conclusion.append("h2").html("From tropical farms to city cafés,<br/>coffee is a global system.");
  conclusion.append("p")
    .text("A single cup connects land, labor, transport, brands, consumption cultures, and climate uncertainty. The journey is not linear; it is a network of places, people, markets, and environmental pressures.");

  const grid = conclusion.append("div").attr("class", "conclusion-grid");
  [
    ["Origin", "Production is concentrated in tropical regions, but its geography keeps changing."],
    ["Trade", "Coffee crosses borders through dense exporter-to-importer corridors."],
    ["Market", "Brand expansion turns agricultural supply into a global business landscape."],
    ["Consumption", "Coffee habits differ across countries, lifestyles, and product forms."],
    ["Future", "Climate pressure could redraw the map of coffee suitability."],
  ].forEach(([title, body]) => {
    grid.append("article").html(`<strong>${title}</strong><span>${body}</span>`);
  });
}

function setupReveal() {
  const items = [...document.querySelectorAll(".reveal-item, .story-chapter")];
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -12% 0px" });

  items.forEach((item) => observer.observe(item));
}

function syncNavToScroll() {
  const sections = [...document.querySelectorAll("#home, .story-chapter")];

  const update = () => {
    const current = sections
      .map((section) => ({
        id: section.id,
        top: Math.abs(section.getBoundingClientRect().top - 82),
        visibleTop: section.getBoundingClientRect().top,
      }))
      .filter((item) => item.visibleTop < window.innerHeight * 0.72)
      .sort((a, b) => a.top - b.top)[0];

    if (current?.id) setActiveNav(current.id);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("hashchange", () => setActiveNav(window.location.hash.replace("#", "") || "home"));
}

function renderUnifiedStory() {
  if (heroSlideTimer) {
    window.clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }

  d3.select("#page-root").remove();
  const main = app.append("main").attr("id", "page-root").attr("class", "page-root unified-page");

  renderOpening(main);
  renderHomeOverview(main);
  chapters.forEach((page) => renderChapterSection(main, page));
  renderConclusion(main);

  initHeroSlideshow();
  setupReveal();
  initScrollProgress();

  const initialId = window.location.hash?.replace("#", "") || "home";
  setActiveNav(initialId);

  if (initialId !== "home") {
    requestAnimationFrame(() => {
      document.getElementById(initialId)?.scrollIntoView({ block: "start" });
    });
  }

  syncNavToScroll();
}

function renderApp() {
  document.body.classList.add("is-story-scrolling");
  renderNavigation();
  renderUnifiedStory();
}

renderApp();
