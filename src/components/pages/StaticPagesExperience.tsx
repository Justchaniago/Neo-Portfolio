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

  const parkSection = useCallback((section: StaticSection) => {
    const layer = getLayer(section);
    gsap.killTweensOf(ratios.current, section);
    if (layer) {
      gsap.killTweensOf(layer);
      gsap.set(layer, { clearProps: "scale,filter,zIndex,y" });
    }
    apply(section, 0);
  }, [apply, getLayer]);

  const recedeSection = useCallback((section: StaticSection) => {
    const layer = getLayer(section);
    if (readySection === section) setReadySection(null);
    if (!layer || ratios.current[section] <= 0.001) {
      parkSection(section);
      return;
    }
    gsap.killTweensOf(ratios.current, section);
    gsap.killTweensOf(layer, "scale,filter,y");
    layer.style.zIndex = "52";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(layer, {
      scale: reduced ? 1 : 0.965,
      y: reduced ? 0 : -14,
      filter: reduced ? "none" : "brightness(0.55)",
      duration: reduced ? 0 : 0.92,
      ease: "expo.out",
      overwrite: "auto",
    });
  }, [getLayer, parkSection, readySection]);

  const finishClose = useCallback((section: StaticSection) => {
    parkSection(section);
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
  }, [parkSection]);

  const closeSection = useCallback((section: StaticSection, silent = false, handoff = false) => {
    const layer = getLayer(section);
    if (readySection === section) setReadySection(null);
    if (!silent && activeSection.current === section) {
      activeSection.current = null;
      document.documentElement.dataset.staticSection = "";
    }
    if (handoff) {
      recedeSection(section);
      return;
    }
    // Ensure any recessed underneath sibling card is parked immediately before sliding down to Home
    sections.forEach((s) => {
      if (s !== section && ratios.current[s] > 0.001) {
        parkSection(s);
      }
    });
    if (Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001) {
      window.dispatchEvent(new CustomEvent("portfolio:close-projects", {
        detail: { mode: "slide-down", handoff: false },
      }));
    }
    if (!layer || ratios.current[section] <= 0.001) {
      finishClose(section);
      return;
    }

    gsap.killTweensOf(layer, "scale,filter,y");
    gsap.set(layer, { clearProps: "scale,filter,y" });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratios.current, {
      [section]: 0,
      duration: reduced ? 0 : 0.92,
      ease: "expo.out",
      overwrite: "auto",
      onUpdate: () => apply(section, ratios.current[section]),
      onComplete: () => {
        finishClose(section);
      },
    });
  }, [apply, finishClose, getLayer, parkSection, readySection, recedeSection]);

  const openSection = useCallback((section: StaticSection) => {
    const current = activeSection.current;
    if (current === section && ratios.current[section] > 0.5) {
      // User clicked the already-active section link -> close it back to Home
      sections.forEach((s) => {
        if (s !== section && ratios.current[s] > 0.001) parkSection(s);
      });
      closeSection(section);
      return;
    }

    const layer = getLayer(section);
    if (!layer) return;

    const otherSection: StaticSection = section === "about" ? "contact" : "about";
    const projectsVisible = Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001;
    const otherVisible = ratios.current[otherSection] > 0.001;

    // Normalize 3-slot z-index ring: 51 (deepest) / 52 (receding card) / 53 (incoming top card)
    const otherEl = getLayer(otherSection);
    if (otherEl) {
      otherEl.style.zIndex = current === otherSection ? "52" : "51";
    }

    // If another static page is currently open, recede it in place (do NOT slide it down!)
    if (otherVisible) {
      recedeSection(otherSection);
    }

    gsap.killTweensOf(ratios.current, section);
    gsap.killTweensOf(layer, "scale,filter,y");
    gsap.set(layer, { clearProps: "scale,filter,y" });
    layer.style.zIndex = "53";

    // If `section` was sitting underneath as a recessed card (`ratio >= 0.98`) while another card was on top,
    // reset its starting ratio to 0 so it slides up cleanly from the bottom over the previous card!
    if ((projectsVisible || otherVisible) && current !== section && ratios.current[section] >= 0.98) {
      ratios.current[section] = 0;
      apply(section, 0);
    }

    activeSection.current = section;
    document.documentElement.dataset.staticSection = section;
    setActive(section);
    setReadySection(section);
    setStaticScrollLock(true);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratios.current, {
      [section]: 1,
      duration: reduced ? 0 : 1.04,
      ease: "expo.out",
      overwrite: "auto",
      onUpdate: () => apply(section, ratios.current[section]),
      onComplete: () => {
        apply(section, 1);
        // Atomic cleanup: once this top card covers 100% of the screen, park all underneath cards!
        sections.forEach((s) => {
          if (s !== section) parkSection(s);
        });
        window.dispatchEvent(new CustomEvent("portfolio:stack-top-settled", {
          detail: { top: section },
        }));
      },
    });
  }, [apply, closeSection, getLayer, parkSection, recedeSection]);

  useEffect(() => {
    const requestSection = (event: Event) => {
      const section = (event as CustomEvent<{ section?: SectionRequest }>).detail?.section;
      if (section === "about" || section === "contact") {
        // Card-stack over-slide from Projects -> About/Contact: recede Projects in place!
        if (
          document.documentElement.dataset.projectsActive === "true"
          || Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001
        ) {
          window.dispatchEvent(new CustomEvent("portfolio:close-projects", {
            detail: { mode: "slide-down", handoff: true },
          }));
        }
        openSection(section);
      }
    };
    const close = (event?: Event) => {
      const handoff = (event as CustomEvent<{ handoff?: boolean }> | undefined)?.detail?.handoff ?? false;
      if (handoff) {
        const current = activeSection.current;
        activeSection.current = null;
        document.documentElement.dataset.staticSection = "";
        setReadySection(null);
        sections.forEach((s) => {
          if (s === current || (current === null && ratios.current[s] > 0.001)) {
            recedeSection(s);
          } else if (ratios.current[s] > 0.001) {
            parkSection(s);
          }
        });
        return;
      }

      const current = activeSection.current;
      let closingAny = false;
      sections.forEach((s) => {
        if (ratios.current[s] > 0.001 || current === s) {
          if (current && s !== current) {
            // Immediately park recessed background cards so only the top active card slides down to Home
            parkSection(s);
          } else {
            closingAny = true;
            closeSection(s, false, false);
          }
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
    const onStackTopSettled = (event: Event) => {
      const top = (event as CustomEvent<{ top?: string }>).detail?.top;
      if (top === "project") {
        sections.forEach((s) => parkSection(s));
        activeSection.current = null;
        setActive(null);
        setReadySection(null);
        setStaticScrollLock(false);
        document.documentElement.dataset.staticSection = "";
        document.documentElement.dataset.staticProgress = "0.0000";
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (activeSection.current || sections.some((s) => ratios.current[s] > 0.001))) {
        close();
      }
    };

    window.addEventListener("portfolio:request-section", requestSection);
    window.addEventListener("portfolio:close-static-pages", close);
    window.addEventListener("portfolio:stack-top-settled", onStackTopSettled);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("portfolio:request-section", requestSection);
      window.removeEventListener("portfolio:close-static-pages", close);
      window.removeEventListener("portfolio:stack-top-settled", onStackTopSettled);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeSection, openSection, parkSection, recedeSection]);

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

  const hasInitialized = useRef(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = element.querySelectorAll<HTMLElement>("[data-page-part]");
    if (!ready) {
      if (!hasInitialized.current) {
        gsap.set(parts, { autoAlpha: 0, y: reduced ? 0 : 30 });
        return;
      }
      // Keep typography visible on the receding card while the incoming card slides up over it
      const soften = gsap.to(parts, {
        autoAlpha: 0.72,
        y: reduced ? 0 : -6,
        duration: reduced ? 0 : 0.48,
        ease: "power2.out",
        overwrite: true,
      });
      return () => { soften.kill(); };
    }
    hasInitialized.current = true;
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
