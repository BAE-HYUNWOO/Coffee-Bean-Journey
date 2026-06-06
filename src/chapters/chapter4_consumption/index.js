import { loadChapter4Data } from "./data.js";
import { buildChapter4Answers } from "./insights.js";
import { story } from "./story.js";
import {
  renderAgeProfile,
  renderCategoryMetricFlip,
  renderCountryRanking,
  renderDomesticConsumption,
  renderWorldConsumptionTrend,
  renderFocusTiming,
  renderGenderCoffeeComparison,
  renderOutcomeMetric,
} from "./charts.js";

let renderSequence = 0;
let activeMotionCleanup = () => {};

const QUESTION_MAP = {
  worldTrend: {
    all: "How has global coffee consumption changed?",
  },
  ranking: {
    coffee: "Which countries drink more on average?",
    sleep: "Which countries sleep longer on average?",
    caffeine: "Which countries consume more caffeine on average?",
  },
  age: {
    coffee: "Does coffee intake change across age bands?",
    caffeine: "Does caffeine intake change across age bands?",
  },
  gender: {
    coffee: "Does coffee intake differ by gender?",
    caffeine: "Does caffeine intake differ by gender?",
  },
  occupation: {
    coffee: "Does coffee intake vary by occupation?",
    caffeine: "Does caffeine intake vary by occupation?",
  },
  alcohol: {
    coffee: "Does coffee intake vary with drinking?",
    caffeine: "Does caffeine intake vary with drinking?",
  },
  smoking: {
    coffee: "Does coffee intake vary with smoking?",
    caffeine: "Does caffeine intake vary with smoking?",
  },
  outcome: {
    sleep: "Does heavier coffee intake travel with shorter sleep?",
    sleepQuality: "Does heavier coffee intake travel with poorer sleep quality?",
    stress: "Does heavier coffee intake travel with higher stress?",
    bmi: "Does BMI change as coffee intake rises?",
    activity: "Does activity change as coffee intake rises?",
    healthIssues: "Do reported health issues change as coffee intake rises?",
  },
  focus: {
    morning: "Does morning caffeine consumption change focus?",
    afternoon: "Does afternoon caffeine consumption change focus?",
    evening: "Does evening caffeine consumption change focus?",
  },
};

function getQuestion(groupName, value, fallback = "") {
  if (groupName === "consumption") {
    return `Which countries consumed the most coffee in ${value}?`;
  }
  return QUESTION_MAP[groupName]?.[value] ?? fallback;
}

