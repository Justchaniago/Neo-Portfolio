// Asset preparation: Natural Earth 1:50m, public domain.
// Input: downloaded ne_50m_admin_0_countries.geojson.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const source = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const polygons = source.features.flatMap(({ geometry, properties }) => {
  const shapes = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return shapes.map(rings => ({
    indonesia: properties.ADM0_A3 === 'IDN',
    rings: rings.map(ring => ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))])),
  }));
});
mkdirSync('public/maps', { recursive: true });
writeFileSync('public/maps/earth.json', JSON.stringify(polygons));
