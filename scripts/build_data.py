"""Build the map's web data from the downloaded sources.

Reads data/source/ (not in git; see data/SOURCES.md for how to fetch it) and writes
data/catchments.geojson and data/rivers.geojson in WGS84 for the web map.

Areas are computed here, once, in British National Grid (EPSG:27700), from the
geometry itself, and written into the files so the page only displays them.
"""
from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "source"
OUT = ROOT / "data"
BNG, WGS84 = 27700, 4326

# EA water body catchments (Catchment Data Explorer, operational catchment 3181 "Evenlode"),
# grouped into the three ELR catchments. The two lake water bodies (Cornbury Park Lakes,
# Blenheim Lakes) are not used: they sit inside these river catchments.
CATCHMENTS = {
    "Dorn": ["GB106039037380"],
    "Glyme": ["GB106039030020", "GB106039030010", "GB106039029940"],
    "Evenlode": [
        "GB106039029880", "GB106039029910", "GB106039029950", "GB106039029960",
        "GB106039029970", "GB106039029980", "GB106039030000", "GB106039030030",
        "GB106039037390", "GB106039037400", "GB106039037410", "GB106039037420",
    ],
}

# Simplification tolerance in metres: invisible at the closest zoom the map allows,
# and it keeps the files small.
SIMPLIFY_M = 2.0
COORD_DECIMALS = 6  # ~0.1 m


def polygons_only(geom):
    """Drop the stray lines and points that make_valid/union can leave beside the polygons."""
    from shapely.geometry import MultiPolygon, Polygon

    if isinstance(geom, (Polygon, MultiPolygon)):
        return geom
    polys = []
    for part in geom.geoms:
        if isinstance(part, Polygon):
            polys.append(part)
        elif isinstance(part, MultiPolygon):
            polys.extend(part.geoms)
    return MultiPolygon(polys) if len(polys) > 1 else polys[0]


def write_geojson(gdf: gpd.GeoDataFrame, name: str) -> None:
    path = OUT / name
    gdf.to_crs(WGS84).to_file(path, driver="GeoJSON", COORDINATE_PRECISION=COORD_DECIMALS, RFC7946="YES")
    print(f"{name}: {len(gdf)} features, {path.stat().st_size / 1024:.0f} KB")


def build_catchments() -> gpd.GeoDataFrame:
    rows = []
    for name, ids in CATCHMENTS.items():
        parts = [gpd.read_file(SRC / "ea_waterbodies" / f"{wb}.geojson") for wb in ids]
        g = pd.concat(parts).set_crs(WGS84, allow_override=True).to_crs(BNG)
        geom = polygons_only(g.geometry.make_valid().union_all())
        rows.append({"name": name, "waterbodies": len(ids), "geometry": geom})
    gdf = gpd.GeoDataFrame(rows, crs=BNG)
    gdf["geometry"] = gdf.geometry.simplify(SIMPLIFY_M, preserve_topology=True)
    gdf["area_ha"] = (gdf.area / 1e4).round(1)

    # Check: the three groups should tile the EA operational catchment (lakes aside).
    oc = gpd.read_file(SRC / "ea_waterbodies" / "operational_catchment_3181.geojson").to_crs(BNG)
    oc_ha = oc.union_all().area / 1e4
    overlap_ha = sum(
        gdf.geometry[i].intersection(gdf.geometry[j]).area
        for i in range(len(gdf)) for j in range(i + 1, len(gdf))
    ) / 1e4
    print(f"catchments total {gdf.area_ha.sum():.1f} ha vs operational catchment {oc_ha:.1f} ha; "
          f"overlap between groups {overlap_ha:.2f} ha")
    return gdf


def build_rivers(catchments: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    gpkg = SRC / "os_open_rivers" / "Data" / "oprvrs_gb.gpkg"
    area = catchments.union_all()
    rivers = gpd.read_file(gpkg, layer="watercourse_link", bbox=tuple(area.bounds))
    rivers = rivers.to_crs(BNG)
    rivers = gpd.clip(rivers, area)
    rivers = rivers[~rivers.geometry.is_empty]
    keep = {"watercourse_name": "name", "form": "form"}
    rivers = rivers[list(keep) + ["geometry"]].rename(columns=keep)
    rivers["geometry"] = rivers.geometry.simplify(SIMPLIFY_M)
    print(f"rivers: {rivers.length.sum() / 1000:.1f} km")
    return rivers


def build_project_area(catchments: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Dissolve the project geometries into one outline and measure it.

    The area of the dissolved outline (not the sum of the parts, so overlaps are not
    counted twice) and its split by catchment are written onto the single feature.
    """
    g = gpd.read_file(SRC / "project_area" / "project_area.gpkg").to_crs(BNG)
    outline = polygons_only(g.geometry.make_valid().union_all())
    outline = gpd.GeoSeries([outline], crs=BNG).simplify(SIMPLIFY_M, preserve_topology=True)[0]

    props = {"name": "ELR project area", "area_ha": round(outline.area / 1e4, 1)}
    inside = 0.0
    for _, c in catchments.iterrows():
        ha = round(c.geometry.intersection(outline).area / 1e4, 1)
        props[f"area_ha_{c['name'].lower()}"] = ha
        inside += ha
    props["area_ha_outside"] = round(props["area_ha"] - inside, 1)
    print("project area:", props)
    return gpd.GeoDataFrame([{**props, "geometry": outline}], crs=BNG)


def main() -> None:
    catchments = build_catchments()
    write_geojson(catchments, "catchments.geojson")
    write_geojson(build_rivers(catchments), "rivers.geojson")
    write_geojson(build_project_area(catchments), "project_area.geojson")


if __name__ == "__main__":
    main()
