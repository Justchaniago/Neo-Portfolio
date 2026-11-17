"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ArrowUpRight, Check } from "lucide-react";
import styles from "./CommandPalette.module.css";

type CommandItem = {
  id: "projects" | "about" | "contact" | "home" | "ambient" | "copy-email" | "github" | "linkedin";
  index: string;
  label: string;
  meta: string;
  external?: boolean;
  keywords: string;
};

export function CommandPalette() {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const scrimRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const dispatchCommand = (id: CommandItem["id"]) => {
    if (id === "projects") {
      if (document.documentElement.dataset.projectsActive !== "true") {
        window.dispatchEvent(new CustomEvent("portfolio:request-section", { detail: { section: "project" } }));
      }
    } else if (id === "about" || id === "contact") {
      if (document.documentElement.dataset.staticSection !== id) {
        window.dispatchEvent(new CustomEvent("portfolio:request-section", { detail: { section: id } }));
      }
    } else if (id === "home") {
      window.dispatchEvent(new CustomEvent("portfolio:close-static-pages"));
      window.dispatchEvent(new CustomEvent("portfolio:close-projects", { detail: { mode: "slide-down" } }));
      window.dispatchEvent(new CustomEvent("portfolio:go-home"));
    } else if (id === "ambient") {
      document.querySelector<HTMLButtonElement>("header button[aria-pressed]")?.click();
    } else if (id === "github") {
      window.open("https://github.com/Justchaniago", "_blank", "noopener,noreferrer");
    } else if (id === "linkedin") {
      window.open("https://www.linkedin.com/in/justchaniago/", "_blank", "noopener,noreferrer");
    }
  };

  const closePalette = (actionToRun?: CommandItem["id"]) => {
    if (closing) return;
    if (actionToRun) {
      dispatchCommand(actionToRun);
    }
    setClosing(true);
  };

  const openPalette = () => {
    setClosing(false);
    setCopied(false);
    setQuery("");
    setActiveIndex(0);
    setMounted(true);
  };

  // GSAP Entrance & Exit Animation driven by `mounted` and `closing` state
  useEffect(() => {
    if (!mounted) return;
    const scrim = scrimRef.current;
    const surface = surfaceRef.current;
    if (!scrim || !surface) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.killTweensOf([scrim, surface]);

    if (closing) {
      if (reduced) {
        const frame = requestAnimationFrame(() => {
          setClosing(false);
          setMounted(false);
          setQuery("");
          setActiveIndex(0);
          setCopied(false);
        });
        return () => cancelAnimationFrame(frame);
      }
      gsap.to(scrim, {
        autoAlpha: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(surface, {
        autoAlpha: 0,
        y: 10,
        scale: 0.968,
        duration: 0.26,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          setClosing(false);
          setMounted(false);
          setQuery("");
          setActiveIndex(0);
          setCopied(false);
        },
      });
      return;
    }

    if (reduced) {
      gsap.set([scrim, surface], { autoAlpha: 1, y: 0, scale: 1 });
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    gsap.fromTo(
      scrim,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.32, ease: "power2.out" },
    );
    gsap.fromTo(
      surface,
      { autoAlpha: 0, y: 18, scale: 0.955 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.44,
        ease: "expo.out",
        clearProps: "transform",
      },
    );
    inputRef.current?.focus({ preventScroll: true });
  }, [closing, mounted]);

  const executeItem = async (id: CommandItem["id"]) => {
    if (closing) return;
    if (id === "copy-email") {
      try {
        await navigator.clipboard.writeText("hello@chaniago.me");
        setCopied(true);
        window.setTimeout(() => {
          setCopied(false);
          closePalette();
        }, 550);
      } catch {
        closePalette();
        window.location.href = "mailto:hello@chaniago.me";
      }
      return;
    }
    closePalette(id);
  };

  const items = useMemo<CommandItem[]>(
    () => [
      {
        id: "projects",
        index: "01",
        label: "project",
        meta: "selected works",
        keywords: "projects work portfolio showcase 01",
      },
      {
        id: "about",
        index: "02",
        label: "about",
        meta: "engineering craft",
        keywords: "about bio craft story profile 02",
      },
      {
        id: "contact",
        index: "03",
        label: "contact",
        meta: "initiate dialogue",
        keywords: "contact hire message reach email 03",
      },
      {
        id: "home",
        index: "04",
        label: "index",
        meta: "return to hero",
        keywords: "home hero top index start return 04",
      },
      {
        id: "ambient",
        index: "05",
        label: "ambient",
        meta: "toggle sound",
        keywords: "audio sound music ambient harp mute play 05",
      },
      {
        id: "copy-email",
        index: "06",
        label: copied ? "copied" : "hello@chaniago.me",
        meta: copied ? "in clipboard" : "copy address",
        keywords: "email copy mail address hello 06",
      },
      {
        id: "github",
        index: "07",
        label: "github",
        meta: "@justchaniago",
        external: true,
        keywords: "github code repo source git 07",
      },
      {
        id: "linkedin",
        index: "08",
        label: "linkedin",
        meta: "/in/justchaniago",
        external: true,
        keywords: "linkedin social network connect profile 08",
      },
    ],
    [copied],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [items, query]);

  // Sync fluid floating selection indicator with GSAP
  useEffect(() => {
    if (!mounted) return;
    const list = listRef.current;
    const pill = highlightRef.current;
    const activeEl = list?.querySelector<HTMLElement>(`[data-spot-idx='${activeIndex}']`);
    if (!activeEl || !pill || filtered.length === 0) {
      if (pill) gsap.set(pill, { autoAlpha: 0 });
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(pill, {
      autoAlpha: 1,
      y: activeEl.offsetTop,
      height: activeEl.offsetHeight,
      duration: reduced ? 0 : 0.28,
      ease: "expo.out",
      overwrite: "auto",
    });
    activeEl.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered.length, mounted, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (mounted && !closing) {
          closePalette();
        } else if (!mounted) {
          openPalette();
        }
        return;
      }

      if (!mounted || closing) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePalette();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        void executeItem(filtered[activeIndex].id);
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, closing, filtered, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const lock = (locked: boolean) => {
      window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", { detail: { source: "spotlight", locked } }));
    };
    lock(true);
    return () => {
      lock(false);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.layer}
      data-closing={closing}
      role="dialog"
      aria-modal="true"
      aria-label="Quick index"
    >
      <button
        ref={scrimRef}
        type="button"
        className={styles.scrim}
        tabIndex={-1}
        aria-label="Close quick index"
        onClick={() => closePalette()}
      />

      <div ref={surfaceRef} className={styles.surface}>
        <span className={styles.rimGlow} aria-hidden="true" />
        <span className={styles.gridTexture} aria-hidden="true" />

        <div className={styles.header}>
          <span className={styles.eyebrow}>index //</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="type destination or command..."
            className={styles.input}
            aria-label="Type destination or command"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            className={styles.escPill}
            onClick={() => closePalette()}
            aria-label="Close"
          >
            esc
          </button>
        </div>

        <div ref={listRef} className={styles.results} role="listbox">
          <div ref={highlightRef} className={styles.floatingHighlight} aria-hidden="true">
            <span className={styles.highlightAccent} />
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <span>00</span>
              <p>no match for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  data-spot-idx={idx}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.row} ${isSelected ? styles.rowActive : ""}`}
                  onPointerMove={() => {
                    if (activeIndex !== idx) setActiveIndex(idx);
                  }}
                  onClick={() => void executeItem(item.id)}
                >
                  <div className={styles.rowLeft}>
                    <span className={styles.rowIndex}>{item.index}</span>
                    <span className={styles.rowLabel}>{item.label}</span>
                  </div>

                  <div className={styles.rowRight}>
                    <span className={styles.rowMeta}>{item.meta}</span>
                    <span className={styles.markerCircle} aria-hidden="true">
                      {item.id === "copy-email" && copied ? (
                        <Check size={13} strokeWidth={1.8} />
                      ) : item.external ? (
                        <ArrowUpRight size={14} strokeWidth={1.6} />
                      ) : (
                        <span className={styles.markerGlyph}>→</span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerKeys}>
            <span className={styles.keyPair}>
              <kbd className={styles.keyToken}>↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className={styles.keyPair}>
              <kbd className={styles.keyToken}>↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span className={styles.footerSignature}>
            chaniago<span className={styles.signatureDot}>.</span>me
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
