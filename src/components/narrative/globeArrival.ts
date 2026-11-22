// Both canvases share the physical scroll distance, not their independent easing clocks.
export const ARRIVAL_START = 0.75;
export const ARRIVAL_END = 0.96;
export const arrivalAt = (craft: number) => Math.max(0, Math.min(1, (craft - ARRIVAL_START) / (ARRIVAL_END - ARRIVAL_START)));
export const HEADS_LANDED = 0.17;
export const SKY_REVEALED = 0.27;
export const daylightAt = (flight: number) => ramp(flight, 0.79, 1);

const prepared = new WeakSet<HTMLElement>();
export const ARRIVAL_READY = "portfolio:arrival-ready";
export const availableFlight = (host: HTMLElement, wanted: number) =>
  prepared.has(host) ? wanted : Math.min(HEADS_LANDED, wanted);
export function setArrivalReady(host: HTMLElement, ready: boolean) {
  if (!ready) { prepared.delete(host); return; }
  if (prepared.has(host)) return;
  prepared.add(host);
  host.dispatchEvent(new Event(ARRIVAL_READY));
}

// Both layers sample the same eased pose at the browser's shared RAF timestamp.
// Neither owns an extra ticker, including when native touch scrolls in large steps.
const flights = new WeakMap<HTMLElement, { time: number; value: number }>();
export function sampleArrival(host: HTMLElement, wanted: number, time: number) {
  let state = flights.get(host);
  if (!state) {
    state = { time, value: wanted };
    flights.set(host, state);
  } else if (state.time !== time) {
    const dt = Math.min(40, Math.max(0, time - state.time));
    state.value += (wanted - state.value) * -Math.expm1(-dt / 58);
    if (Math.abs(wanted - state.value) < 0.00008) state.value = wanted;
    state.time = time;
  }
  return state.value;
}
export function ramp(t: number, a: number, b: number) {
  const v = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return v * v * (3 - 2 * v);
}
export const earthRadius = (w: number, h: number, t: number, rimType = false) =>
  // With rim type, leave room for the header above and the lettering around the globe.
  (rimType ? Math.min(w * .40, Math.max(h * .24, (h * .52 - 92) / 1.17)) : Math.min(w * .43, h * .33))
  * (0.54 + 0.46 * ramp(t, 0.04, 0.92));
