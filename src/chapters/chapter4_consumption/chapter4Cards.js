function shouldIgnoreFlipClick(target) {
  return Boolean(
    target.closest("button, a, input, select, textarea, .chapter4-controls, .chapter4-panel-toolbar, .chapter4-card-flip-button")
  );
}

function prepareChapter4Card(section) {
  if (section.dataset.cardFlipReady === "true") return;

  const copy = section.querySelector(".chapter4-section-copy");
  const panel = section.querySelector(".chapter4-panel");
  const title = copy?.querySelector("h3")?.textContent?.trim() || "Consumption insight";
  if (!copy || !panel) return;

  section.dataset.cardFlipReady = "true";
  section.classList.add("chapter4-card-tile");
  section.setAttribute("tabindex", "0");
  section.setAttribute("role", "button");
  section.setAttribute("aria-label", `${title}. Click to flip this card.`);
  section.setAttribute("aria-pressed", "false");
  panel.dataset.cardTitle = title;

  let flipButton = panel.querySelector(".chapter4-card-flip-button");
  if (!flipButton) {
    flipButton = document.createElement("button");
    flipButton.className = "chapter4-card-flip-button";
    flipButton.type = "button";
    panel.appendChild(flipButton);
  }
  flipButton.textContent = "Read";
  flipButton.setAttribute("aria-label", `Read explanation for ${title}`);

  if (!copy.querySelector(".chapter4-card-back-hint")) {
    const backHint = document.createElement("span");
    backHint.className = "chapter4-card-back-hint";
    backHint.textContent = "Click card to return";
    copy.appendChild(backHint);
  }

  const setFlipped = (next) => {
    section.classList.toggle("is-card-flipped", next);
    flipButton.textContent = next ? "Chart" : "Read";
    section.setAttribute("aria-pressed", String(next));
  };

  const toggle = () => setFlipped(!section.classList.contains("is-card-flipped"));

  flipButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  });

  section.addEventListener("click", (event) => {
    if (shouldIgnoreFlipClick(event.target)) return;
    toggle();
  });

  section.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (shouldIgnoreFlipClick(event.target)) return;
    event.preventDefault();
    toggle();
  });
}

function prepareChapter4Board(board) {
  if (!board || board.dataset.cardGridReady === "true") {
    board?.querySelectorAll(".chapter4-section").forEach(prepareChapter4Card);
    return;
  }
  board.dataset.cardGridReady = "true";
  board.classList.add("is-card-grid");

  board.querySelectorAll(".chapter4-section").forEach(prepareChapter4Card);
}

function scanChapter4() {
  document.querySelectorAll(".chapter4-board").forEach(prepareChapter4Board);
}

const observer = new MutationObserver(() => scanChapter4());

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  scanChapter4();
} else {
  window.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
    scanChapter4();
  }, { once: true });
}

window.addEventListener("hashchange", scanChapter4);
