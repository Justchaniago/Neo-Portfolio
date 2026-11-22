export const headerSections = [
  { index: "01", name: "project", label: "Project", transition: "INDEX / PROJECTS" },
  { index: "02", name: "about", label: "About", transition: "02 — ABOUT" },
  { index: "03", name: "contact", label: "Contact", transition: "03 — CONTACT" },
] as const;

export type HeaderSection = typeof headerSections[number];

export function sectionHref(name: HeaderSection["name"], pathname: string) {
  const params = new URLSearchParams({ section: name });
  if (name === "project" && pathname.startsWith("/projects/")) {
    params.set("project", pathname.split("/")[2]);
  }
  return `/?${params}`;
}

export function currentSection(pathname: string) {
  if (pathname.startsWith("/projects/")) return "project";
  const { staticSection, projectsActive } = document.documentElement.dataset;
  return staticSection || (projectsActive === "true" ? "project" : "hero");
}
