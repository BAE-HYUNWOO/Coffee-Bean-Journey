import * as d3 from "d3";
import { loadChapter4Data } from "./data.js";
import { buildChapter4Answers } from "./insights.js";
import { story } from "./story.js";
import {
  renderAgeProfile,
  renderCategoryMetricFlip,
  renderCountryRanking,
  renderDomesticConsumption,
  renderWorldConsumptionTrend,
  renderGenderCoffeeComparison,
  renderOutcomeMetric,
  renderBeanShare,
  renderSensoryRadar,
  renderAltitudeQuality,
  renderProcessingMethod,
  renderCaffeineRange,
  renderNutrientCompare,
  renderMilkChoice,
  renderFocusScatter,
} from "./charts.js";
import "./style.css";

let renderSequence = 0;
let activeMotionCleanup = () => {};

const QUESTION_MAP = {
  beanShare: { all: "不止一种豆——阿拉比卡和罗布斯塔到底差在哪？" },
  sensoryRadar: { all: "阿拉比卡更贵，贵得有道理吗？" },
  altitudeQuality: { all: "高海拔的咖啡豆真的更好喝？" },
  processingMethod: { all: "水洗还是日晒——加工手法能改变什么？" },
  caffeineRange: { all: "你手里的咖啡，到底含有多少咖啡因？" },
  nutrientCompare: { all: "一杯拿铁不只是咖啡——里面还有什么？" },
  milkChoice: { all: "换一种奶，热量能差多少？" },
  worldTrend: {
    all: "全球咖啡消费在涨还是在跌？",
  },
  ranking: {
    coffee: "哪些国家的人喝咖啡最多？",
    sleep: "这些国家的睡眠时长呢？",
    caffeine: "换成咖啡因摄入量，排名会变吗？",
  },
  age: {
    coffee: "咖啡是年轻人的饮料，还是中年人的习惯？",
    caffeine: "不同年龄段，咖啡因摄入有什么变化？",
  },
  gender: {
    coffee: "男性和女性，谁喝咖啡更多？",
    caffeine: "性别差异在咖啡因摄入上也存在吗？",
  },
  occupation: {
    coffee: "职业和咖啡摄入有关吗？",
    caffeine: "换个角度，咖啡因摄入量的职业差异呢？",
  },
  alcohol: {
    coffee: "喝酒的人和不喝酒的人，谁喝咖啡更多？",
    caffeine: "酒精和咖啡因——这两个习惯有交集吗？",
  },
  smoking: {
    coffee: "吸烟者和非吸烟者，咖啡习惯有差别吗？",
    caffeine: "吸烟的咖啡因摄入者有什么不同？",
  },
  outcome: {
    sleep: "咖啡喝越多，睡得越少？",
    sleepQuality: "咖啡喝越多，睡眠质量越差？",
    stress: "咖啡喝越多，压力更大吗？",
    bmi: "咖啡摄入量升高，BMI 会跟着涨吗？",
    activity: "咖啡喝得多的人，运动量会变化吗？",
    healthIssues: "咖啡喝多了，健康问题会增多吗？",
  },
  focus: {
    all: "咖啡因能提升专注力吗？什么时候喝效果最好？",
  },
};

const PROFILE_DIMENSIONS = [
  { value: "age", label: "Age" },
  { value: "gender", label: "Gender" },
  { value: "occupation", label: "Occupation" },
  { value: "alcohol", label: "Alcohol" },
  { value: "smoking", label: "Smoking" },
];

const PROFILE_METRICS = [
  { value: "coffee", label: "Coffee intake" },
  { value: "caffeine", label: "Caffeine" },
];

const PROFILE_QUESTION_MAP = {
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
    coffee: "Does coffee intake vary with alcohol use?",
    caffeine: "Does caffeine intake vary with alcohol use?",
  },
  smoking: {
    coffee: "Does coffee intake vary with smoking?",
    caffeine: "Does caffeine intake vary with smoking?",
  },
};

