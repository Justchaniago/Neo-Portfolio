"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { triggerRouteTransition } from "@/components/projects/ProjectTransition";
import styles from "./MobileNav.module.css";
import { currentSection, headerSections, sectionHref, type HeaderSection } from "./sections";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const pathname = usePathname();
  const router = useRouter();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const content = document.querySelector<HTMLElement>("[data-page-content]");
    const previousInert = content?.inert ?? false;
    const trigger = buttonRef.current;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    if (content) content.inert = true;
    const lock = (locked: boolean) => window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", {
      detail: { source: "mobile-navigation", locked },
    }));
    lock(true);
    const desktop = matchMedia("(min-width: 768px)");
    const dismiss = () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      setOpen(false);
    };
    const onResize = () => { if (desktop.matches) dismiss(); };
    desktop.addEventListener("change", onResize);
    window.addEventListener("popstate", dismiss);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      desktop.removeEventListener("change", onResize);
      window.removeEventListener("popstate", dismiss);
      if (content) content.inert = previousInert;
      lock(false);
      const target = returnFocus.current ?? trigger;
      if (target?.isConnected && !target.closest("[inert]")
        && target.getClientRects().length
        && getComputedStyle(target).visibility !== "hidden") target.focus({ preventScroll: true });
    };
  }, [open]);

  const close = (section?: HeaderSection) => {
    if (closeTimer.current) return;
    const panel = panelRef.current;
    if (panel) panel.style.setProperty("--exit-transform", getComputedStyle(panel).transform);
    const scrim = panel?.previousElementSibling as HTMLElement | null;
    if (scrim) scrim.style.setProperty("--exit-opacity", getComputedStyle(scrim).opacity);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      if (!section) return;
      if (pathname !== "/") {
        const href = sectionHref(section.name, pathname);
        triggerRouteTransition({ href, label: section.transition, navigate: () => router.push(href) });
      } else {
        window.dispatchEvent(new CustomEvent("portfolio:request-section", { detail: { section: section.name } }));
      }
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    ) ?? []);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  return (
    <div className={styles.root} data-open={open}>
      <button
        ref={buttonRef}
        className={styles.trigger}
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => {
          returnFocus.current = buttonRef.current;
          setActiveSection(currentSection(pathname));
          setClosing(false);
          setOpen(true);
        }}
      >
        <span className={styles.icon} aria-hidden="true">
          <span /><span />
        </span>
      </button>
      {open && createPortal(<div className={styles.layer} data-closing={closing}>
        <button className={styles.scrim} type="button" tabIndex={-1} aria-label="Close navigation" onClick={() => close()} />
        <section
          ref={panelRef}
          id="mobile-navigation-panel"
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          onKeyDown={onKeyDown}
        >
          <div className={styles.panelTop}>
            <p className={styles.eyebrow}>Navigation</p>
            <button className={styles.close} type="button" aria-label="Close navigation" onClick={() => close()}>
              <X size={22} strokeWidth={1.6} aria-hidden="true" focusable="false" />
            </button>
          </div>
          <nav className={styles.links} aria-label="Main navigation">
            {headerSections.map((section, itemIndex) => (
              <a
                key={section.name}
                className={styles.link}
                data-active={activeSection === section.name}
                style={{ "--item-index": itemIndex } as CSSProperties}
                href={sectionHref(section.name, pathname)}
                aria-current={activeSection === section.name ? "location" : undefined}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  close(section);
                }}
              >
                <span className={styles.linkContent}>
                  <span className={styles.linkIndex}>{section.index}</span>
                  <span className={styles.linkLabel}>{section.label}</span>
                </span>
                <span className={styles.arrowWrap} aria-hidden="true">
                  <ArrowUpRight className={styles.arrow} focusable="false" />
                </span>
              </a>
            ))}
          </nav>
          <div className={styles.panelFooter}>
            <p className={styles.caption}>chaniago.me</p>
            <p className={styles.meta}>Creative Engineer</p>
          </div>
        </section>
      </div>, document.body)}
    </div>
  );
}
