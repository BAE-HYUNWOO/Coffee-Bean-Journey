export function createPlaceholderViz(viz, themeClass = '') {
  return `
    <article class="viz-card glass-card viz-${viz.size} ${themeClass}">
      <div class="viz-card-top">
        <span class="viz-type">${viz.type}</span>
        <span class="viz-owner">${viz.owner}</span>
      </div>
      <div class="viz-graphic">
        <div class="viz-icon-wrap">
          <div class="viz-icon viz-icon-${viz.type.toLowerCase().replace(/[^a-z]+/g, '-')}"></div>
        </div>
        <div class="viz-grid-lines"></div>
      </div>
      <div class="viz-body">
        <h4>${viz.title}</h4>
        <p>${viz.subtitle}</p>
      </div>
      <div class="viz-filehint">
        <span>Suggested data file</span>
        <code>${viz.fileHint}</code>
      </div>
    </article>
  `;
}

export function createMiniNote(text) {
  return `
    <div class="mini-note glass-card">
      <div class="mini-note-dot"></div>
      <p>${text}</p>
    </div>
  `;
}
