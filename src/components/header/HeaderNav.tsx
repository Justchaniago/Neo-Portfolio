"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, PointerEvent } from "react";
import gsap from "gsap";
import styles from "./HeaderLogo.module.css";
import motion from "./HeaderNav.module.css";

const ITEMS = [
  { label: "project", href: "#projects-layer" },
  { label: "about", href: "#about" },
  { label: "contact", href: "#contact" },
];
const subscribeToMount = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const WAVE_CLOSED = "M 102 0 C 102 18 102 34 102 50 C 102 67 102 84 102 100 L 102 100 L 102 0 Z";
const WAVE_OVERSHOOT = "M -4 0 C 8 18 -8 34 1 50 C 10 67 -7 84 -4 100 L 102 100 L 102 0 Z";
const WAVE_OPEN = "M 0 0 C 0 18 0 34 0 50 C 0 67 0 84 0 100 L 102 100 L 102 0 Z";
const setNavigationScrollLock = (locked: boolean) => {
  window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", {
    detail: { source: "navigation-overlay", locked },
  }));
};

export function HeaderNav() {
  const nav = useRef<HTMLElement>(null);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);
  const button = useRef<HTMLButtonElement>(null);
  const magnetic = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const wavePath = useRef<SVGPathElement>(null);
  const overlayInitialized = useRef(false);
  const mounted = useSyncExternalStore(subscribeToMount, clientSnapshot, serverSnapshot);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const scroller = document.querySelector("main");
    if (!scroller) return;
    let collapsed = false;
    const mobile = window.matchMedia("(max-width: 767px)");
    const getSection = () => document.documentElement.dataset.projectsActive === "true" ? "project" : "hero";
    const update = () => {
      const section = getSection();
      const overlayActive = section !== "hero" || Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001;
      const desktop = !mobile.matches;
      // The desktop links belong to the document flow visually: the fixed shell
      // remains for the logo, while the nav travels upward with the page.
      if (nav.current) nav.current.style.transform = desktop && !overlayActive ? `translate3d(0, -${scroller.scrollTop}px, 0)` : "";
      const sectionScrollable = !overlayActive && scroller.scrollHeight > scroller.clientHeight + 1;
      const next = sectionScrollable && (mobile.matches ? scroller.scrollTop > 24 : scroller.scrollTop > 40);
      setActiveSection(section);
      if (next === collapsed) return;
      collapsed = next;
      setCompact(next);
      setOpen(false);
      if (next && links.current.some((link) => link === document.activeElement)) button.current?.focus({ preventScroll: true });
      if (!next && (button.current === document.activeElement || panel.current?.contains(document.activeElement))) links.current[0]?.focus({ preventScroll: true });
    };
    const initialFrame = requestAnimationFrame(update);
    scroller.addEventListener("scroll", update, { passive: true });
    const stateObserver = new MutationObserver(update);
    stateObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-projects-active", "data-projects-progress"] });
    mobile.addEventListener("change", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scroller);
    const elements = links.current.slice();
    return () => {
      cancelAnimationFrame(initialFrame);
      scroller.removeEventListener("scroll", update);
      stateObserver.disconnect();
      resizeObserver.disconnect();
      mobile.removeEventListener("change", update);
      elements.forEach((element) => { if (element) gsap.killTweensOf(element); });
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  useEffect(() => {
    const root = overlay.current;
    const path = wavePath.current;
    const menu = panel.current;
    if (!mounted || !root || !path || !menu) return;

    const items = Array.from(menu.querySelectorAll<HTMLElement>("[data-overlay-item]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.killTweensOf([path, menu, ...items]);

    if (!overlayInitialized.current) {
      overlayInitialized.current = true;
      gsap.set(path, { attr: { d: WAVE_CLOSED } });
      gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(menu, { autoAlpha: 0 });
      gsap.set(items, { autoAlpha: 0, x: 80, y: 18 });
      if (!open) return;
    }

    if (open) {
      setNavigationScrollLock(true);
      document.documentElement.dataset.navigationOpen = "true";
      gsap.set(root, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(menu, { autoAlpha: 1 });

      if (reduced) {
        gsap.set(path, { attr: { d: WAVE_OPEN } });
        gsap.set(items, { autoAlpha: 1, x: 0, y: 0 });
        items[0]?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
        return;
      }

      const timeline = gsap.timeline();
      timeline
        .set(items, { autoAlpha: 0, x: 80, y: 18 })
        .to(path, { attr: { d: WAVE_OVERSHOOT }, duration: 1.05, ease: "power4.inOut" })
        .to(path, { attr: { d: WAVE_OPEN }, duration: 0.32, ease: "power2.out" }, "-=0.16")
        .to(items, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          duration: 0.72,
          stagger: 0.09,
          ease: "power3.out",
          onComplete: () => items[0]?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true }),
        }, "-=0.5");
      return () => { timeline.kill(); };
    }

    delete document.documentElement.dataset.navigationOpen;
    const unlock = () => {
      setNavigationScrollLock(false);
      gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
    };

    if (reduced) {
      gsap.set(path, { attr: { d: WAVE_CLOSED } });
      gsap.set(items, { autoAlpha: 0 });
      unlock();
      return;
    }

    const timeline = gsap.timeline({ onComplete: unlock });
    timeline
      .to(items, { autoAlpha: 0, x: 64, duration: 0.36, stagger: 0.045, ease: "power2.in" })
      .to(path, { attr: { d: WAVE_CLOSED }, duration: 0.95, ease: "power4.inOut" }, "-=0.12");
    return () => { timeline.kill(); };
  }, [mounted, open]);

  useEffect(() => () => {
    setNavigationScrollLock(false);
    delete document.documentElement.dataset.navigationOpen;
  }, []);

  const move = (index: number, event: PointerEvent<HTMLAnchorElement>) => {
    const link = links.current[index];
    if (!link || event.pointerType === "touch") return;
    const bounds = link.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
    gsap.to(link, { x, y, duration: 0.36, ease: "power3.out", overwrite: true });
  };

  const reset = (index: number) => {
    const link = links.current[index];
    if (link) gsap.to(link, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.55)", overwrite: true });
  };

  const moveButton = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || !magnetic.current) return;
    const bounds = magnetic.current.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
    gsap.to(button.current, { x, y, duration: 0.42, ease: "power3.out", overwrite: true });
  };

  const resetButton = () => {
    gsap.to(button.current, { x: 0, y: 0, duration: 0.62, ease: "elastic.out(1, 0.55)", overwrite: true });
  };

  return <><nav ref={nav} className={`${styles.nav} ${motion.links}`} data-compact={compact} data-section={activeSection} inert={compact} aria-label="Main navigation">
    {ITEMS.map((item, index) => (
      <span key={item.label} className={motion.navSlot} data-section={item.label}>
        <a
          ref={(element) => { links.current[index] = element; }}
          className={styles.navLink}
          data-section={item.label}
          href={item.href}
          data-project-link={item.label === "project" ? "true" : undefined}
          onClick={(event) => {
            if (item.label !== "project") return;
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("portfolio:toggle-projects"));
          }}
          onPointerMove={(event) => move(index, event)}
          onPointerLeave={() => reset(index)}
        >
          {Array.from(item.label, (character, characterIndex) => <span className={styles.navChar} style={{ "--char-index": characterIndex } as CSSProperties} key={`${character}-${characterIndex}`}>{character}</span>)}
        </a>
      </span>
    ))}
  </nav>
  {mounted && createPortal(<>
    <div ref={overlay} className={motion.overlay} aria-hidden={!open}>
      <svg className={motion.wave} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path ref={wavePath} d={WAVE_CLOSED} />
      </svg>
      <div ref={panel} id="compact-navigation" className={motion.overlayContent} data-section={activeSection} inert={!open || !compact}>
        <span className={motion.overlayEyebrow}>navigation</span>
        <nav aria-label="Overlay navigation">
          {ITEMS.map((item, index) => <div key={item.label} className={motion.overlayItem} data-overlay-item data-section={item.label}>
            <span aria-hidden="true">0{index + 1}</span>
            <a href={item.href} onClick={(event) => {
              setOpen(false);
              button.current?.focus({ preventScroll: true });
              if (item.label === "project") {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("portfolio:toggle-projects"));
              }
            }}>{item.label}</a>
          </div>)}
        </nav>
      </div>
    </div>
    <div className={motion.dock} data-compact={compact} data-open={open}>
      <span ref={magnetic} className={motion.toggleWrap}>
        <button ref={button} className={motion.toggle} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="compact-navigation" tabIndex={compact ? 0 : -1} onClick={() => setOpen((value) => !value)} onPointerMove={moveButton} onPointerLeave={resetButton}>
          <span className={motion.surface} />
          <span className={motion.liquid} />
          <span className={motion.icon} aria-hidden="true"><span /><span /></span>
        </button>
      </span>
    </div>
  </>, document.body)}
  </>;
}
