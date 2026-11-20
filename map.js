(function () {
  "use strict";

  const cfg = window.MAP_CONFIG;
  const YEAR = new Date().getFullYear();
  const OS_ATTRIBUTION = `Contains OS data &copy; Crown copyright and database rights ${YEAR}`;
  // Data attributions use the year the data was downloaded (data/SOURCES.md).
  const RIVERS_ATTRIBUTION = "Rivers: contains OS data &copy; Crown copyright and database rights 2026";
  const EA_ATTRIBUTION =
    'Catchments: &copy; Environment Agency copyright and/or database right 2026, ' +
    '<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">OGL v3.0</a>';
  const OS_GLYPHS = "https://api.os.uk/maps/vector/v1/vts/resources/fonts/{fontstack}/{range}.pbf";
  const LABEL_FONT = ["Source Sans Pro Semibold"];

  const COLOURS = {
    project: "#2f7d32",
    projectOnImagery: "#ffe14d",
    catchment: "#6a3d9a",
    catchmentOnImagery: "#ffffff",
    river: "#1f78c8",
    riverOnImagery: "#7fd3ff",
  };

  const visible = { project: true, catchments: true, rivers: true };
  let basemap = "os-light";
  let data = null;

  // --- OS requests: add the key (and srs) to every api.os.uk URL. ---------------------
  function transformRequest(url) {
    if (url.startsWith("https://api.os.uk/")) {
      const u = new URL(url);
      u.searchParams.set("key", cfg.osApiKey);
      if (u.pathname.includes("/vector/") && !u.searchParams.has("srs")) u.searchParams.set("srs", "3857");
      return { url: u.toString() };
    }
    return { url };
  }

  // --- Basemap styles -----------------------------------------------------------------
  async function osVectorStyle(name) {
    const res = await fetch(`${cfg.osStylesBase}/OS_VTS_3857_${name}.json`);
    if (!res.ok) throw new Error(`OS style ${name}: HTTP ${res.status}`);
    const style = await res.json();
    // Pin the sprite to the same commit as the style.
    style.sprite = style.sprite.replace(/\/main\//, cfg.osStylesBase.replace(/^.*\/([0-9a-f]{40})$/, "/$1/"));
    // Use the tile endpoint directly with the free zoom limit, so the map never asks
    // for a premium zoom level (which returns 403) and enlarges level 15 instead.
    const id = Object.keys(style.sources)[0];
    style.sources[id] = {
      type: "vector",
      tiles: ["https://api.os.uk/maps/vector/v1/vts/tile/{z}/{y}/{x}.pbf?srs=3857"],
      maxzoom: cfg.osVectorMaxZoom,
      attribution: OS_ATTRIBUTION,
    };
    return style;
  }

  function rasterStyle(tiles, maxzoom, attribution, tileSize) {
    return {
      version: 8,
      glyphs: OS_GLYPHS,
      sources: { base: { type: "raster", tiles: [tiles], tileSize: tileSize || 256, maxzoom, attribution } },
      layers: [{ id: "base", type: "raster", source: "base" }],
    };
  }

  const styleCache = {};
  async function getStyle(name) {
    if (styleCache[name]) return structuredClone(styleCache[name]);
    let style;
    if (name === "os-light") style = await osVectorStyle("Light");
    else if (name === "os-outdoor") style = await osVectorStyle("Outdoor");
    else if (name === "os-raster")
      style = rasterStyle(
        "https://api.os.uk/maps/raster/v1/zxy/Outdoor_3857/{z}/{x}/{y}.png",
        cfg.osRasterMaxZoom,
        OS_ATTRIBUTION
      );
    else style = rasterStyle(cfg.satellite.tiles, cfg.satellite.maxzoom, cfg.satellite.attribution);
    styleCache[name] = style;
    return structuredClone(style);
  }

  // --- Overlays -------------------------------------------------------------------------
  function addOverlays() {
    const onImagery = basemap === "satellite";
    const vis = (key) => (visible[key] ? "visible" : "none");

    map.addSource("catchments", { type: "geojson", data: data.catchments, attribution: EA_ATTRIBUTION });
    map.addSource("rivers", { type: "geojson", data: data.rivers, attribution: RIVERS_ATTRIBUTION });
    map.addSource("project", { type: "geojson", data: data.project });

    // Invisible fill so a click anywhere in a catchment opens its popup.
    map.addLayer({
      id: "catchments-hit", type: "fill", source: "catchments",
      layout: { visibility: vis("catchments") },
      paint: { "fill-color": "#000", "fill-opacity": 0 },
    });
    map.addLayer({
      id: "project-fill", type: "fill", source: "project",
      layout: { visibility: vis("project") },
      paint: {
        "fill-color": onImagery ? COLOURS.projectOnImagery : COLOURS.project,
        "fill-opacity": onImagery ? 0.18 : 0.28,
      },
    });
    map.addLayer({
      id: "rivers", type: "line", source: "rivers",
      layout: { visibility: vis("rivers"), "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": onImagery ? COLOURS.riverOnImagery : COLOURS.river,
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 13, 2, 16, 3.5],
      },
    });
    map.addLayer({
      id: "catchments-line", type: "line", source: "catchments",
      layout: { visibility: vis("catchments"), "line-join": "round" },
      paint: {
        "line-color": onImagery ? COLOURS.catchmentOnImagery : COLOURS.catchment,
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 3],
        "line-dasharray": [3, 2],
      },
    });
    map.addLayer({
      id: "project-line", type: "line", source: "project",
      layout: { visibility: vis("project"), "line-join": "round" },
      paint: {
        "line-color": onImagery ? COLOURS.projectOnImagery : COLOURS.project,
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 3],
      },
    });
    map.addLayer({
      id: "catchments-label", type: "symbol", source: "catchments",
      maxzoom: 13,
      layout: {
        visibility: vis("catchments"),
        "text-field": ["get", "name"],
        "text-font": LABEL_FONT,
        "text-size": 15,
        "text-letter-spacing": 0.08,
        "text-transform": "uppercase",
      },
      paint: {
        "text-color": onImagery ? "#ffffff" : COLOURS.catchment,
        "text-halo-color": onImagery ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)",
        "text-halo-width": 1.5,
      },
    });
  }

  const LAYERS = {
    project: ["project-fill", "project-line"],
    catchments: ["catchments-hit", "catchments-line", "catchments-label"],
    rivers: ["rivers"],
  };

  // --- Panel ----------------------------------------------------------------------------
  const fmt = (n, d = 0) => n.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });

  function fillPanel() {
    const p = data.project.features[0].properties;
    document.getElementById("total-ha").textContent = fmt(p.area_ha);
    document.getElementById("total-km2").textContent = `${fmt(p.area_ha / 100, 1)} km² · ${fmt(p.area_ha * 2.47105)} acres`;
    const rows = data.catchments.features
      .map((f) => [f.properties.name, p[`area_ha_${f.properties.name.toLowerCase()}`]])
      .sort((a, b) => b[1] - a[1])
      .map(([name, ha]) => `<tr><td>${name} catchment</td><td>${fmt(ha)} ha</td></tr>`);
    if (p.area_ha_outside > 0.5) rows.push(`<tr class="other"><td>Outside these catchments</td><td>${fmt(p.area_ha_outside)} ha</td></tr>`);
    document.getElementById("breakdown").innerHTML = rows.join("");
  }

  function wirePanel() {
    const panel = document.getElementById("panel");
    const toggle = document.getElementById("panel-toggle");
    const setCollapsed = (c) => {
      panel.classList.toggle("collapsed", c);
      toggle.setAttribute("aria-expanded", String(!c));
      toggle.firstElementChild.innerHTML = c ? "&#43;" : "&#8722;";
    };
    toggle.addEventListener("click", () => setCollapsed(!panel.classList.contains("collapsed")));
    if (window.matchMedia("(max-width: 600px)").matches) setCollapsed(true);

    document.querySelectorAll("input[data-layer]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.layer;
        visible[key] = input.checked;
        LAYERS[key].forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", input.checked ? "visible" : "none"));
      });
    });

    document.querySelectorAll('input[name="basemap"]').forEach((input) => {
      input.addEventListener("change", () => input.checked && setBasemap(input.value));
    });
  }

  const maxZoomFor = (name) => (name === "satellite" ? cfg.satellite.maxzoom : cfg.osMapMaxZoom);

  async function setBasemap(name) {
    basemap = name;
    map.setMaxZoom(maxZoomFor(name));
    document.body.classList.toggle("no-os-logo", name === "satellite");
    const style = await getStyle(name);
    map.setStyle(style, { diff: false });
    map.once("style.load", addOverlays);
  }

  // --- Popups ---------------------------------------------------------------------------
  function wirePopups() {
    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "260px" });
    map.on("click", (e) => {
      const ids = ["project-fill", "catchments-hit"].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
      const hits = map.queryRenderedFeatures(e.point, { layers: ids });
      if (!hits.length) return;
      const lines = [];
      const project = hits.find((h) => h.layer.id === "project-fill");
      const catchment = hits.find((h) => h.layer.id === "catchments-hit");
      if (catchment) lines.push(`<strong>${catchment.properties.name} catchment</strong>${fmt(catchment.properties.area_ha)} ha`);
      if (project) lines.push(`<strong>Inside the project area</strong>`);
      popup.setLngLat(e.lngLat).setHTML(lines.join("<br>")).addTo(map);
    });
    ["project-fill", "catchments-hit"].forEach((id) => {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    });
  }

  // --- Start ----------------------------------------------------------------------------
  let map;

  async function start() {
    const [catchments, rivers, project, style] = await Promise.all([
      fetch("data/catchments.geojson").then((r) => r.json()),
      fetch("data/rivers.geojson").then((r) => r.json()),
      fetch("data/project_area.geojson").then((r) => r.json()),
      getStyle(basemap),
    ]);
    data = { catchments, rivers, project };

    // Frame the three catchments.
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    const walk = (c) => (typeof c[0] === "number"
      ? ((minX = Math.min(minX, c[0])), (maxX = Math.max(maxX, c[0])), (minY = Math.min(minY, c[1])), (maxY = Math.max(maxY, c[1])))
      : c.forEach(walk));
    catchments.features.forEach((f) => walk(f.geometry.coordinates));
    const bounds = [[minX, minY], [maxX, maxY]];

    map = new maplibregl.Map({
      container: "map",
      style,
      bounds,
      fitBoundsOptions: { padding: { top: 40, bottom: 40, left: window.innerWidth > 600 ? 320 : 40, right: 40 } },
      maxZoom: maxZoomFor(basemap),
      minZoom: 8,
      transformRequest,
      attributionControl: false,
      // Embedded in a page (iframe): Ctrl+scroll to zoom and two fingers to pan, so the
      // page around the map still scrolls. Opened on its own: normal map gestures.
      cooperativeGestures: window.self !== window.top,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    window.elrMap = map; // for debugging from the browser console

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    // On phones, start with the attribution folded behind its (i) button.
    if (window.matchMedia("(max-width: 600px)").matches) {
      map.once("load", () => {
        const attrib = document.querySelector(".maplibregl-ctrl-attrib");
        if (attrib) attrib.classList.remove("maplibregl-compact-show");
      });
    }

    // OS logo (required on maps that show OS API data).
    const logo = document.createElement("div");
    logo.className = "os-api-branding logo";
    document.getElementById("map").appendChild(logo);

    map.once("style.load", addOverlays);
    fillPanel();
    wirePanel();
    wirePopups();
  }

  start().catch((err) => {
    console.error(err);
    document.getElementById("total-ha").textContent = "–";
    const p = document.createElement("p");
    p.className = "poc";
    p.textContent = "The map could not load. Please try again later.";
    document.getElementById("panel-body").prepend(p);
  });
})();
