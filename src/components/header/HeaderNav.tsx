"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import gsap from "gsap";
import styles from "./HeaderLogo.module.css";
import motion from "./HeaderNav.module.css";

const ITEMS = [
  { label: "project", href: "#projects-layer" },
  { label: "about", href: "#about" },
  { label: "contact", href: "#contact" },
];

export function HeaderNav() {
  const nav = useRef<HTMLElement>(null);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);
  const [compact, setCompact] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const scroller = document.querySelector("main");
    if (!scroller) return;

    const mobile = window.matchMedia("(max-width: 767px)");
    let previousScrollTop = scroller.scrollTop;
    let hasMeasured = false;
    let collapsed = false;

    const getSection = () => {
      const staticSec = document.documentElement.dataset.staticSection;
      if (staticSec === "about" || staticSec === "contact") return staticSec;
      return document.documentElement.dataset.projectsActive === "true" ? "project" : "hero";
    };

    const update = () => {
      const currentScrollTop = scroller.scrollTop;
      const section = getSection();
      const layerActive = section !== "hero"
        || Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001
        || Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001;
      const sectionScrollable = !layerActive && scroller.scrollHeight > scroller.clientHeight + 1;
      const threshold = mobile.matches ? 24 : 40;
      const delta = currentScrollTop - previousScrollTop;
      const movingDown = delta > 2;
      const movingUp = delta < -2;

      let next = collapsed;
      if (!sectionScrollable || currentScrollTop <= threshold) {
        next = false;
      } else if (!hasMeasured) {
        next = true;
      } else if (movingDown) {
        next = true;
      } else if (movingUp) {
        next = false;
      }

      previousScrollTop = currentScrollTop;
      hasMeasured = true;
      setActiveSection(section);

      if (next === collapsed) return;
      collapsed = next;
      setCompact(next);
      if (next && links.current.some((link) => link === document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
    };

    const initialFrame = requestAnimationFrame(update);
    scroller.addEventListener("scroll", update, { passive: true });
    const stateObserver = new MutationObserver(update);
    stateObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-projects-active", "data-projects-progress", "data-static-section", "data-static-progress"],
    });
    mobile.addEventListener("change", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scroller);
    const linkElements = links.current.slice();

    return () => {
      cancelAnimationFrame(initialFrame);
      scroller.removeEventListener("scroll", update);
      stateObserver.disconnect();
      resizeObserver.disconnect();
      mobile.removeEventListener("change", update);
      linkElements.forEach((link) => {
        if (link) gsap.killTweensOf(link);
      });
    };
  }, []);

  const move = (index: number, event: PointerEvent<HTMLAnchorElement>) => {
    const link = links.current[index];
    if (!link || event.pointerType === "touch") return;
    const bounds = link.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 6;
    gsap.to(link, {
      "--mag-x": `${x.toFixed(2)}px`,
      "--mag-y": `${y.toFixed(2)}px`,
      duration: 0.32,
      ease: "power3.out",
      overwrite: true,
    });
  };

  const reset = (index: number) => {
    const link = links.current[index];
    if (link) {
      gsap.to(link, {
        "--mag-x": "0px",
        "--mag-y": "0px",
        duration: 0.5,
        ease: "elastic.out(1, 0.5)",
        overwrite: true,
      });
    }
  };

  return (
    <nav
      ref={nav}
      className={`${styles.nav} ${motion.links}`}
      data-compact={compact}
      data-section={activeSection}
      inert={compact}
      aria-label="Main navigation"
    >
      {ITEMS.map((item, index) => (
        <span
          key={item.label}
          className={motion.navSlot}
          data-section={item.label}
          style={{ "--item-index": index } as CSSProperties}
        >
          <a
            ref={(element) => { links.current[index] = element; }}
            className={`${styles.navLink} ${motion.navLink}`}
            data-section={item.label}
            href={item.href}
            data-project-link={item.label === "project" ? "true" : undefined}
            onClick={(event) => {
              event.preventDefault();
              reset(index);
              window.dispatchEvent(new CustomEvent("portfolio:request-section", {
                detail: { section: item.label },
              }));
            }}
            onPointerMove={(event) => move(index, event)}
            onPointerLeave={() => reset(index)}
          >
            {Array.from(item.label, (character, characterIndex) => (
              <span
                className={styles.navChar}
                style={{ "--char-index": characterIndex } as CSSProperties}
                key={`${character}-${characterIndex}`}
              >
                <span className={styles.navCharRoll} data-char={character}>
                  {character}
                </span>
              </span>
            ))}
          </a>
        </span>
      ))}
    </nav>
  );
}
