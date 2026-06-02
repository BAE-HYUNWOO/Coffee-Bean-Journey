import { chapters, heroMetrics, projectHighlights } from './chapterRegistry.js';
import { createPlaceholderViz, createMiniNote } from './components/PlaceholderViz.js';
import { createStoryBlock, createSectionHeader, createMetaPills } from './shared/renderers.js';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/chapters.css';

function createHero() {
  const metrics = heroMetrics
    .map(
      (metric) => `
        <div class="metric-card glass-card">
          <div class="metric-label">${metric.label}</div>
          <div class="metric-value">${metric.value}</div>
          <div class="metric-caption">${metric.caption}</div>
        </div>
      `
    )
    .join('');

  const highlights = projectHighlights
    .map(
      (item) => `
        <li>
          <span class="highlight-bullet"></span>
          <div>
            <strong>${item.title}</strong>
            <p>${item.body}</p>
          </div>
        </li>
      `
    )
    .join('');

  return `
    <section class="hero-shell">
      <div class="hero-bg-orbit orbit-1"></div>
      <div class="hero-bg-orbit orbit-2"></div>
      <div class="hero-bean bean-1"></div>
      <div class="hero-bean bean-2"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <div class="eyebrow">Data Visualization · Scrollytelling Project</div>
          <h1>A Coffee Bean's Journey Around the World</h1>
          <p class="hero-subtitle">
            Follow one coffee bean from tropical farms to global trade routes, coffee chains,
            consumer cups, and climate uncertainty.
          </p>
          <div class="hero-actions">
            <a href="#chapter1" class="btn btn-primary">Start the Journey</a>
            <a href="#project-structure" class="btn btn-secondary">View Team Structure</a>
          </div>
          <div class="hero-tags">
            <span>FAOSTAT</span>
            <span>UN Comtrade</span>
            <span>Kaggle Store Data</span>
            <span>Our World in Data</span>
            <span>WorldClim</span>
          </div>
        </div>
        <div class="hero-panel glass-card">
          <div class="panel-heading">
            <span class="panel-kicker">Narrative Arc</span>
            <h3>From farm to cup — and beyond</h3>
          </div>
          <ol class="journey-steps">
            <li><span>01</span><div><strong>Origin</strong><p>Where coffee is grown and how production changes over time.</p></div></li>
            <li><span>02</span><div><strong>Trade</strong><p>How coffee moves across continents via export and import networks.</p></div></li>
            <li><span>03</span><div><strong>Market</strong><p>Which global brands dominate the retail landscape.</p></div></li>
            <li><span>04</span><div><strong>Consumption</strong><p>Who drinks the most coffee and what consumption patterns reveal.</p></div></li>
            <li><span>05</span><div><strong>Climate</strong><p>Whether climate change threatens coffee's future.</p></div></li>
          </ol>
        </div>
      </div>
      <div class="container metrics-grid">${metrics}</div>
      <div class="container intro-highlights glass-card">
        <div class="panel-heading compact">
          <span class="panel-kicker">Project Highlights</span>
          <h3>What makes this structure useful for your team</h3>
        </div>
        <ul class="highlights-list">${highlights}</ul>
      </div>
    </section>
  `;
}

function createProjectStructure() {
  const rows = chapters
    .map(
      (chapter) => `
        <div class="team-row">
          <div class="team-member-badge">${chapter.member}</div>
          <div>
            <h4>${chapter.title}</h4>
            <p>${chapter.question}</p>
          </div>
          <div class="team-dataset">${chapter.dataset}</div>
          <div class="team-folder">${chapter.folder}</div>
        </div>
      `
    )
    .join('');

  return `
    <section id="project-structure" class="section-block container">
      ${createSectionHeader('Project Structure', 'A clear workflow so 5 teammates can work in parallel with fewer Git conflicts.')}
      <div class="glass-card structure-card">
        <div class="structure-grid">
          <div>
            <h3>Recommended workflow</h3>
            <p>
              Each teammate owns one chapter folder, one data folder, and one cleaning script.
              Shared styling and integration stay in the root-level shared files.
            </p>
            <div class="pill-wrap">
              ${createMetaPills([
                'One chapter = one teammate',
                'D3-ready placeholders',
                'Scrollytelling layout',
                'Easy future integration',
              ])}
            </div>
          </div>
          <div class="workflow-box">
            <div class="workflow-step">Data cleaning → Processed CSV/JSON</div>
            <div class="workflow-step">Chart design → D3 implementation</div>
            <div class="workflow-step">Narrative copy → Story annotations</div>
            <div class="workflow-step">Final integration → Main storyline</div>
          </div>
        </div>
        <div class="team-table">${rows}</div>
      </div>
    </section>
  `;
}

