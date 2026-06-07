export const story = {
  chapterLabel: "Chapter 04",
  title: "From bean to cup",
  intro:
    "This chapter traces coffee from the raw bean to the final cup. It starts with the two main commercial species and their sensory profiles, then moves to what those beans become on the Starbucks menu. The second half shifts to global consumption patterns, and the last part builds a compact consumer profile to see what travels with heavier intake without repeating the same chart five times.",
  sections: [
    {
      key: "beanShare",
      title: "Not all coffee beans are the same",
      body: "Coffee's two main commercial species — Arabica and Robusta — dominate the market, and they differ not only in price but also in caffeine content and flavour chemistry.",
    },
    {
      key: "sensoryRadar",
      title: "How do Arabica and Robusta compare across every dimension?",
      body: "The Coffee Quality Institute's sensory scores reveal a consistent gap: Arabica leads across aroma, flavour, acidity, body, and balance. The radar chart makes the profile difference instantly visible.",
    },
    {
      key: "altitudeQuality",
      title: "Does higher altitude really mean better coffee?",
      body: "Conventional wisdom says high-altitude beans taste better. Each dot represents a CQI-graded lot. The pattern is real but noisier than expected.",
    },
    {
      key: "processingMethod",
      title: "How does processing method shape quality?",
      body: "Washed, natural, honey-processed — the method used to remove the cherry pulp leaves a measurable signature on the final cup score.",
    },
    {
      key: "caffeineRange",
      title: "What drink packs the most caffeine?",
      body: "The Starbucks menu spans from a mellow espresso-based latte to a Venti brewed coffee that delivers 410 mg of caffeine. This chart ranks every beverage category by its average and range.",
    },
    {
      key: "nutrientCompare",
      title: "What is really inside a coffee drink?",
      body: "Six classic espresso-based drinks in the standard Grande size show that a coffee order is never just caffeine — it carries calories, fat, carbs, and protein, which vary enormously with what you order.",
    },
    {
      key: "milkChoice",
      title: "Does milk choice matter?",
      body: "Switching from 2% to nonfat or soy changes the nutritional profile of a latte more than most people expect.",
    },
    {
      key: "worldTrend",
      title: "How has global coffee consumption changed?",
      body:
        "All country records are aggregated by year to show how roasted-and-ground and soluble coffee combine into total domestic consumption.",
    },
    {
      key: "consumption",
      title: "Which countries consume the most coffee?",
      body:
        "The latest three marketing years keep this panel focused and readable. The full multi-year trend already appears above, so this view only spotlights 2020, 2021, and 2022 instead of turning every year into a separate facet.",
    },
    {
      key: "ranking",
      title: "Which countries drink more on average?",
      body:
        "The first view ranks countries by average coffee intake per person. You can re-sort the same data by sleep hours or caffeine intake to see how the picture changes when the lens changes.",
    },
    {
      key: "profile",
      title: "What shapes coffee intake across people?",
      body:
        "Use the vertical buttons to switch between age, gender, occupation, alcohol, and smoking, then use the coffee/caffeine toggle above to compare the same population from two angles without duplicating the layout five times. The card now stays fixed in size and flips like the other interactive panels.",
    },
    {
      key: "scatter",
      title: "What travels with heavier intake?",
      body:
        "The seventh panel uses flip cards to compare low- and high-intake groups on sleep, stress, BMI, activity, and health-related signals.",
    },
    {
      key: "focus",
      title: "Does caffeine intake change focus?",
      body:
        "The last panel uses the tracker dataset to compare focus across caffeine quartiles. Morning, afternoon, and evening are color coded, each box marks the median, and the trend lines use median regression.",
    },
  ],
  note:
    "Sections 1-7 use Starbucks nutritional data and CQI sensory data. Sections 8-10 use USDA consumption data. Section 11 and 12 use synthetic health survey data. Section 13 uses tracker data. The synthetic dataset is descriptive rather than medical — the goal is to read patterns, not to prove cause-and-effect.",
};