function controlButtons(name, options, active) {
  return `
    <div class="chapter4-controls" data-control-group="${name}">
      ${options
        .map(
          (option) => `
            <button
              class="chapter4-chip ${option.value === active ? "is-active" : ""}"
              type="button"
              data-value="${option.value}"
              aria-pressed="${option.value === active}"
            >
              ${option.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function flipDeckMarkup(deckId, frontSlot, backSlot) {
  return `
    <div class="chapter4-flip-card" id="${deckId}" data-visible="front">
      <div class="chapter4-flip-inner">
        <div class="chapter4-flip-face is-front" data-face="front">
          <div id="${frontSlot}"></div>
        </div>
        <div class="chapter4-flip-face is-back" data-face="back">
          <div id="${backSlot}"></div>
        </div>
      </div>
    </div>
  `;
}

function sectionShell({ id, section, reversed, controlGroup, controls, active, chartSlot, chartMarkup }) {
  const toolbar = controls && controls.length
    ? `
        <div class="chapter4-panel-toolbar">
          ${controlButtons(controlGroup, controls, active)}
        </div>
      `
    : "";

  return `
    <section
      class="chapter4-section ${reversed ? "is-reversed" : ""}"
      data-reveal-direction="${reversed ? "right" : "left"}"
    >
      <div class="chapter4-section-copy">
        <h3 data-question-for="${controlGroup}">${section.title}</h3>
        <p class="chapter4-answer" data-answer-for="${controlGroup}" aria-live="polite"></p>
      </div>
      <div class="chapter4-panel" id="${id}">
        ${toolbar}
        ${chartMarkup ?? `<div id="${chartSlot}"></div>`}
      </div>
    </section>
  `;
}

function renderShell() {
  const sectionByKey = (key) => story.sections.find((section) => section.key === key);
  return `
    <div class="chapter4-board is-motion-ready">
      ${sectionShell({
        id: "chapter4-world-trend-shell",
        section: sectionByKey("worldTrend"),
        reversed: false,
        controlGroup: "worldTrend",
        controls: [],
        chartSlot: "chapter4-world-trend",
      })}

      ${sectionShell({
        id: "chapter4-consumption-shell",
        section: sectionByKey("consumption"),
        reversed: true,
        controlGroup: "consumption",
        controls: [
          { value: "2020", label: "2020" },
          { value: "2021", label: "2021" },
          { value: "2022", label: "2022" },
        ],
        active: "2022",
        chartMarkup: flipDeckMarkup("chapter4-consumption-deck", "chapter4-consumption-front", "chapter4-consumption-back"),
      })}

      ${sectionShell({
        id: "chapter4-ranking-shell",
        section: sectionByKey("ranking"),
        reversed: false,
        controlGroup: "ranking",
        controls: [
          { value: "coffee", label: "Coffee intake" },
          { value: "sleep", label: "Sleep hours" },
          { value: "caffeine", label: "Caffeine" },
        ],
        active: "coffee",
        chartMarkup: flipDeckMarkup("chapter4-ranking-deck", "chapter4-ranking-front", "chapter4-ranking-back"),
      })}

      ${sectionShell({
        id: "chapter4-age-shell",
        section: sectionByKey("age"),
        reversed: true,
        controlGroup: "age",
        controls: [
          { value: "coffee", label: "Coffee intake" },
          { value: "caffeine", label: "Caffeine" },
        ],
        active: "coffee",
        chartMarkup: flipDeckMarkup("chapter4-age-deck", "chapter4-age-front", "chapter4-age-back"),
      })}

      ${sectionShell({
        id: "chapter4-gender-shell",
        section: sectionByKey("gender"),
        reversed: false,
        controlGroup: "gender",
        controls: [
          { value: "coffee", label: "Coffee intake" },
          { value: "caffeine", label: "Caffeine" },
        ],
        active: "coffee",
        chartMarkup: flipDeckMarkup("chapter4-gender-deck", "chapter4-gender-front", "chapter4-gender-back"),
      })}

      ${sectionShell({
        id: "chapter4-occupation-shell",
        section: sectionByKey("occupation"),
        reversed: true,
        controlGroup: "occupation",
        controls: [
          { value: "coffee", label: "Coffee intake" },
          { value: "caffeine", label: "Caffeine" },
        ],
        active: "coffee",
        chartMarkup: flipDeckMarkup("chapter4-occupation-deck", "chapter4-occupation-front", "chapter4-occupation-back"),
      })}

      ${sectionShell({
        id: "chapter4-alcohol-shell",
        section: sectionByKey("alcohol"),
        reversed: false,
        controlGroup: "alcohol",
        controls: [
          { value: "coffee", label: "Coffee intake" },
          { value: "caffeine", label: "Caffeine" },
        ],
        active: "coffee",
        chartMarkup: flipDeckMarkup("chapter4-alcohol-deck", "chapter4-alcohol-front", "chapter4-alcohol-back"),
      })}

      ${sectionShell({
        id: "chapter4-smoking-shell",
        section: sectionByKey("smoking"),
        reversed: true,
        controlGroup: "smoking",
        controls: [
          { value: "coffee", label: "Coffee intake" },
          { value: "caffeine", label: "Caffeine" },
        ],
        active: "coffee",
        chartMarkup: flipDeckMarkup("chapter4-smoking-deck", "chapter4-smoking-front", "chapter4-smoking-back"),
      })}

      ${sectionShell({
        id: "chapter4-outcomes-shell",
        section: sectionByKey("scatter"),
        reversed: false,
        controlGroup: "outcome",
        controls: [
          { value: "sleep", label: "Sleep hours" },
          { value: "sleepQuality", label: "Sleep quality" },
          { value: "stress", label: "Stress" },
          { value: "bmi", label: "BMI" },
          { value: "activity", label: "Activity hours" },
          { value: "healthIssues", label: "Health issues" },
        ],
        active: "sleep",
        chartMarkup: flipDeckMarkup("chapter4-outcomes-deck", "chapter4-outcomes-front", "chapter4-outcomes-back"),
      })}

      ${sectionShell({
        id: "chapter4-focus-shell",
        section: sectionByKey("focus"),
        reversed: true,
        controlGroup: "focus",
        controls: [
          { value: "morning", label: "Morning" },
          { value: "afternoon", label: "Afternoon" },
          { value: "evening", label: "Evening" },
        ],
        active: "morning",
        chartMarkup: flipDeckMarkup("chapter4-focus-deck", "chapter4-focus-front", "chapter4-focus-back"),
      })}
    </div>
  `;
}

function setupFlipDeck(deckSelector) {
  const deck = document.querySelector(deckSelector);
  const frontSlot = deck.querySelector('[data-face="front"] > div');
  const backSlot = deck.querySelector('[data-face="back"] > div');
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = "front";
  let flipping = false;
  let queuedRender = null;

  const setHeight = () => {
    const faces = [deck.querySelector('[data-face="front"]'), deck.querySelector('[data-face="back"]')];
    const heights = faces.map((face) => face?.scrollHeight ?? 0);
    const maxHeight = Math.max(...heights, 0);
    if (maxHeight) {
      deck.style.height = `${maxHeight}px`;
    }
  };

  const renderInitial = (renderFn) => {
    renderFn("#" + frontSlot.id);
    setHeight();
  };

  const flipTo = (renderFn) => {
    if (flipping) {
      queuedRender = renderFn;
      return;
    }

    const next = visible === "front" ? "back" : "front";
    const targetSlot = next === "front" ? frontSlot : backSlot;
    renderFn("#" + targetSlot.id);
    setHeight();
    deck.dataset.visible = next;
    flipping = true;
    const inner = deck.querySelector(".chapter4-flip-inner");
    let fallbackTimer = null;

    const finishFlip = () => {
      if (!flipping) return;
      clearTimeout(fallbackTimer);
      inner.removeEventListener("transitionend", handleEnd);
      inner.removeEventListener("transitioncancel", handleCancel);

      const previous = visible;
      visible = next;
      deck.querySelector(`[data-face="${previous}"] > div`).innerHTML = "";
      setHeight();
      flipping = false;

      const nextRender = queuedRender;
      queuedRender = null;
      if (nextRender) {
        requestAnimationFrame(() => flipTo(nextRender));
      }
    };

    const handleEnd = (event) => {
      if (event.target !== inner || event.propertyName !== "transform") return;
      finishFlip();
    };
    const handleCancel = (event) => {
      if (event.target !== inner) return;
      finishFlip();
    };

    inner.addEventListener("transitionend", handleEnd);
    inner.addEventListener("transitioncancel", handleCancel);
    fallbackTimer = setTimeout(finishFlip, prefersReducedMotion ? 0 : 900);
  };

  return { renderInitial, flipTo };
}

function setupSectionReveal(container) {
  const board = container.querySelector(".chapter4-board");
  const sections = Array.from(container.querySelectorAll(".chapter4-section"));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-revealed"));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    },
  );

  sections.forEach((section) => observer.observe(section));
  requestAnimationFrame(() => board?.classList.add("is-observing"));
  return () => observer.disconnect();
}

function setupCopyController(container, answers) {
  const pendingTimers = new Map();
  const sequences = new Map();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clearPending = (groupName) => {
    const timers = pendingTimers.get(groupName) ?? [];
    timers.forEach((timer) => clearTimeout(timer));
    pendingTimers.delete(groupName);
  };

  const setContent = (groupName, value) => {
    const question = container.querySelector(`[data-question-for="${groupName}"]`);
    const answer = container.querySelector(`[data-answer-for="${groupName}"]`);
    if (!question || !answer) return null;
    question.textContent = getQuestion(groupName, value, question.textContent);
    answer.textContent = answers[groupName]?.[value] ?? "";
    answer.classList.add("is-visible");
    return question.closest(".chapter4-section-copy");
  };

  const initialize = (state) => {
    Object.entries(state).forEach(([groupName, value]) => setContent(groupName, value));
  };

  const update = (groupName, value) => {
    clearPending(groupName);
    const sequence = (sequences.get(groupName) ?? 0) + 1;
    sequences.set(groupName, sequence);
    const question = container.querySelector(`[data-question-for="${groupName}"]`);
    const copy = question?.closest(".chapter4-section-copy");
    if (!copy || prefersReducedMotion) {
      setContent(groupName, value);
      return;
    }

    copy.classList.remove("is-switching-in", "is-switching-visible");
    copy.classList.add("is-copy-animating", "is-switching-out");

    const swapTimer = setTimeout(() => {
      if (sequences.get(groupName) !== sequence) return;
      setContent(groupName, value);
      copy.classList.remove("is-switching-out");
      copy.classList.add("is-switching-in");

      requestAnimationFrame(() => {
        if (sequences.get(groupName) !== sequence) return;
        requestAnimationFrame(() => copy.classList.add("is-switching-visible"));
      });
    }, 170);

    const finishTimer = setTimeout(() => {
      if (sequences.get(groupName) !== sequence) return;
      copy.classList.remove("is-copy-animating", "is-switching-in", "is-switching-visible");
      pendingTimers.delete(groupName);
    }, 780);

    pendingTimers.set(groupName, [swapTimer, finishTimer]);
  };

  const cleanup = () => {
    pendingTimers.forEach((timers) => timers.forEach((timer) => clearTimeout(timer)));
    pendingTimers.clear();
    sequences.clear();
  };

  return { initialize, update, cleanup };
}

function attachControlHandlers(container, state, renderers, copyController) {
  container.querySelectorAll("[data-control-group]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      const value = button.dataset.value;
      const groupName = group.dataset.controlGroup;
      if (state[groupName] === value) return;
      state[groupName] = value;

      group.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      copyController.update(groupName, value);

      if (group.dataset.controlGroup === "ranking") {
        renderers.renderRanking(true);
      } else if (group.dataset.controlGroup === "consumption") {
        renderers.renderConsumption(true);
      } else if (group.dataset.controlGroup === "age") {
        renderers.renderAge(true);
      } else if (group.dataset.controlGroup === "gender") {
        renderers.renderGender(true);
      } else if (group.dataset.controlGroup === "occupation") {
        renderers.renderOccupation(true);
      } else if (group.dataset.controlGroup === "alcohol") {
        renderers.renderAlcohol(true);
      } else if (group.dataset.controlGroup === "smoking") {
        renderers.renderSmoking(true);
      } else if (group.dataset.controlGroup === "outcome") {
        renderers.renderOutcome(true);
      } else if (group.dataset.controlGroup === "focus") {
        renderers.renderFocus(true);
      }
    });
  });
}

