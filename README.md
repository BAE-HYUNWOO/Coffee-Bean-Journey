# Chapter 2 Trade module

This folder contains the D3 implementation for:

- Global coffee route map
- Sankey-style exporter → importer ribbons
- Force-directed trade network
- Recent-period trend chart
- Top exporter/importer rankings

## How to use

1. Copy the `src/` and `public/` folders from this package into your project root.
2. Put the real UN Comtrade CSV here:

```txt
public/data/chapter2_trade/raw/comtrade_coffee_recent_raw.csv
```

3. Run:

```bash
python src/chapters/chapter2_trade/process_trade_data.py
```

4. In your page/router/main file, render the chapter:

```js
import renderChapter2Trade from "./chapters/chapter2_trade";

renderChapter2Trade("#chapter2-trade");
```

5. Make sure your HTML has:

```html
<section id="chapter2-trade"></section>
```

## Important

For the full visual experience, the raw UN Comtrade download must use:

```txt
Partners: All
2nd Partner: World
Aggregate By: None
```

If your raw file only has `partnerDesc = World`, the top exporter chart works, but Sankey/map/network will not have real bilateral flows.
