"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { PROJECTS, PROJECT_COUNT } from "@/lib/projects";
import { getPerformanceProfile } from "@/lib/performanceTier";
import { pageMotion } from "@/lib/pageMotion";
import { ProjectImprint } from "./ProjectImprint";
import styles from "./ProjectDetails.module.css";

export function ProjectDetails({
  activeIndex,
  direction = 1,
  onOpenProject,
}: {
  activeIndex: number;
  direction?: number;
  onOpenProject?: (index: number) => void;
}) {
  const detail = PROJECTS[activeIndex] ?? PROJECTS[0];
  const root = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const railReady = document.documentElement.dataset.projectRailReady === "true";
      const projectsActive = document.documentElement.dataset.projectsActive === "true";
      setVisible(railReady && projectsActive);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-project-rail-ready", "data-projects-active"],
    });
    sync();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    const titleEl = titleRef.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowTier = getPerformanceProfile().tier === "low";
    const parts = element.querySelectorAll<HTMLElement>("[data-detail-part]");

    if (!visible) {
      gsap.killTweensOf(parts);
      if (titleEl) gsap.killTweensOf(titleEl);
      const exit = gsap.to(element, {
        autoAlpha: 0,
        y: reduced ? 0 : 20,
        duration: reduced ? 0 : 0.3,
        ease: "power2.in",
        overwrite: true,
      });
      return () => {
        exit.kill();
      };
    }

    gsap.killTweensOf(element);
    gsap.set(element, { autoAlpha: 1, y: 0 });

    const sign = direction >= 0 ? 1 : -1;
    const animation = gsap.fromTo(
      parts,
      { autoAlpha: 0, y: reduced ? 0 : sign * pageMotion.lift },
      {
        autoAlpha: 1,
        y: 0,
        duration: reduced ? 0 : pageMotion.content,
        delay: reduced ? 0 : 0.03,
        stagger: reduced ? 0 : pageMotion.stagger,
        ease: pageMotion.ease,
        overwrite: true,
        clearProps: "transform",
      },
    );

    let titleTween: gsap.core.Tween | undefined;
    if (titleEl && !reduced && !lowTier) {
      titleTween = gsap.fromTo(
        titleEl,
        { fontVariationSettings: '"wdth" 68' },
        {
          fontVariationSettings: '"wdth" 100',
          duration: 0.62,
          ease: "expo.out",
          overwrite: "auto",
        },
      );
    } else if (titleEl) {
      titleEl.style.fontVariationSettings = '"wdth" 100';
    }

    return () => {
      animation.kill();
      titleTween?.kill();
    };
  }, [activeIndex, direction, visible]);

  return (
    <article
      ref={root}
      className={`${styles.details} ${visible ? styles.ready : ""}`}
      aria-live="polite"
    >
      <span className={styles.grid} aria-hidden="true" />
      <span className={styles.aura} aria-hidden="true" />

      <div className={styles.imprint} data-detail-part aria-hidden="true">
        <ProjectImprint kind={detail.visualKind} />
        <span>FIELD NOTES<br />FIG. {detail.number}</span>
      </div>
      <div className={styles.eyebrow} data-detail-part>
        <span className={styles.signalDot} aria-hidden="true" />
        <span>{detail.number} / {PROJECT_COUNT}</span>
        <span className={styles.sep} aria-hidden="true">·</span>
        <span>{detail.focus}</span>
      </div>

      <h2 ref={titleRef} className={styles.title} data-detail-part>
        {detail.title}
      </h2>

      <div className={styles.meta} data-detail-part>
        <span>{detail.category}</span>
        {detail.year && <>
          <span className={styles.sep} aria-hidden="true">/</span>
          <span>{detail.year}</span>
        </>}
      </div>

      <p className={styles.description} data-detail-part>
        {detail.summary}
      </p>

      <ul className={styles.stackRow} data-detail-part aria-label={detail.retail ? "Product journey" : "Technologies"}>
        {(detail.visualKind === "wheel" ? ["Flyer", "Prize wheel", "Counter"] :
          detail.visualKind === "pass" ? ["Member pass", "Live QR", "Cup ledger"] : detail.stack).map((item) => (
          <li key={item} className={styles.stackPill}>{item}</li>
        ))}
      </ul>

      <div className={styles.ctaWrap} data-detail-part>
        <Link
          href={`/projects/${detail.slug}`}
          className={styles.link}
          data-cursor="rail"
          data-cursor-label="OPEN ↗"
          onClick={(event) => {
            if (
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            if (onOpenProject) {
              event.preventDefault();
              onOpenProject(activeIndex);
            } else {
              window.history.replaceState(null, "", `/?section=project&project=${detail.slug}`);
            }
          }}
        >
          <span className={styles.linkText}>{detail.visualKind === "wheel" ? "Explore the campaign" : detail.visualKind === "pass" ? "Explore the pass" : "Explore case study"}</span>
          <span className={styles.linkBadge} aria-hidden="true">
            <span className={styles.linkArrow}>↗</span>
          </span>
        </Link>
      </div>
    </article>
  );
}
