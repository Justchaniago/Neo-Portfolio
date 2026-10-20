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
  const surfacePaths = useRef<Record<StaticSection, SVGPathElement | null>>({ about: null, contact: null });
  const layers = useRef<Record<StaticSection, HTMLElement | null>>({ about: null, contact: null });
  const ratios = useRef<Record<StaticSection, number>>({ about: 0, contact: 0 });
  const activeSection = useRef<StaticSection | null>(null);
  const [active, setActive] = useState<StaticSection | null>(null);
  const [readySection, setReadySection] = useState<StaticSection | null>(null);

  const getLayer = useCallback((section: StaticSection) => layers.current[section], []);

  const syncGlobalProgress = useCallback(() => {
    const maxProgress = Math.max(ratios.current.about, ratios.current.contact);
    document.documentElement.dataset.staticProgress = maxProgress.toFixed(4);
    document.documentElement.dataset.staticSection = activeSection.current ?? "";
  }, []);

  const apply = useCallback((section: StaticSection, value: number) => {
    const next = gsap.utils.clamp(0, 1, value);
    const layer = getLayer(section);
    if (!layer) return;

    ratios.current[section] = next;
    syncGlobalProgress();
    setStackSurfaceProgress(surfacePaths.current[section], next);
    layer.style.setProperty("--sheet-shadow-alpha", (0.08 + (1 - next) * 0.24).toFixed(3));
    gsap.set(layer, { autoAlpha: next > 0 ? 1 : 0, yPercent: (1 - next) * 100 });
  }, [getLayer, syncGlobalProgress]);

  const finishClose = useCallback((section: StaticSection) => {
    const layer = getLayer(section);
    if (layer) gsap.set(layer, { clearProps: "scale,filter,zIndex" });
    apply(section, 0);
    if (activeSection.current === section) {
      activeSection.current = null;
    }
    const anyStillOpen = sections.some((s) => ratios.current[s] > 0.001 || activeSection.current === s);
    if (!anyStillOpen) {
      activeSection.current = null;
      setActive(null);
      setReadySection(null);
      setStaticScrollLock(false);
      document.documentElement.dataset.staticSection = "";
      document.documentElement.dataset.staticProgress = "0.0000";
    }
    window.dispatchEvent(new CustomEvent("portfolio:static-closed"));
  }, [apply, getLayer]);

  const closeSection = useCallback((section: StaticSection, silent = false, handoff = false) => {
    const layer = getLayer(section);
    if (readySection === section) setReadySection(null);
    if (!silent && activeSection.current === section) {
      activeSection.current = null;
      document.documentElement.dataset.staticSection = "";
    }
    if (handoff && layer) {
      layer.style.zIndex = "52";
      gsap.to(layer, {
        scale: 0.96,
        filter: "brightness(0.65)",
        duration: 0.85,
        ease: "expo.out",
        overwrite: "auto",
      });
    }
    if (!layer || ratios.current[section] <= 0.001) {
      if (layer) gsap.set(layer, { clearProps: "scale,filter,zIndex" });
      apply(section, 0);
      finishClose(section);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratios.current, {
      [section]: 0,
      duration: reduced ? 0 : 0.96,
      ease: "expo.out",
      overwrite: "auto",
      onUpdate: () => apply(section, ratios.current[section]),
      onComplete: () => {
        if (layer) gsap.set(layer, { clearProps: "scale,filter,zIndex" });
        finishClose(section);
      },
    });
  }, [apply, finishClose, getLayer, readySection]);

  const openSection = useCallback((section: StaticSection) => {
    const current = activeSection.current;
    if (current === section && ratios.current[section] > 0.5) {
      closeSection(section);
      return;
    }

    const layer = getLayer(section);
    if (!layer) return;

    // Bring incoming sheet above other sheets
    sections.forEach((s) => {
      const el = getLayer(s);
      if (el) el.style.zIndex = s === section ? "53" : "52";
    });

    // If another static page is open, slide it down simultaneously while the new sheet rises over it!
    if (current && current !== section) {
      closeSection(current, true, true);
    }

    gsap.killTweensOf(layer, "scale,filter");
    gsap.set(layer, { clearProps: "scale,filter" });
    layer.style.zIndex = "53";
    activeSection.current = section;
    document.documentElement.dataset.staticSection = section;
    setActive(section);
    setReadySection(section);
    setStaticScrollLock(true);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratios.current, {
      [section]: 1,
      duration: reduced ? 0 : 1.08,
      ease: "expo.out",
      overwrite: "auto",
      onUpdate: () => apply(section, ratios.current[section]),
      onComplete: () => apply(section, 1),
    });
  }, [apply, closeSection, getLayer]);

  useEffect(() => {
    const requestSection = (event: Event) => {
      const section = (event as CustomEvent<{ section?: SectionRequest }>).detail?.section;
      if (section === "about" || section === "contact") {
        // Simultaneous single-step handoff from Projects -> About/Contact!
        if (Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001) {
          window.dispatchEvent(new CustomEvent("portfolio:close-projects", {
            detail: { mode: "slide-down", handoff: true },
          }));
        }
        openSection(section);
      }
    };
    const close = (event?: Event) => {
      const handoff = (event as CustomEvent<{ handoff?: boolean }> | undefined)?.detail?.handoff ?? false;
      let closingAny = false;
      sections.forEach((s) => {
        if (ratios.current[s] > 0.001 || activeSection.current === s) {
          closingAny = true;
          closeSection(s, false, handoff);
        }
      });
      if (!closingAny) {
        setStaticScrollLock(false);
        activeSection.current = null;
        setActive(null);
        setReadySection(null);
        document.documentElement.dataset.staticSection = "";
        document.documentElement.dataset.staticProgress = "0.0000";
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("portfolio:request-section", requestSection);
    window.addEventListener("portfolio:close-static-pages", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("portfolio:request-section", requestSection);
      window.removeEventListener("portfolio:close-static-pages", close);
      document.removeEventListener("keydown", onKeyDown);
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
      <PageContent
        section="about"
        ready={readySection === "about"}
        onClose={() => closeSection("about")}
      />
    </StackSection>
    <StackSection
      sectionRef={(element) => {
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
      <PageContent
        section="contact"
        ready={readySection === "contact"}
        onClose={() => closeSection("contact")}
      />
    </StackSection>
  </>;
}

function PageContent({
  section,
  ready,
  onClose,
}: {
  section: StaticSection;
  ready: boolean;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = element.querySelectorAll<HTMLElement>("[data-page-part]");
    if (!ready) {
      const exit = gsap.to(parts, {
        autoAlpha: 0,
        y: reduced ? 0 : 24,
        duration: reduced ? 0 : 0.34,
        ease: "power2.in",
        overwrite: true,
      });
      return () => { exit.kill(); };
    }
    const entrance = gsap.fromTo(
      parts,
      { autoAlpha: 0, y: reduced ? 0 : 30, rotate: reduced ? 0 : 0.8 },
      {
        autoAlpha: 1,
        y: 0,
        rotate: 0,
        duration: reduced ? 0 : 0.65,
        delay: reduced ? 0 : 0.22,
        stagger: reduced ? 0 : 0.07,
        ease: "power3.out",
        overwrite: true,
        clearProps: "transform",
      },
    );
    return () => { entrance.kill(); };
  }, [ready]);

  return (
    <div ref={root} className={`${styles.page} ${ready ? styles.ready : ""}`}>
      <span className={styles.grid} aria-hidden="true" />
      <p className={styles.eyebrow} data-page-part>
        0{sections.indexOf(section) + 2} / {section}
      </p>
      <h1 data-page-part>{section}</h1>
      <p className={styles.placeholder} data-page-part>
        {section === "about"
          ? "A closer look at the engineering craft, systems thinking, and creative direction behind the work."
          : "Let’s build something extraordinary together — available for select collaborations and roles."}
      </p>
      <div className={styles.actions} data-page-part>
        <button type="button" className={styles.returnButton} onClick={onClose}>
          <span className={styles.returnArrow} aria-hidden="true">←</span>
          <span>Return to home</span>
        </button>
      </div>
    </div>
  );
}
