# Geographic source

earth.json is generated from Natural Earth 1:50m Admin 0 Countries (public domain).
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
Terms: https://www.naturalearthdata.com/about/terms-of-use/

Regenerate with: node scripts/prepare-globe-data.mjs /path/to/ne_50m_admin_0_countries.geojson
Coordinates rounded to three decimals. Illustrative map, not navigation data.

`node scripts/prepare-earth-points.mjs` bakes `earth-points.v1.bin` from this file.
Each 12-byte record is one persistent particle ID (its index): six signed,
normalized little-endian int16s, for sphere XYZ, Indonesia XY, and grain
(positive = land). Map XY uses 118 E, 2.5 S as origin and 25 by 11 degrees
as half-extents. The runtime never sorts or regenerates this correspondence.
For a later chapter supply one new XY destination per record, in the same order,
to `setNextShape`; `next` in the draw pose blends from Indonesia to that shape.
Destinations use viewport half-extents, positive Y up, relative to the map centre.
