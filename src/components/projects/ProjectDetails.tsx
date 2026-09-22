"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./ProjectDetails.module.css";

const DETAILS = [
  { number: "01", title: "Project 01", category: "Digital Experience", year: "2026", description: "A placeholder space for the story, approach, and outcome of this project." },
  { number: "02", title: "Project 02", category: "Creative Direction", year: "2026", description: "A placeholder space for a focused visual system and a clear digital experience." },
  { number: "03", title: "Project 03", category: "Brand Platform", year: "2026", description: "A placeholder space for the project context, design language, and result." },
  { number: "04", title: "Project 04", category: "Interactive Product", year: "2026", description: "A placeholder space for a thoughtful product experience built around people." },
];

export function ProjectDetails({ activeIndex }: { activeIndex: number }) {
  const detail = DETAILS[activeIndex] ?? DETAILS[0];
  const root = useRef<HTMLElement>(null);
  const [railReady, setRailReady] = useState(false);

  useEffect(() => {
    const sync = () => setRailReady(document.documentElement.dataset.projectRailReady === "true");
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-project-rail-ready"] });
    sync();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = element.querySelectorAll<HTMLElement>("[data-detail-part]");
    if (!railReady) {
      const exit = gsap.to(element, {
        autoAlpha: 0,
        y: reduced ? 0 : 22,
        duration: reduced ? 0 : 0.42,
        ease: "power2.inOut",
        overwrite: true,
      });
      return () => { exit.kill(); };
    }
    gsap.set(element, { autoAlpha: 1, y: 0 });
    const animation = gsap.fromTo(parts,
      { autoAlpha: 0, y: reduced ? 0 : 28 },
      { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.54, delay: reduced ? 0 : 0.12, stagger: reduced ? 0 : 0.07, ease: "power3.out", clearProps: "transform" },
    );
    return () => { animation.kill(); };
  }, [activeIndex, railReady]);

  return (
    <article ref={root} className={`${styles.details} ${railReady ? styles.ready : ""}`} aria-live="polite">
      <span className={styles.grid} aria-hidden="true" />
      <span className={styles.number} data-detail-part>{detail.number}</span>
      <h2 className={styles.title} data-detail-part>{detail.title}</h2>
      <div className={styles.meta} data-detail-part><span>{detail.category}</span><span>{detail.year}</span></div>
      <p className={styles.description} data-detail-part>{detail.description}</p>
      <button type="button" className={styles.link} data-detail-part>View project <span aria-hidden="true">→</span></button>
    </article>
  );
}
