// Every setting a maintainer might need to change lives here.
window.MAP_CONFIG = {
  // OS Data Hub project "ELR web map": OS Vector Tile API + OS Maps API, OpenData plan.
  // This key is public by design (it is sent with every tile request). On the
  // OpenData plan it cannot run up a bill. Replace it here if it is ever rotated.
  osApiKey: "OYbKAtP5YpgsQopkayhTiSfPvjyfAd4P",

  // OS's published vector styles, pinned to one commit so they cannot change under us.
  // https://github.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets
  osStylesBase:
    "https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/95301d10fa540043c57714cd845fa9438f75ceee",

  // Free (OpenData) zoom limits, measured 2026-11-20: vector tiles to 15, raster to 16.
  // OS's vector styles draw zoom-15 features up to zoom 16 and switch to premium-only
  // layers from 16 (the map goes blank at exactly 16), so OS basemaps stop just short
  // of it: buildings and street names, field scale.
  osVectorMaxZoom: 15,
  osRasterMaxZoom: 16,
  osMapMaxZoom: 15.95,

  // Satellite imagery. Swap this one entry to change provider.
  satellite: {
    tiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxzoom: 18,
    attribution:
      'Powered by <a href="https://www.esri.com/">Esri</a> | Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};
