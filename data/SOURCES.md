# Data sources

Downloaded 2026-11-20. The raw downloads are kept in `data/source/`, which is not
committed. `scripts/build_data.py` turns them into the committed files in `data/`.

| File | Source | Licence | Attribution the map must show |
|---|---|---|---|
| `catchments.geojson` | Environment Agency, Catchment Data Explorer: river water body catchments in operational catchment 3181 *Evenlode* | Open Government Licence v3.0 | © Environment Agency copyright and/or database right 2026. Licensed under the Open Government Licence v3.0. |
| `rivers.geojson` | Ordnance Survey, OS Open Rivers (GB GeoPackage, md5 `dd777b3f966fb814ae2352d9c2076cd4`) | OS OpenData, i.e. Open Government Licence v3.0 | Contains OS data © Crown Copyright and database rights 2026. |

## Fetching the sources again

EA water body catchments, one GeoJSON per water body, saved to `data/source/ea_waterbodies/`:

    https://environment.data.gov.uk/catchment-planning/WaterBody/<id>.geojson
    https://environment.data.gov.uk/catchment-planning/OperationalCatchment/3181.geojson

`CATCHMENTS` in `scripts/build_data.py` lists the water body ids for each catchment.

OS Open Rivers, unzipped to `data/source/os_open_rivers/`:

    https://api.os.uk/downloads/v1/products/OpenRivers/downloads?area=GB&format=GeoPackage&redirect

## The three catchments

The ELR catchments are made from EA river water body catchments. The two lake water
bodies (Cornbury Park Lakes, Blenheim Lakes) are left out, because they sit inside
these river catchments.

| Catchment | Water bodies | Area (ha) |
|---|---|---|
| Evenlode | 12: every river water body of operational catchment 3181 not listed below | 31,311.8 |
| Glyme | Glyme (Source to Enstone), Glyme (Enstone to Dorn), Glyme (Dorn confluence to Evenlode) | 6,961.6 |
| Dorn | Dorn (Source to Glyme) | 4,615.3 |

Together they cover operational catchment 3181 exactly (42,888.7 ha), with no overlap.
Areas are measured in British National Grid (EPSG:27700) after a 2 m simplification.
