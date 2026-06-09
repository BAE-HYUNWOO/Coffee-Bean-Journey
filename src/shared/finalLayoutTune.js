function tuneOriginCharts() {
  document.querySelectorAll(".theme-origin #origin-map svg").forEach((svg) => {
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.classList.add("origin-map-fill-svg");
  });

  document.querySelectorAll(".theme-origin #origin-bar svg").forEach((svg) => {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.classList.add("origin-bar-fill-svg");
  });

  document.querySelectorAll(".theme-origin #origin-line svg").forEach((svg) => {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.classList.add("origin-line-fill-svg");
  });
}

const chapter4CardTypes = [
  ["chapter4-bean-share-shell", "chapter4-card-square"],
  ["chapter4-sensory-radar-shell", "chapter4-card-wide"],
  ["chapter4-altitude-quality-shell", "chapter4-card-wide"],
  ["chapter4-processing-method-shell", "chapter4-card-wide"],
  ["chapter4-caffeine-range-shell", "chapter4-card-medium"],
  ["chapter4-nutrient-compare-shell", "chapter4-card-medium"],
  ["chapter4-milk-choice-shell", "chapter4-card-medium"],
  ["chapter4-world-trend-shell", "chapter4-card-wide"],
  ["chapter4-consumption-shell", "chapter4-card-medium"],
  ["chapter4-ranking-shell", "chapter4-card-medium"],
  ["chapter4-profile-shell", "chapter4-card-large"],
  ["chapter4-outcomes-shell", "chapter4-card-medium"],
  ["chapter4-focus-shell", "chapter4-card-large"],
];

function tuneChapter4Cards() {
  document.querySelectorAll(".chapter4-board.is-card-grid .chapter4-section").forEach((section) => {
    chapter4CardTypes.forEach(([panelId, className]) => {
      if (section.querySelector(`#${panelId}`)) {
        section.classList.add(className);
        section.dataset.cardKind = className.replace("chapter4-card-", "");
      }
    });

    section.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    });
  });
}

function runLayoutTune() {
  tuneOriginCharts();
  tuneChapter4Cards();
}

let raf = 0;
function scheduleTune() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(runLayoutTune);
}

if (document.body) {
  const observer = new MutationObserver(scheduleTune);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleTune();
  window.addEventListener("hashchange", scheduleTune);
  window.addEventListener("resize", scheduleTune);
} else {
  window.addEventListener("DOMContentLoaded", scheduleTune, { once: true });
}
