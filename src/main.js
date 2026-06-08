import * as d3 from "d3";
import { pages, chapters } from "./chapterRegistry.js";
import { initScrollProgress } from "./shared/scrollProgress.js";

const HERO_SLIDE_ROOTS = ["/images/hero-slides"];
const HERO_SLIDE_CANDIDATES = [
  "coffee-1.jpg",
  "coffee-2.jpg",
  "coffee-3.jpg",
  "coffee-4.jpg",
  "coffee-5.jpg",
].flatMap((fileName) => HERO_SLIDE_ROOTS.map((root) => `${import.meta.env.BASE_URL}${root.replace(/^\//, "")}/${fileName}`));

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
      .attr("href", page.path)
      .attr("class", "nav-link")
      .text(page.navTitle);
  });
}

function renderOpening(main) {
  const hero = main.append("section").attr("class", "home-top-hero unified-opening").attr("id", "home");
  hero.append("div").attr("class", "home-slideshow");
  hero.append("div").attr("class", "hero-soft-overlay");
  const heroCopy = hero.append("div").attr("class", "opening-copy reveal-item");
  heroCopy.append("p").attr("class", "opening-eyebrow").text("A Coffee Bean's Journey Around the World");
  heroCopy.append("h1").html("One bean.<br/>Five systems.<br/>A global story.");
  heroCopy.append("p").attr("class", "opening-lead")
    .text("Follow coffee from tropical farms through trade routes, brand networks, consumer habits, and future climate pressure.");
  const actions = heroCopy.append("div").attr("class", "opening-actions");
  actions.append("a").attr("href", "#origin").attr("class", "primary-action").text("Start the journey");
  actions.append("a").attr("href", "#trade").attr("class", "secondary-action").text("Jump to trade");

  const notice = main.append("section").attr("class", "home-notice-bar story-notice reveal-item");
  notice.append("a")
    .attr("href", "#origin")
    .attr("class", "notice-left")
    .html(`
      <strong>Scrollytelling Mode</strong>
      <span>All chapters are now connected into one continuous data magazine.</span>
      <em>↓</em>
    `);

  notice.append("a")
    .attr("href", "#prosperity")
    .attr("class", "notice-right")
    .html(`
      <span>Farm · Route · Brand · Cup · Future</span>
      <em>⌄</em>
    `);

  const quick = main.append("section").attr("class", "home-quick-links unified-quick reveal-item");
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
}

function renderChapterSection(main, page, index) {
  const section = main.append("section")
    .attr("id", page.id)
    .attr("class", `story-chapter ${page.themeClass}`)
    .attr("data-chapter", page.number);

  const shell = section.append("div").attr("class", "chapter-shell reveal-item");

  const intro = shell.append("aside").attr("class", "chapter-intro");
  intro.append("p").attr("class", "section-label").text(`Chapter ${page.number}`);
  intro.append("h2").text(page.title);
  if (page.question) intro.append("p").attr("class", "page-question").text(page.question);
  if (page.description) intro.append("p").attr("class", "page-description").text(page.description);

  const meta = intro.append("div").attr("class", "chapter-side-meta");
  if (page.dataset) meta.append("div").html(`<strong>Dataset</strong><span>${page.dataset}</span>`);
  if (page.sourceLabel) meta.append("div").html(`<strong>Main fields</strong><span>${page.sourceLabel}</span>`);
  meta.append("a").attr("href", index < chapters.length - 1 ? chapters[index + 1].path : "#conclusion").text(index < chapters.length - 1 ? "Next chapter →" : "Conclusion →");

  const board = shell.append("div")
    .attr("class", "chapter-visual-board")
    .attr("id", `${page.id}-visual`);

  try {
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

function renderUnifiedStory() {
  if (heroSlideTimer) {
    window.clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }

  d3.select("#page-root").remove();
  const main = app.append("main").attr("id", "page-root").attr("class", "page-root unified-page");

  renderOpening(main);
  chapters.forEach((page, index) => renderChapterSection(main, page, index));
  renderConclusion(main);

  initHeroSlideshow();
  setupReveal();
  initScrollProgress();

  const initialId = window.location.hash?.replace("#", "") || "home";
  setActiveNav(initialId);
}

function renderApp() {
  document.body.classList.add("is-story-scrolling");
  renderNavigation();
  renderUnifiedStory();

  window.addEventListener("hashchange", () => {
    const id = window.location.hash.replace("#", "") || "home";
    setActiveNav(id);
  });
}

renderApp();
