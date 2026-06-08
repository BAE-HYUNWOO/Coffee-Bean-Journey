import { renderChapter1 } from "./chapters/chapter1_origin/index.js";
import { renderChapter2 } from "./chapters/chapter2_trade/index.js";
import { renderChapter3 } from "./chapters/chapter3_market/index.js";
import { renderChapter4 } from "./chapters/chapter4_consumption/index.js";
import { renderChapter5 } from "./chapters/chapter5_climate/index.js";

export const pages = [
  {
    id: "home",
    path: "#home",
    navTitle: "Home",
    eyebrow: "A Coffee Bean's Journey Around the World",
    title: "From farm to cup, one bean connects the world.",
    lead:
      "Explore how coffee grows, moves, becomes a global business, shapes everyday consumption, and faces future environmental pressure.",
    render: null,
  },
  {
    id: "origin",
    path: "#origin",
    number: "01",
    navTitle: "Origin",
    title: "Where does coffee come from?",
    question: "Coffee begins as an agricultural crop grown across the tropical belt.",
    description:
      "We first locate the farms: which countries produce coffee, how production has changed since 1990, and which producers dominate the global supply map.",
    dataset: "FAOSTAT",
    sourceLabel: "Country, year, production, harvested area",
    themeClass: "theme-origin",
    render: renderChapter1,
  },
  {
    id: "trade",
    path: "#trade",
    number: "02",
    navTitle: "Trade",
    title: "How does coffee travel?",
    question: "Before reaching cafés, coffee moves through a dense global trade network.",
    description:
      "This chapter follows HS0901 coffee exports from reporting countries to partner markets, turning trade value and weight into routes, flows, and network structure.",
    dataset: "UN Comtrade HS0901",
    sourceLabel: "Reporter, partner, trade value, net weight",
    themeClass: "theme-trade",
    render: renderChapter2,
  },
  {
    id: "market",
    path: "#market",
    number: "03",
    navTitle: "Market",
    title: "Who controls the coffee market?",
    question: "Coffee is not only a crop, but also a branded global business.",
    description:
      "A Starbucks expansion map shows how one brand translated coffee demand into a worldwide retail footprint across regions and decades.",
    dataset: "Starbucks Store Dataset + brand reports",
    sourceLabel: "Stores, countries, opening year, region",
    themeClass: "theme-market",
    render: renderChapter3,
  },
  {
    id: "consumption",
    path: "#consumption",
    number: "04",
    navTitle: "Consumption",
    title: "Who drinks coffee?",
    question: "The journey ends in cups, habits, menus, and everyday routines.",
    description:
      "This chapter connects bean type, beverage choice, country-level consumption, and personal lifestyle indicators to show how coffee becomes a daily culture.",
    dataset: "ICO / CQI / Starbucks nutrition / synthetic profile data",
    sourceLabel: "Consumption, bean quality, caffeine, sleep, stress",
    themeClass: "theme-consumption",
    render: renderChapter4,
  },
  {
    id: "prosperity",
    path: "#prosperity",
    number: "05",
    navTitle: "Future",
    title: "Can coffee remain prosperous in the future?",
    question: "Climate pressure could reshape the regions and communities that depend on coffee.",
    description:
      "The final chapter turns from the present journey to future vulnerability: heat stress, rainfall instability, suitability shifts, and risk concentration.",
    dataset: "WorldClim + World Bank Climate Knowledge Portal",
    sourceLabel: "Temperature, rainfall, suitability, climate risk",
    themeClass: "theme-climate",
    render: renderChapter5,
  },
];

export const chapters = pages.filter((page) => page.id !== "home");
