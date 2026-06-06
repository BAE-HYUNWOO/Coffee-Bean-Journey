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
    question: "Coffee begins as an agricultural crop grown across tropical regions.",
    description:
      "This page introduces the geography of coffee production: producing countries, production scale, and how output has changed across time.",
    dataset: "FAOSTAT",
    sourceLabel: "Production, area, yield",
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
      "This page follows coffee across borders through export-import routes, major trade corridors, and international market connections.",
    dataset: "UN Comtrade HS0901",
    sourceLabel: "Export/import value and quantity",
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
      "This page moves from beans to brands, showing the spatial expansion of coffee chains and the market power behind everyday consumption.",
    dataset: "Starbucks Store Dataset + brand reports",
    sourceLabel: "Stores, brands, market share",
    themeClass: "theme-market",
    render: renderChapter3,
  },
  {
    id: "consumption",
    path: "#consumption",
    number: "04",
    navTitle: "Consumption",
    title: "Who drinks coffee?",
    question: "",
    description: "",
    dataset: "",
    sourceLabel: "",
    themeClass: "theme-consumption",
    render: renderChapter4,
  },
  {
    id: "prosperity",
    path: "#prosperity",
    number: "05",
    navTitle: "Prosperity",
    title: "Can coffee remain prosperous in the future?",
    question: "Climate pressure could reshape the regions and communities that depend on coffee.",
    description:
      "This page connects temperature, rainfall, suitability, and risk to explore the future sustainability of coffee production.",
    dataset: "WorldClim + World Bank Climate",
    sourceLabel: "Temperature, rainfall, suitability",
    themeClass: "theme-climate",
    render: renderChapter5,
  },
];

export const chapters = pages.filter((page) => page.id !== "home");
