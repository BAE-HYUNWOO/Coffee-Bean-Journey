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

  const nav = header.append("nav").attr("class", "site-nav");
  nav.selectAll("a")
    .data(pages)
    .join("a")
    .attr("href", d => `#${d.id}`)
    .attr("class", "nav-link")
    .text(d => d.label);
}

function renderPage(pageId) {
  heroSlideTimer && window.clearInterval(heroSlideTimer);
  heroSlideTimer = null;

  const page = pages.find(p => p.id === pageId) || pages[0];
  setActiveNav(page.id);
  app.select("main").remove();

  const main = app.append("main").attr("class", `page page-${page.id}`);

  if (page.id === "home") {
    main.html(page.render());
    initHeroSlideshow();
    return;
  }

  const chapter = chapters.find(ch => ch.id === page.id);
  if (chapter) {
    main.html(`<section id="${chapter.id}" class="chapter-host"></section>`);
    chapter.render(`#${chapter.id}`);
  }
}

function currentPageFromHash() {
  return (window.location.hash || "#home").replace("#", "");
}

renderNavigation();
renderPage(currentPageFromHash());
initScrollProgress();

window.addEventListener("hashchange", () => {
  renderPage(currentPageFromHash());
});
