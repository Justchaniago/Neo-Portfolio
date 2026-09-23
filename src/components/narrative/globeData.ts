export type LandPolygon = { indonesia: boolean; rings: [number, number][][] };
export const SURABAYA = { lat: -7.2575, lon: 112.7521 };
export function createLandSampler(polygons: LandPolygon[]) {
  const atlas = document.createElement("canvas");
  atlas.width = 3600;
  atlas.height = 1800;
  const ctx = atlas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  for (const polygon of [...polygons].sort((a,b) => Number(a.indonesia)-Number(b.indonesia))) {
    ctx.beginPath();
    for (const ring of polygon.rings) {
      ring.forEach(([lon,lat], i) => {
        const x=(lon+180)*10, y=(90-lat)*10;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.closePath();
    }
    ctx.fillStyle=polygon.indonesia ? "#00ff00" : "#ff0000";
    ctx.fill("evenodd");
  }
  const pixels=ctx.getImageData(0,0,3600,1800).data;
  const mask=new Uint8Array(3600*1800);
  for(let i=0;i<mask.length;i++) mask[i]=pixels[i*4+3]>80 ? (pixels[i*4+1]>128 ? 2:1):0;
  atlas.width=atlas.height=1;
  return (lon:number,lat:number) => {
    if(lat < -90 || lat > 90) return 0;
    const x=Math.floor((((lon+180)%360+360)%360)*10);
    const y=Math.min(1799,Math.floor((90-lat)*10));
    return mask[y*3600+x];
  };
}
