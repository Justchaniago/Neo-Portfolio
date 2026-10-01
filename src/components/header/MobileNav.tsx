"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import styles from "./MobileNav.module.css";

const sections = [
  { label: "Project", name: "project" },
  { label: "About", name: "about" },
  { label: "Contact", name: "contact" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destination = useRef<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const main = document.querySelector<HTMLElement>("main");
    const content = document.querySelector<HTMLElement>("[data-page-content]");
    const previousInert = content?.inert ?? false;
    const trigger = buttonRef.current;
    const previousOverflow = main?.style.overflowY ?? "";
    panelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    if (content) content.inert = true;
    if (main) {
      main.style.overflowY = "hidden";
    }
    const lock = (locked: boolean) => window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", {
      detail: { source: "mobile-navigation", locked },
    }));
    lock(true);
    const desktop = matchMedia("(min-width: 768px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      desktop.removeEventListener("change", onResize);
      if (content) content.inert = previousInert;
      if (main) {
        main.style.overflowY = previousOverflow;
      }
      lock(false);
      const target = returnFocus.current ?? trigger;
      if (target?.isConnected && !target.closest("[inert]")
        && target.getClientRects().length
        && getComputedStyle(target).visibility !== "hidden") target.focus({ preventScroll: true });
      if (destination.current) {
        window.dispatchEvent(new CustomEvent("portfolio:request-section", {
          detail: { section: destination.current },
        }));
        destination.current = null;
      }
    };
  }, [open]);

  const close = (section?: string) => {
    if (closeTimer.current) return;
    destination.current = section ?? null;
    const panel = panelRef.current;
    if (panel) panel.style.setProperty("--exit-transform", getComputedStyle(panel).transform);
    const scrim = panel?.previousElementSibling as HTMLElement | null;
    if (scrim) scrim.style.setProperty("--exit-opacity", getComputedStyle(scrim).opacity);
    setClosing(true);
    closeTimer.current = setTimeout(() => setOpen(false),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 360);
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
              <X size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            </button>
          </div>
          <nav className={styles.links} aria-label="Main navigation">
            {sections.map(section => (
              <a
                key={section.name}
                className={styles.link}
                href={section.name === "project" ? "#projects-layer" : `#${section.name}`}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  close(section.name);
                }}
              >
                <span>{section.label}</span>
                <ArrowUpRight className={styles.arrow} aria-hidden="true" focusable="false" />
              </a>
            ))}
          </nav>
          <p className={styles.caption}>chaniago.me</p>
        </section>
      </div>, document.body)}
    </div>
  );
}
