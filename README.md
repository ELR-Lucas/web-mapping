# web-mapping

Interactive map of the Evenlode Landscape Recovery (ELR) project area, for the North East
Cotswold Farmer Cluster CIC website. A static page (HTML, CSS, JavaScript and a few data
files) served by GitHub Pages, with no build step and no server. It costs nothing to run.

**Status: proof of concept.** The project area is dummy geometry.

## What is in it

| File | What it is |
|---|---|
| `index.html`, `style.css`, `map.js` | The page: MapLibre GL JS 4.7.1 and pmtiles 4.3.0, loaded from unpkg at those exact versions |
| `config.js` | Everything a maintainer may need to change: the OS API key, the OS style version, zoom limits, the satellite provider |
| `data/project_area.pmtiles` | The project boundary as vector tiles (zooms 6–13), one merged outline |
| `data/stats.json` | The panel's figures (project area, and its split by catchment). No geometry |
| `data/catchments.geojson`, `data/rivers.geojson` | Catchments and rivers in WGS84 (open data) |
| `data/SOURCES.md` | Where each dataset came from, its licence and the attribution the map shows |
| `scripts/build_data.py` | Rebuilds everything in `data/` from the downloads in `data/source/` (not committed) |
| `scripts/serve.py` | Local preview server (see below) |

The project boundary is published as vector tiles, not as a GeoJSON file, so there is no
single file of it to save and open. That is friction, not protection: anyone who knows the
format can reassemble it. What a copy is worth is set by the simplification in
`build_data.py` (`SIMPLIFY_M`), so publish only the precision you are happy to give away.
The map's credits say the boundary is not licensed for reuse.

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
2. Run `python scripts/build_data.py`. It needs geopandas with GDAL 3.8 or later, which
   can write PMTiles.
3. Commit `data/project_area.pmtiles` and `data/stats.json`. The panel's totals come from
   `stats.json`.

Every committed version stays in the repo's history, so commit only geometry you are
happy to have public permanently.

## Running it locally

    python scripts/serve.py

then open http://127.0.0.1:8765/. Use this, not `python -m http.server`: the boundary
tiles are read in parts (HTTP range requests), as GitHub Pages serves them, and Python's
built-in server cannot do that. Opening `index.html` straight from disk does not work
either, because the browser blocks the data requests.

## Embedding (later)

On Wix: Embed → Embed a Site, with the GitHub Pages URL. Inside an iframe the map zooms
with Ctrl+scroll and pans with two fingers, so the page around it still scrolls.
