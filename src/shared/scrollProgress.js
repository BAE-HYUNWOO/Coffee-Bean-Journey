export function initScrollProgress() {
  const progress = document.querySelector("#scroll-progress");
  if (!progress) return;

  const sections = [...document.querySelectorAll("header[id], section[id]")];
  const navLinks = [...document.querySelectorAll(".nav-link")];

  function update() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? scrollTop / max : 0;
    progress.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;

    let activeId = "";
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 160) activeId = section.id;
    }

    navLinks.forEach((link) => {
      const href = link.getAttribute("href")?.replace("#", "");
      link.classList.toggle("is-active", href === activeId);
    });
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}
