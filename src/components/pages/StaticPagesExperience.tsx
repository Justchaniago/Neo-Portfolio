"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { setStackSurfaceProgress, StackSection } from "@/components/layout/StackSection";
import styles from "./StaticPagesExperience.module.css";

type StaticSection = "about" | "contact";
type SectionRequest = "project" | StaticSection;

const sections: StaticSection[] = ["about", "contact"];

const setStaticScrollLock = (locked: boolean) => {
  window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", {
    detail: { source: "static-section", locked },
  }));
};

export function StaticPagesExperience() {
  const aboutLayer = useRef<HTMLElement>(null);
  const contactLayer = useRef<HTMLElement>(null);
  const surfacePaths = useRef<Record<StaticSection, SVGPathElement | null>>({ about: null, contact: null });
  const layers = useRef<Record<StaticSection, HTMLElement | null>>({ about: null, contact: null });
  const ratios = useRef<Record<StaticSection, number>>({ about: 0, contact: 0 });
  const activeSection = useRef<StaticSection | null>(null);
  const pendingSection = useRef<StaticSection | null>(null);
  const [active, setActive] = useState<StaticSection | null>(null);

  const getLayer = useCallback((section: StaticSection) => layers.current[section], []);

  const apply = useCallback((section: StaticSection, value: number) => {
    const next = gsap.utils.clamp(0, 1, value);
    const layer = getLayer(section);
    if (!layer) return;

    ratios.current[section] = next;
    document.documentElement.dataset.staticProgress = next.toFixed(4);
    document.documentElement.dataset.staticSection = next >= 0.985 ? section : "";
    setStackSurfaceProgress(surfacePaths.current[section], next);
    layer.style.setProperty("--sheet-shadow-alpha", (0.04 + (1 - next) * 0.14).toFixed(3));
    gsap.set(layer, { autoAlpha: next > 0 ? 1 : 0, yPercent: (1 - next) * 100 });
  }, [getLayer]);

  const finishClose = useCallback((section: StaticSection) => {
    apply(section, 0);
    activeSection.current = null;
    setActive(null);
    setStaticScrollLock(false);
    window.dispatchEvent(new CustomEvent("portfolio:static-closed"));
  }, [apply]);

  const closeSection = useCallback((section: StaticSection) => {
    const layer = getLayer(section);
    if (!layer || ratios.current[section] <= 0.001) {
      finishClose(section);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratios.current, {
      [section]: 0,
      duration: reduced ? 0 : 1.15,
      ease: "power3.out",
      overwrite: true,
      onUpdate: () => apply(section, ratios.current[section]),
      onComplete: () => finishClose(section),
    });
  }, [apply, finishClose, getLayer]);

  const openSection = useCallback((section: StaticSection) => {
    const current = activeSection.current;
    if (current && current !== section) {
      pendingSection.current = section;
      closeSection(current);
      return;
    }

    const layer = getLayer(section);
    if (!layer) return;
    activeSection.current = section;
    setActive(section);
    setStaticScrollLock(true);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratios.current, {
      [section]: 1,
      duration: reduced ? 0 : 1.15,
      ease: "power3.out",
      overwrite: true,
      onUpdate: () => apply(section, ratios.current[section]),
      onComplete: () => apply(section, 1),
    });
  }, [apply, closeSection, getLayer]);

  useEffect(() => {
    const requestSection = (event: Event) => {
      const section = (event as CustomEvent<{ section?: SectionRequest }>).detail?.section;
      if (section === "about" || section === "contact") {
        if (Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001) {
          pendingSection.current = section;
          window.dispatchEvent(new CustomEvent("portfolio:close-projects"));
        } else {
          openSection(section);
        }
      }
    };
    const projectClosed = () => {
      const next = pendingSection.current;
      pendingSection.current = null;
      if (next) openSection(next);
    };
    const staticClosed = () => {
      const next = pendingSection.current;
      pendingSection.current = null;
      if (next) openSection(next);
    };
    const close = () => {
      pendingSection.current = null;
      if (activeSection.current) closeSection(activeSection.current);
    };

    window.addEventListener("portfolio:request-section", requestSection);
    window.addEventListener("portfolio:project-closed", projectClosed);
    window.addEventListener("portfolio:static-closed", staticClosed);
    window.addEventListener("portfolio:close-static-pages", close);
    return () => {
      window.removeEventListener("portfolio:request-section", requestSection);
      window.removeEventListener("portfolio:project-closed", projectClosed);
      window.removeEventListener("portfolio:static-closed", staticClosed);
      window.removeEventListener("portfolio:close-static-pages", close);
    };
  }, [closeSection, openSection]);

  useEffect(() => () => {
    setStaticScrollLock(false);
    delete document.documentElement.dataset.staticProgress;
    delete document.documentElement.dataset.staticSection;
  }, []);

  return <>
    <StackSection
      sectionRef={(element) => {
        aboutLayer.current = element;
        layers.current.about = element;
      }}
      surfacePathRef={(element) => { surfacePaths.current.about = element; }}
      id="about"
      className={styles.layer}
      contentClassName={styles.content}
      inert={active !== "about"}
      aria-hidden={active !== "about"}
      aria-label="About"
    >
      <PageContent section="about" />
    </StackSection>
    <StackSection
      sectionRef={(element) => {
        contactLayer.current = element;
        layers.current.contact = element;
      }}
      surfacePathRef={(element) => { surfacePaths.current.contact = element; }}
      id="contact"
      className={styles.layer}
      contentClassName={styles.content}
      inert={active !== "contact"}
      aria-hidden={active !== "contact"}
      aria-label="Contact"
    >
      <PageContent section="contact" />
    </StackSection>
  </>;
}

function PageContent({ section }: { section: StaticSection }) {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>0{sections.indexOf(section) + 2}</p>
      <h1>{section}</h1>
      <p className={styles.placeholder}>
        {section === "about" ? "A closer look at the person behind the work." : "Let&apos;s make something meaningful together."}
      </p>
    </div>
  );
}
