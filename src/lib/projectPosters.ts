import { PROJECTS } from "./projects";

type Poster = { number: string; word: string; decision: string; paper: string; ink: string };
const light = { paper: "#ffffff", ink: "#050507" };
const dark = { paper: "#050507", ink: "#f4f4f1" };

export const projectPosters: Record<string, Poster> = {
  "gong-cha-vip": { ...light, number: "01", word: "29", decision: "Same pass. Fresh code at every visit." },
  "gong-cha-spin": { ...dark, number: "02", word: "Sip", decision: "One entry. One voucher the cashier can check." },
  "neo-avo": { ...light, number: "03", word: "Late", decision: "A missed run should leave a trace, too." },
  vimax: { ...dark, number: "04", word: "Shots", decision: "Review the storyboard before rendering the shots." },
  "gong-cha-workspace": { paper: "#1f45b4", ink: "#ffffff", number: "05", word: "Store", decision: "Keep member and staff screens separate. Share the service." },
};

const readingOrder = [...PROJECTS].sort((a, b) => Number(projectPosters[a.slug].number) - Number(projectPosters[b.slug].number));
export function studyNeighbors(slug: string) {
  const index = readingOrder.findIndex(p => p.slug === slug);
  return {
    prevProject: readingOrder[(index + readingOrder.length - 1) % readingOrder.length],
    nextProject: readingOrder[(index + 1) % readingOrder.length],
  };
}