function createChapterSection(chapter) {
  const visualCards = chapter.visuals
    .map((viz) => createPlaceholderViz(viz, chapter.accentClass))
    .join('');

  const notes = chapter.notes.map((note) => createMiniNote(note)).join('');
  const story = createStoryBlock(chapter.storyPoints);
  const pills = createMetaPills([chapter.dataset, chapter.deliverable, chapter.folder]);

  return `
    <section id="${chapter.id}" class="chapter-section ${chapter.accentClass}">
      <div class="container chapter-shell">
        <div class="chapter-left glass-card">
          <div class="chapter-label-row">
            <span class="chapter-number">${chapter.order}</span>
            <span class="chapter-member">${chapter.member}</span>
          </div>
          <h2>${chapter.title}</h2>
          <p class="chapter-question">${chapter.question}</p>
          <div class="pill-wrap">${pills}</div>
          ${story}
          <div class="chapter-note-grid">${notes}</div>
        </div>
        <div class="chapter-right">
          <div class="chapter-visual-heading">
            <h3>Reserved visualization slots</h3>
            <p>These cards are ready to be replaced with actual D3 charts later.</p>
          </div>
          <div class="viz-grid ${chapter.gridClass}">${visualCards}</div>
        </div>
      </div>
    </section>
  `;
}

function createConclusion() {
  return `
    <section id="conclusion" class="section-block container conclusion-wrap">
      ${createSectionHeader('Conclusion', 'A polished base design now, visual analytics later.')}
      <div class="conclusion-grid">
        <div class="glass-card conclusion-card">
          <h3>What is already done</h3>
          <ul>
            <li>Overall page structure and premium coffee-themed UI</li>
            <li>Five-chapter scrollytelling sections with teammate ownership</li>
            <li>Dedicated placeholders for maps, rankings, Sankey, networks, and scatterplots</li>
            <li>Folder structure that matches your GitHub collaboration workflow</li>
          </ul>
        </div>
        <div class="glass-card conclusion-card">
          <h3>What your team should do next</h3>
          <ul>
            <li>Put real processed data into each chapter folder under <code>public/data</code></li>
            <li>Replace each placeholder card with a D3 chart in that chapter’s <code>index.js</code></li>
            <li>Refine chapter text using actual findings from your datasets</li>
            <li>Add screenshots and processing notes into the <code>report</code> folder</li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function createSideNav() {
  const links = chapters
    .map(
      (chapter) => `
      <a href="#${chapter.id}" class="side-nav-link">
        <span>${chapter.order}</span>
        <em>${chapter.shortTitle}</em>
      </a>
    `
    )
    .join('');

  return `
    <aside class="side-nav glass-card">
      <div class="side-nav-title">Journey Map</div>
      <a href="#app" class="side-nav-home">Top</a>
      ${links}
      <a href="#conclusion" class="side-nav-home">End</a>
    </aside>
  `;
}

function initNavigationHighlight() {
  const sections = document.querySelectorAll('.chapter-section, #project-structure, #conclusion');
  const links = document.querySelectorAll('.side-nav-link, .side-nav-home');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        links.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === id);
        });
      });
    },
    { threshold: 0.35 }
  );

  sections.forEach((section) => observer.observe(section));
}

function mountApp() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${createSideNav()}
    <main class="page-shell">
      ${createHero()}
      ${createProjectStructure()}
      ${chapters.map(createChapterSection).join('')}
      ${createConclusion()}
    </main>
  `;

  initNavigationHighlight();
}

mountApp();
