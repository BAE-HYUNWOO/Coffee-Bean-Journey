# Coffee Bean Journey

A polished scrollytelling scaffold for the data visualization course project:
**A Coffee Bean's Journey Around the World**.

## Quick Start

```bash
npm install
npm run dev
```

## Structure

- `src/main.js` – app entry
- `src/chapterRegistry.js` – all chapter definitions
- `src/chapters/*` – one folder per teammate / chapter
- `src/components/PlaceholderViz.js` – placeholder cards for future D3 charts
- `public/data/...` – ready folders for processed chapter datasets

## Suggested Team Workflow

- Member A: `chapter1_origin`
- Member B: `chapter2_trade`
- Member C: `chapter3_market`
- Member D: `chapter4_consumption`
- Member E: `chapter5_climate`
- Integrator/Lead: `main.js`, `chapterRegistry.js`, shared styles, deployment
