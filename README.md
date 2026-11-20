# web-mapping

Interactive map of the Evenlode Landscape Recovery (ELR) project area, for the North East
Cotswold Farmer Cluster CIC website. A static page (HTML, CSS, JavaScript and three
GeoJSON files) served by GitHub Pages, with no build step and no server. It costs nothing to run.

**Status: proof of concept.** The project area is dummy geometry.

## What is in it

| File | What it is |
|---|---|
| `index.html`, `style.css`, `map.js` | The page: MapLibre GL JS 4.7.1, loaded from unpkg at that exact version |
| `config.js` | Everything a maintainer may need to change: the OS API key, the OS style version, zoom limits, the satellite provider |
| `data/*.geojson` | Project area, catchments and rivers in WGS84, with areas already computed |
| `data/SOURCES.md` | Where each dataset came from, its licence and the attribution the map shows |
| `scripts/build_data.py` | Rebuilds `data/*.geojson` from the downloads in `data/source/` (not committed) |

## Basemaps

- **OS Light / OS Outdoor**: OS Vector Tile API, OpenData plan, styles from
  [OS-Vector-Tile-API-Stylesheets](https://github.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets)
  pinned to one commit. The free plan serves tiles to zoom 15, and OS's styles show them to
  just under 16, so OS basemaps stop at 15.95. Closer than that, OS draws only premium data.
- **Satellite**: Esri World Imagery.

The OS key belongs to the OS Data Hub project "ELR web map" (OS Vector Tile API). It is public by design, and on the OpenData plan it cannot run up a bill.

## Updating the project area

1. Put the new geometries in `data/source/project_area/project_area.gpkg` (any CRS; it is
   dissolved into one outline).
2. Run `python scripts/build_data.py` (needs geopandas).
3. Commit `data/project_area.geojson`. The panel's totals come from that file.

## Running it locally

    python -m http.server 8765

then open http://127.0.0.1:8765/. Opening `index.html` straight from disk does not work,
because the browser blocks the data requests.

## Embedding (later)

On Wix: Embed → Embed a Site, with the GitHub Pages URL. Inside an iframe the map zooms
with Ctrl+scroll and pans with two fingers, so the page around it still scrolls.
