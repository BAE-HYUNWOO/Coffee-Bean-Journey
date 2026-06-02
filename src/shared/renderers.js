export function createSectionHeader(eyebrow, title) {
  return `
    <div class="section-header">
      <span class="section-eyebrow">${eyebrow}</span>
      <h2>${title}</h2>
    </div>
  `;
}

export function createMetaPills(items) {
  return items.map((item) => `<span class="meta-pill">${item}</span>`).join('');
}

export function createStoryBlock(storyPoints) {
  return `
    <div class="story-block">
      <h3>Story focus</h3>
      <ul>
        ${storyPoints.map((point) => `<li>${point}</li>`).join('')}
      </ul>
    </div>
  `;
}
