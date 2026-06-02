import * as d3 from "d3";
import { pages, chapters } from "./chapterRegistry.js";

const HERO_SLIDE_ROOTS = ["./images", "./public/images"];

const HERO_SLIDE_CANDIDATES = [
  "coffee-1.jpg",
  "coffee-2.jpg",
  "coffee-3.jpg",
  "coffee-4.jpg",
  "coffee-5.jpg",
].flatMap((fileName) => HERO_SLIDE_ROOTS.map((root) => `${root}/${fileName}`));

const app = d3.select("#app");

let heroSlideTimer = null;

function getCurrentPageId() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return "home";
  return pages.some((page) => page.id === hash) ? hash : "home";
}

function setActiveNav(pageId) {
  d3.selectAll(".nav-link").classed("is-active", function () {
    return d3.select(this).attr("href") === `#${pageId}`;
  });
}

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

function renderNavigation() {
  const nav = app.append("header").attr("class", "site-header");

  nav.append("a")
    .attr("href", "#home")
    .attr("class", "site-logo")
    .attr("aria-label", "Go to home")
    .html(`
      <span class="logo-bean"></span>
      <span class="logo-text">Coffee Journey</span>
    `);

  const menu = nav.append("nav").attr("class", "site-menu").attr("aria-label", "Primary navigation");

  chapters.forEach((page) => {
    menu.append("a")
      .attr("href", page.path)
      .attr("class", "nav-link")
      .text(page.navTitle);
  });
}

function renderHome() {
  const main = app.append("main").attr("id", "page-root").attr("class", "page-root home-page");

  const hero = main.append("section").attr("class", "home-top-hero");
  hero.append("div").attr("class", "home-slideshow");
  hero.append("div").attr("class", "hero-soft-overlay");

  const notice = main.append("section").attr("class", "home-notice-bar");
  notice.append("a")
    .attr("href", "#origin")
    .attr("class", "notice-left")
    .html(`
      <strong>Journey Notice</strong>
      <span>Follow one coffee bean across agriculture, trade, market, consumption and future prosperity.</span>
      <em>+</em>
    `);

  notice.append("a")
    .attr("href", "#trade")
    .attr("class", "notice-right")
    .html(`
      <span>Coffee Journey Project</span>
      <em>⌄</em>
    `);

  const feature = main.append("section").attr("class", "home-feature-panel");
  feature.append("div")
    .attr("class", "feature-brand")
    .html(`
      <div class="feature-emblem">CJ</div>
      <strong>COFFEE<br/>JOURNEY</strong>
    `);

  const featureText = feature.append("div").attr("class", "feature-copy");
  featureText.append("h1").text("A Coffee Bean's Journey Around the World");
  featureText.append("p")
    .text("From tropical farms to urban cafés, coffee connects global production, cross-border trade, brand power, everyday consumption and climate uncertainty.");
  const featureActions = featureText.append("div").attr("class", "feature-actions");
  featureActions.append("a").attr("href", "#origin").text("Explore origin");
  featureActions.append("a").attr("href", "#prosperity").text("Future prosperity");

  const originPromo = main.append("section").attr("class", "home-origin-promo");
  originPromo.append("div").attr("class", "origin-mark").html(`<span>★</span><i></i>`);
  const originText = originPromo.append("div").attr("class", "origin-promo-copy");
  originText.append("p").text("ORIGIN");
  originText.append("h2").text("COLOMBIA");
  originText.append("strong").text("GRANDS OF ESPERANZA");
  originText.append("a").attr("href", "#origin").text("Details");

  const magazine = main.append("section").attr("class", "home-magazine");
  const magazineCopy = magazine.append("div").attr("class", "magazine-copy");
  magazineCopy.append("span").text("R");
  magazineCopy.append("h2").text("JOURNEY MAGAZINE");
  magazineCopy.append("p").text("Read the story of coffee through data: trade routes, market networks, consumption cultures, and future risks.");
  magazineCopy.append("a").attr("href", "#market").text("Read more");

  magazine.append("div").attr("class", "magazine-line");

  const quick = main.append("section").attr("class", "home-quick-links");
  chapters.forEach((chapter) => {
    quick.append("a")
      .attr("href", chapter.path)
      .attr("class", `quick-card ${chapter.themeClass}`)
      .html(`
        <span>${chapter.number}</span>
        <strong>${chapter.navTitle}</strong>
        <small>${chapter.dataset}</small>
      `);
  });

  const footer = main.append("footer").attr("class", "home-footer");
  const footerGrid = footer.append("div").attr("class", "home-footer-grid");

  [
    ["PROJECT", ["Origin", "Trade", "Market", "Consumption", "Prosperity"]],
    ["DATA", ["FAOSTAT", "UN Comtrade", "Starbucks Dataset", "OWID / ICO"]],
    ["VISUALIZATION", ["Map", "Sankey", "Network", "Timeline"]],
    ["STORY", ["Farm", "Route", "Brand", "Cup", "Future"]],
  ].forEach(([title, items]) => {
    const col = footerGrid.append("div");
    col.append("h3").text(title);
    items.forEach((item) => col.append("p").text(item));
  });

  footer.append("p").attr("class", "footer-note").text("© Coffee Journey Data Visualization Project");

  initHeroSlideshow();
}

function renderPageShell(page) {
  const main = app.append("main")
    .attr("id", "page-root")
    .attr("class", `page-root single-page ${page.themeClass}`);

  const intro = main.append("section").attr("class", "page-intro");

  const copy = intro.append("div").attr("class", "page-intro-copy");
  copy.append("p").attr("class", "section-label").text(`Chapter ${page.number}`);
  copy.append("h1").text(page.title);
  copy.append("p").attr("class", "page-question").text(page.question);
  copy.append("p").attr("class", "page-description").text(page.description);

  const meta = intro.append("div").attr("class", "page-meta");
  meta.append("div").html(`<strong>Dataset</strong><span>${page.dataset}</span>`);
  meta.append("div").html(`<strong>Main fields</strong><span>${page.sourceLabel}</span>`);

  const board = main.append("section")
    .attr("class", "page-board")
    .attr("id", `${page.id}-visual`);

  page.render(`#${page.id}-visual`);
}

function renderCurrentPage() {
  if (heroSlideTimer) {
    window.clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }

  d3.select("#page-root").remove();

  const pageId = getCurrentPageId();
  const page = pages.find((item) => item.id === pageId) || pages[0];

  setActiveNav(page.id);

  if (page.id === "home") {
    renderHome();
  } else {
    renderPageShell(page);
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderApp() {
  renderNavigation();
  renderCurrentPage();

  window.addEventListener("hashchange", renderCurrentPage);
}

renderApp();