export function renderChapter4(containerSelector) {
  activeMotionCleanup();
  activeMotionCleanup = () => {};
  const currentRender = ++renderSequence;
  const container = d3.select(containerSelector);
  container.html(`<div class="chapter4-loading">Loading chapter 4 data…</div>`);

  loadChapter4Data()
    .then((data) => {
      if (currentRender !== renderSequence) return;

      const state = {
        worldTrend: "all",
        consumption: "2022",
        ranking: "coffee",
        age: "coffee",
        gender: "coffee",
        occupation: "coffee",
        alcohol: "coffee",
        smoking: "coffee",
        outcome: "sleep",
        focus: "morning",
      };
      const answers = buildChapter4Answers(data);

      container.html(renderShell(data));
      const copyController = setupCopyController(container.node(), answers);
      copyController.initialize(state);

      const consumptionDeck = setupFlipDeck("#chapter4-consumption-deck");
      const rankingDeck = setupFlipDeck("#chapter4-ranking-deck");
      const ageDeck = setupFlipDeck("#chapter4-age-deck");
      const genderDeck = setupFlipDeck("#chapter4-gender-deck");
      const occupationDeck = setupFlipDeck("#chapter4-occupation-deck");
      const alcoholDeck = setupFlipDeck("#chapter4-alcohol-deck");
      const smokingDeck = setupFlipDeck("#chapter4-smoking-deck");
      const outcomesDeck = setupFlipDeck("#chapter4-outcomes-deck");
      const focusDeck = setupFlipDeck("#chapter4-focus-deck");

      const renderers = {
        renderWorldTrend: () => {
          renderWorldConsumptionTrend("#chapter4-world-trend", data.worldConsumptionTrend);
        },
        renderConsumption: (animate = false) => {
          const renderFn = (selector) => renderDomesticConsumption(selector, data.consumptionByYear, state.consumption);
          if (animate) consumptionDeck.flipTo(renderFn);
          else consumptionDeck.renderInitial(renderFn);
        },
        renderRanking: (animate = false) => {
          const renderFn = (selector) => renderCountryRanking(selector, data.countries, state.ranking);
          if (animate) rankingDeck.flipTo(renderFn);
          else rankingDeck.renderInitial(renderFn);
        },
        renderAge: (animate = false) => {
          const renderFn = (selector) => renderAgeProfile(selector, data.ageProfiles, state.age);
          if (animate) ageDeck.flipTo(renderFn);
          else ageDeck.renderInitial(renderFn);
        },
        renderGender: (animate = false) => {
          const renderFn = (selector) => renderGenderCoffeeComparison(selector, data.rows, state.gender);
          if (animate) genderDeck.flipTo(renderFn);
          else genderDeck.renderInitial(renderFn);
        },
        renderOccupation: (animate = false) => {
          const renderFn = (selector) => renderCategoryMetricFlip(selector, data.rows, {
            field: "Occupation",
            metric: state.occupation,
            title: "How do coffee habits vary by occupation?",
            tag: "Occupation lens",
            description: "The same occupation groups are flipped between coffee intake and caffeine so the profile stays comparable.",
            categories: ["Healthcare", "Office", "Other", "Service", "Student"],
            sortMetric: "coffee",
          });
          if (animate) occupationDeck.flipTo(renderFn);
          else occupationDeck.renderInitial(renderFn);
        },
        renderAlcohol: (animate = false) => {
          const renderFn = (selector) => renderCategoryMetricFlip(selector, data.rows, {
            field: "Alcohol_Consumption",
            metric: state.alcohol,
            title: "How do coffee habits vary with drinking?",
            tag: "Alcohol lens",
            description: "Flip between coffee and caffeine to see whether drinkers and non-drinkers differ in their average intake.",
            categories: ["0", "1"],
            labelMap: {
              0: "Non-drinker",
              1: "Drinker",
            },
            sortMetric: "coffee",
          });
          if (animate) alcoholDeck.flipTo(renderFn);
          else alcoholDeck.renderInitial(renderFn);
        },
        renderSmoking: (animate = false) => {
          const renderFn = (selector) => renderCategoryMetricFlip(selector, data.rows, {
            field: "Smoking",
            metric: state.smoking,
            title: "How do coffee habits vary with smoking?",
            tag: "Smoking lens",
            description: "Flip between coffee and caffeine to compare smokers and non-smokers on the same scale.",
            categories: ["0", "1"],
            labelMap: {
              0: "Non-smoker",
              1: "Smoker",
            },
            sortMetric: "coffee",
          });
          if (animate) smokingDeck.flipTo(renderFn);
          else smokingDeck.renderInitial(renderFn);
        },
        renderOutcome: (animate = false) => {
          const renderFn = (selector) => renderOutcomeMetric(selector, data.rows, state.outcome);
          if (animate) outcomesDeck.flipTo(renderFn);
          else outcomesDeck.renderInitial(renderFn);
        },
        renderFocus: (animate = false) => {
          const renderFn = (selector) => renderFocusTiming(selector, data.trackerRows, state.focus);
          if (animate) focusDeck.flipTo(renderFn);
          else focusDeck.renderInitial(renderFn);
        },
      };

      attachControlHandlers(container.node(), state, renderers, copyController);
      renderers.renderWorldTrend();
      renderers.renderConsumption(false);
      renderers.renderRanking(false);
      renderers.renderAge(false);
      renderers.renderGender(false);
      renderers.renderOccupation(false);
      renderers.renderAlcohol(false);
      renderers.renderSmoking(false);
      renderers.renderOutcome(false);
      renderers.renderFocus(false);
      const cleanupReveal = setupSectionReveal(container.node());
      activeMotionCleanup = () => {
        cleanupReveal();
        copyController.cleanup();
      };
    })
    .catch((error) => {
      if (currentRender !== renderSequence) return;
      console.error("Failed to load chapter 4 data", error);
      container.html(`<div class="chapter4-error">Chapter 4 data could not be loaded. Please check the processed CSV file.</div>`);
    });
}
