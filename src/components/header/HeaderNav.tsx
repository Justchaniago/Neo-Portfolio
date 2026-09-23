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

export function HeaderNav() {
  const nav = useRef<HTMLElement>(null);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);
  const button = useRef<HTMLButtonElement>(null);
  const magnetic = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
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
      if (nav.current) nav.current.style.transform = desktop ? `translate3d(0, -${scroller.scrollTop}px, 0)` : "";
      const next = overlayActive || (mobile.matches ? scroller.scrollTop > 24 : scroller.scrollTop > 40);
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
  {mounted && createPortal(<div className={motion.dock} data-compact={compact} data-open={open}>
    <span ref={magnetic} className={motion.toggleWrap}>
    <button ref={button} className={motion.toggle} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="compact-navigation" tabIndex={compact ? 0 : -1} onClick={() => setOpen((value) => !value)} onPointerMove={moveButton} onPointerLeave={resetButton}>
      <span className={motion.surface} />
      <span className={motion.liquid} />
      <span className={motion.icon} aria-hidden="true"><span /><span /></span>
    </button>
    </span>
    <div ref={panel} id="compact-navigation" className={motion.panel} inert={!open || !compact} aria-hidden={!open || !compact}>
      <nav aria-label="Compact navigation">
        {ITEMS.map((item) => <a key={item.label} href={item.href} onClick={(event) => {
          setOpen(false);
          button.current?.focus({ preventScroll: true });
          if (item.label === "project") {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("portfolio:toggle-projects"));
          }
        }}>{item.label}</a>)}
      </nav>
    </div>
  </div>, document.body)}
  </>;
}