function getQuestion(groupName, value, fallback = "") {
  if (groupName === "consumption") {
    return `${value}年，哪个国家咖啡消费量最大？`;
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

function sectionShell({ id, section, reversed, controlGroup, controls, active, chartSlot, chartMarkup, panelClass = "" }) {
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
      <div class="chapter4-panel ${panelClass}" id="${id}">
        ${toolbar}
        ${chartMarkup ?? `<div id="${chartSlot}"></div>`}
      </div>
    </section>
  `;
}

function profileShellMarkup() {
  return `
    <div class="chapter4-profile-shell">
      <aside class="chapter4-profile-rail" data-profile-dimension-rail>
        <span class="chapter4-profile-label">Profile lens</span>
        <div class="chapter4-controls chapter4-profile-dimension-controls">
          ${PROFILE_DIMENSIONS.map((option) => `
            <button
              class="chapter4-chip"
              type="button"
              data-profile-dimension="${option.value}"
            >
              ${option.label}
            </button>
          `).join("")}
        </div>
      </aside>
      <div class="chapter4-profile-main">
        <div class="chapter4-panel-toolbar chapter4-profile-toolbar">
          <div class="chapter4-controls chapter4-profile-metric-controls">
            ${PROFILE_METRICS.map((option) => `
              <button
                class="chapter4-chip"
                type="button"
                data-profile-metric="${option.value}"
              >
              ${option.label}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="chapter4-profile-stage">
          <div class="chapter4-flip-card chapter4-profile-deck" id="chapter4-profile-deck" data-visible="front">
            <div class="chapter4-flip-inner">
              <div class="chapter4-flip-face is-front" data-face="front">
                <div id="chapter4-profile-front"></div>
              </div>
              <div class="chapter4-flip-face is-back" data-face="back">
                <div id="chapter4-profile-back"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderShell() {
  const sectionByKey = (key) => story.sections.find((section) => section.key === key);
  return `
    <div class="chapter4-board is-motion-ready">
      ${sectionShell({
        id: "chapter4-bean-share-shell",
        section: sectionByKey("beanShare"),
        reversed: false,
        controlGroup: "beanShare",
        controls: [],
        chartSlot: "chapter4-bean-share",
      })}

      ${sectionShell({
        id: "chapter4-sensory-radar-shell",
        section: sectionByKey("sensoryRadar"),
        reversed: true,
        controlGroup: "sensoryRadar",
        controls: [],
        chartSlot: "chapter4-sensory-radar",
      })}

      ${sectionShell({
        id: "chapter4-altitude-quality-shell",
        section: sectionByKey("altitudeQuality"),
        reversed: false,
        controlGroup: "altitudeQuality",
        controls: [],
        chartSlot: "chapter4-altitude-quality",
      })}

      ${sectionShell({
        id: "chapter4-processing-method-shell",
        section: sectionByKey("processingMethod"),
        reversed: true,
        controlGroup: "processingMethod",
        controls: [],
        chartSlot: "chapter4-processing-method",
      })}

      ${sectionShell({
        id: "chapter4-caffeine-range-shell",
        section: sectionByKey("caffeineRange"),
        reversed: false,
        controlGroup: "caffeineRange",
        controls: [],
        chartSlot: "chapter4-caffeine-range",
      })}

      ${sectionShell({
        id: "chapter4-nutrient-compare-shell",
        section: sectionByKey("nutrientCompare"),
        reversed: true,
        controlGroup: "nutrientCompare",
        controls: [],
        chartSlot: "chapter4-nutrient-compare",
      })}

      ${sectionShell({
        id: "chapter4-milk-choice-shell",
        section: sectionByKey("milkChoice"),
        reversed: false,
        controlGroup: "milkChoice",
        controls: [],
        chartSlot: "chapter4-milk-choice",
      })}

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
          { value: "2022", label: "2022" },
          { value: "2021", label: "2021" },
          { value: "2020", label: "2020" },
          { value: "2019", label: "2019" },
          { value: "2018", label: "2018" },
          { value: "2017", label: "2017" },
          { value: "2016", label: "2016" },
          { value: "2015", label: "2015" },
          { value: "2014", label: "2014" },
          { value: "2013", label: "2013" },
          { value: "2012", label: "2012" },
          { value: "2011", label: "2011" },
          { value: "2010", label: "2010" },
          { value: "2009", label: "2009" },
          { value: "2008", label: "2008" },
          { value: "2007", label: "2007" },
          { value: "2006", label: "2006" },
          { value: "2005", label: "2005" },
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
        id: "chapter4-profile-shell",
        section: sectionByKey("profile"),
        reversed: true,
        controlGroup: "profile",
        controls: [],
        panelClass: "chapter4-panel--wide",
        chartMarkup: profileShellMarkup(),
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
        controls: [],
        chartSlot: "chapter4-focus",
      })}
    </div>
  `;
}

function setupFlipDeck(deckSelector, options = {}) {
  const deck = document.querySelector(deckSelector);
  const frontSlot = deck.querySelector('[data-face="front"] > div');
  const backSlot = deck.querySelector('[data-face="back"] > div');
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const settings = {
    fixedHeight: Number.isFinite(options.fixedHeight) ? options.fixedHeight : null,
  };
  let visible = "front";
  let flipping = false;
  let queuedRender = null;

  const setHeight = () => {
    if (settings.fixedHeight) {
      deck.style.height = `${settings.fixedHeight}px`;
      return;
    }
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

  return {
    renderInitial,
    flipTo,
    setFixedHeight: (value) => {
      if (Number.isFinite(value) && value > 0) {
        settings.fixedHeight = value;
        deck.style.height = `${value}px`;
      }
    },
  };
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
      } else if (group.dataset.controlGroup === "outcome") {
        renderers.renderOutcome(true);
      } else if (group.dataset.controlGroup === "focus") {
        renderers.renderFocus(true);
      }
    });
  });
}

function setupProfileExplorer(container, data, answers, state) {
  const root = container.querySelector(".chapter4-profile-shell");
  const question = container.querySelector('[data-question-for="profile"]');
  const answer = container.querySelector('[data-answer-for="profile"]');
  const dimensionButtons = Array.from(root?.querySelectorAll("[data-profile-dimension]") ?? []);
  const metricButtons = Array.from(root?.querySelectorAll("[data-profile-metric]") ?? []);
  const deckController = setupFlipDeck("#chapter4-profile-deck");

  const buildRenderFn = (selector) => {
    const dimension = state.profileDimension;
    const metric = state.profileMetric;
    if (dimension === "age") {
      renderAgeProfile(selector, data.ageProfiles, metric);
      return;
    }
    if (dimension === "gender") {
      renderGenderCoffeeComparison(selector, data.rows, metric);
      return;
    }
    const configByDimension = {
      occupation: {
        field: "Occupation",
        tag: "Occupation lens",
        title: metric === "caffeine" ? "How do caffeine habits vary by occupation?" : "How do coffee habits vary by occupation?",
        description: "The same occupation groups are flipped between coffee intake and caffeine so the profile stays comparable.",
        categories: ["Healthcare", "Office", "Other", "Service", "Student"],
        sortMetric: "coffee",
      },
      alcohol: {
        field: "Alcohol_Consumption",
        tag: "Alcohol lens",
        title: metric === "caffeine" ? "How do caffeine habits vary with alcohol use?" : "How do coffee habits vary with alcohol use?",
        description: "Flip between coffee and caffeine to see whether drinkers and non-drinkers differ in their average intake.",
        categories: ["0", "1"],
        labelMap: {
          0: "Non-drinker",
          1: "Drinker",
        },
        sortMetric: "coffee",
      },
      smoking: {
        field: "Smoking",
        tag: "Smoking lens",
        title: metric === "caffeine" ? "How do caffeine habits vary with smoking?" : "How do coffee habits vary with smoking?",
        description: "Flip between coffee and caffeine to compare smokers and non-smokers on the same scale.",
        categories: ["0", "1"],
        labelMap: {
          0: "Non-smoker",
          1: "Smoker",
        },
        sortMetric: "coffee",
      },
    };
    renderCategoryMetricFlip(selector, data.rows, {
      ...configByDimension[dimension],
      metric,
    });
  };

  deckController.setFixedHeight(312);

  const syncButtons = () => {
    dimensionButtons.forEach((button) => {
      const active = button.dataset.profileDimension === state.profileDimension;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    metricButtons.forEach((button) => {
      const active = button.dataset.profileMetric === state.profileMetric;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const syncCopy = () => {
    if (question) {
      question.textContent = PROFILE_QUESTION_MAP[state.profileDimension]?.[state.profileMetric] ?? question.textContent;
    }
    if (answer) {
      answer.textContent = answers[state.profileDimension]?.[state.profileMetric] ?? "";
      answer.classList.add("is-visible");
    }
  };

  let profileRendered = false;
  const renderProfile = () => {
    const renderFn = buildRenderFn;
    if (profileRendered) {
      deckController.flipTo(renderFn);
      return;
    }
    deckController.renderInitial(renderFn);
    profileRendered = true;
  };

  const applyState = () => {
    syncButtons();
    syncCopy();
    renderProfile();
  };

  root?.querySelectorAll("[data-profile-dimension]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.profileDimension;
      if (!next || state.profileDimension === next) return;
      state.profileDimension = next;
      applyState();
    });
  });

  root?.querySelectorAll("[data-profile-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.profileMetric;
      if (!next || state.profileMetric === next) return;
      state.profileMetric = next;
      applyState();
    });
  });

  return {
    initialize: applyState,
    cleanup: () => {},
  };
}

export function renderChapter4(containerSelector) {
  activeMotionCleanup();
  activeMotionCleanup = () => {};
  const currentRender = ++renderSequence;
  const container = d3.select(containerSelector);
  container.html(`<div class="chapter4-loading">Loading chapter 4 data…</div>`);

  return loadChapter4Data()
    .then((data) => {
      if (currentRender !== renderSequence) return;

      const state = {
        beanShare: "all",
        sensoryRadar: "all",
        altitudeQuality: "all",
        processingMethod: "all",
        caffeineRange: "all",
        nutrientCompare: "all",
        milkChoice: "all",
        worldTrend: "all",
        consumption: "2022",
        ranking: "coffee",
        profileDimension: "age",
        profileMetric: "coffee",
        outcome: "sleep",
        focus: "all",
      };
      const answers = buildChapter4Answers(data);

      container.html(renderShell(data));
      const copyController = setupCopyController(container.node(), answers);
      copyController.initialize(state);
      const profileController = setupProfileExplorer(container.node(), data, answers, state);

      const consumptionDeck = setupFlipDeck("#chapter4-consumption-deck");
      const rankingDeck = setupFlipDeck("#chapter4-ranking-deck");
      const outcomesDeck = setupFlipDeck("#chapter4-outcomes-deck");

      const renderers = {
        renderWorldTrend: () => {
          renderWorldConsumptionTrend("#chapter4-world-trend", data.worldTrendCountries, data.topCountries);
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
        renderOutcome: (animate = false) => {
          const renderFn = (selector) => renderOutcomeMetric(selector, data.rows, state.outcome);
          if (animate) outcomesDeck.flipTo(renderFn);
          else outcomesDeck.renderInitial(renderFn);
        },
        renderFocus: () => {
          renderFocusScatter("#chapter4-focus", data.trackerRows);
        },
      };

      renderBeanShare("#chapter4-bean-share", data.beanShare);
      renderSensoryRadar("#chapter4-sensory-radar", data.cqiArabica, data.cqiRobusta);
      renderAltitudeQuality("#chapter4-altitude-quality", data.altitudeData);
      renderProcessingMethod("#chapter4-processing-method", data.processingStats);
      renderCaffeineRange("#chapter4-caffeine-range", data.categoryCaffeine);
      renderNutrientCompare("#chapter4-nutrient-compare", data.beverageNutrients);
      renderMilkChoice("#chapter4-milk-choice", data.milkComparison);

      attachControlHandlers(container.node(), state, renderers, copyController);
      renderers.renderWorldTrend();
      renderers.renderConsumption(false);
      renderers.renderRanking(false);
      profileController.initialize();
      renderers.renderOutcome(false);
      renderers.renderFocus();
      const cleanupReveal = setupSectionReveal(container.node());
      activeMotionCleanup = () => {
        cleanupReveal();
        copyController.cleanup();
        profileController.cleanup();
      };
    })
    .catch((error) => {
      if (currentRender !== renderSequence) return;
      console.error("Failed to load chapter 4 data", error);
      container.html(`<div class="chapter4-error"><strong>Chapter 4 data could not be loaded.</strong><span>${error?.message || "Please check the processed CSV files."}</span></div>`);
    });
}
