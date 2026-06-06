export const story = {
  chapterLabel: "Chapter 04",
  title: "Who drinks coffee?",
  intro:
    "This chapter shifts the question from coffee as a commodity to coffee as a daily habit. The first half builds a consumer profile across country, age, gender, occupation, drinking, and smoking. The second half turns to what tends to travel with heavier intake in everyday life, and then uses a second tracker dataset to look at timing and focus.",
  sections: [
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
        "The latest three marketing years compare national domestic consumption and split each total into roasted-and-ground and soluble coffee.",
    },
    {
      key: "ranking",
      title: "Which countries drink more on average?",
      body:
        "The first view ranks countries by average coffee intake per person. You can re-sort the same data by sleep hours or caffeine intake to see how the picture changes when the lens changes.",
    },
    {
      key: "age",
      title: "Does coffee intake change across age bands?",
      body:
        "The second view compresses the individual rows into age groups. It helps test whether coffee looks like a habit that belongs to one generation, or a routine that stays fairly stable across adulthood.",
    },
    {
      key: "gender",
      title: "Does coffee intake differ by gender?",
      body:
        "The third view compares coffee intake across gender groups with a boxplot. The main point is not a dramatic split; it is to show how similar the distributions really are, and to keep the page honest about a subtle effect.",
    },
    {
      key: "occupation",
      title: "Does coffee intake vary by occupation?",
      body:
        "The next set of views begins the consumer profile. Occupation is a useful anchor because it often sits close to daily routine and caffeine use, so the same groups are flipped between coffee intake and caffeine intake.",
    },
    {
      key: "alcohol",
      title: "Does coffee intake vary with drinking?",
      body:
        "This panel compares drinkers and non-drinkers on coffee and caffeine. It is a small but useful habit marker for the user profile.",
    },
    {
      key: "smoking",
      title: "Does coffee intake vary with smoking?",
      body:
        "This is the same flip-card idea applied to smoking. The point is to show whether the profile splits into distinct groups or stays fairly mixed.",
    },
    {
      key: "scatter",
      title: "What travels with heavier intake?",
      body:
        "The seventh panel uses flip cards to compare low- and high-intake groups on sleep, stress, BMI, activity, and health-related signals.",
    },
    {
      key: "focus",
      title: "Does caffeine timing change focus?",
      body:
        "The last panel uses the tracker dataset to compare focus across morning, afternoon, and evening intake. Each card flips between low and high caffeine so timing stays visible.",
    },
  ],
  note:
    "The dataset is synthetic and descriptive rather than medical. The goal here is to read patterns, not to prove a cause-and-effect relationship.",
};
