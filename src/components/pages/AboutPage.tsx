"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import styles from "./AboutPage.module.css";

const letters = {
  en: {
    langGroup: "Page language",
    title: "about",
    hint: "Scroll to read",
    intro: "I’m Chaniago. I build two things most brands buy separately:",
    firstLine: "The site your customers see.",
    secondLine: "The screens your staff work in.",
    merged: "One piece of work",
    reading:
      "Usually they come from two teams. The website gets the polish; the counter gets a spreadsheet and a workaround. I started Chaniago Labs because that second half is where a brand actually runs.",
    proofs: [
      "A booking lands in the queue without anyone copying a row.",
      "A member pass shows a fresh code every visit, and the cashier gets it in two seconds.",
      "An alert fires only when a person really needs to step in.",
    ],
    closing: "I design, write and ship these myself, with AI taking the repetitive parts.",
    ask: "Patching something by hand every day? Show me how it works today.",
    role: "Founder, Chaniago Labs",
    home: "Return to home",
    work: "Selected work",
    contact: "Start a conversation",
  },
  id: {
    langGroup: "Bahasa halaman",
    title: "about",
    hint: "Gulir untuk membaca",
    intro: "Aku Chaniago. Aku membangun dua hal yang biasanya dibeli terpisah oleh brand:",
    firstLine: "Situs yang dilihat pelangganmu.",
    secondLine: "Layar yang dipakai timmu.",
    merged: "Satu pekerjaan utuh",
    reading:
      "Biasanya keduanya datang dari dua tim. Website-nya dipoles; meja kasirnya kebagian spreadsheet dan akal-akalan. Aku mendirikan Chaniago Labs karena justru di sisi kedua itulah sebuah brand benar-benar berjalan.",
    proofs: [
      "Booking masuk ke antrean tanpa ada yang menyalin baris.",
      "Kartu member menampilkan kode baru tiap kunjungan, dan kasir paham dalam dua detik.",
      "Peringatan hanya muncul saat memang butuh tangan manusia.",
    ],
    closing:
      "Aku merancang, menulis, dan merilis semuanya sendiri, dengan AI mengerjakan bagian yang berulang.",
    ask: "Masih menambal sesuatu secara manual tiap hari? Tunjukkan cara kerjanya sekarang.",
    role: "Founder, Chaniago Labs",
    home: "Kembali ke beranda",
    work: "Lihat karya",
    contact: "Mulai ngobrol",
  },
} as const;

const beatStarts = [0, 0.28, 0.55, 0.8, 1];

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function AboutPage({ ready, onClose }: { ready: boolean; onClose: () => void }) {
  const [lang, setLang] = useState<keyof typeof letters>("en");
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLSpanElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef(0);
  const target = useRef(0);
  const wasReady = useRef(false);
  const pointerStart = useRef<{ id: number; y: number; target: number; moved: boolean } | null>(null);
  const reducedStepTimer = useRef<number | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  const syncProgressUi = useCallback((value: number) => {
    const next = clampProgress(value);
    if (root.current) root.current.dataset.aboutProgress = next.toFixed(2);
    if (progressBar.current) progressBar.current.style.transform = `scaleX(${next})`;
    if (hint.current) hint.current.style.opacity = String(clampProgress((0.06 - next) / 0.04));
  }, []);

  const showReducedFrame = useCallback((value: number) => {
    const element = stage.current;
    if (!element) return;

    gsap.set(element.querySelectorAll<HTMLElement>("[data-motion]"), {
      clearProps: "transform,filter,letterSpacing",
    });

    const opening = element.querySelector<HTMLElement>('[data-beat="opening"]');
    const reading = element.querySelector<HTMLElement>('[data-beat="reading"]');
    const proofs = element.querySelector<HTMLElement>('[data-beat="proofs"]');
    const closing = element.querySelector<HTMLElement>('[data-beat="closing"]');
    const intro = element.querySelector<HTMLElement>("[data-intro]");
    const firstLine = element.querySelector<HTMLElement>("[data-first-line]");
    const secondLine = element.querySelector<HTMLElement>("[data-second-line]");
    const merged = element.querySelector<HTMLElement>("[data-merged]");
    const readingText = element.querySelector<HTMLElement>("[data-reading-text]");
    const proofLines = element.querySelectorAll<HTMLElement>("[data-proof-rule]");
    const proofText = element.querySelectorAll<HTMLElement>("[data-proof-text]");
    const closingText = element.querySelector<HTMLElement>("[data-closing-text]");

    if (
      !opening || !reading || !proofs || !closing || !intro || !firstLine || !secondLine
      || !merged || !readingText || !closingText
    ) return;

    const showOpening = value < 0.28;
    const showMerged = value >= 0.14 && showOpening;
    const beats = [opening, reading, proofs, closing];
    gsap.set(beats, { opacity: 0 });
    gsap.set(opening, { opacity: showOpening ? 1 : 0 });
    gsap.set(reading, { opacity: value >= 0.28 && value < 0.55 ? 1 : 0 });
    gsap.set(proofs, { opacity: value >= 0.55 && value < 0.8 ? 1 : 0 });
    gsap.set(closing, { opacity: value >= 0.8 ? 1 : 0 });
    gsap.set([intro, firstLine, secondLine], { opacity: showOpening && !showMerged ? 1 : 0 });
    gsap.set(merged, { opacity: showMerged ? 1 : 0 });
    gsap.set(readingText, { opacity: 1 });
    gsap.set(element.querySelectorAll<HTMLElement>("[data-word]"), { opacity: 1 });
    gsap.set(proofLines, { opacity: 1 });
    gsap.set(proofText, { opacity: 1 });
    gsap.set(closingText, { opacity: 1 });
  }, []);

  const seekProgress = useCallback((value: number, immediate = false) => {
    const next = clampProgress(value);
    target.current = next;
    const activeTimeline = timeline.current;
    if (!activeTimeline) {
      progress.current = next;
      syncProgressUi(next);
      return;
    }

    if (reducedMotion || immediate) {
      activeTimeline.progress(next);
      if (reducedMotion) showReducedFrame(next);
      return;
    }

    gsap.to(activeTimeline, {
      progress: next,
      duration: 0.9,
      ease: "power3.out",
      overwrite: true,
    });
  }, [reducedMotion, showReducedFrame, syncProgressUi]);

  useEffect(() => {
    if (ready && !wasReady.current) {
      progress.current = 0;
      target.current = 0;
      syncProgressUi(0);
    }
    wasReady.current = ready;
  }, [ready, syncProgressUi]);

  useEffect(() => {
    if (!ready || !stage.current) return;

    const element = stage.current;
    const intro = element.querySelector<HTMLElement>("[data-intro]");
    const firstLine = element.querySelector<HTMLElement>("[data-first-line]");
    const secondLine = element.querySelector<HTMLElement>("[data-second-line]");
    const merged = element.querySelector<HTMLElement>("[data-merged]");
    const readingBeat = element.querySelector<HTMLElement>('[data-beat="reading"]');
    const readingText = element.querySelector<HTMLElement>("[data-reading-text]");
    const proofBeat = element.querySelector<HTMLElement>('[data-beat="proofs"]');
    const proofLines = element.querySelectorAll<HTMLElement>("[data-proof-rule]");
    const proofText = element.querySelectorAll<HTMLElement>("[data-proof-text]");
    const closingBeat = element.querySelector<HTMLElement>('[data-beat="closing"]');

    if (
      !intro || !firstLine || !secondLine || !merged || !readingBeat || !readingText
      || !proofBeat || !closingBeat
    ) return;

    gsap.set([
      ...element.querySelectorAll<HTMLElement>("[data-motion]"),
      readingBeat,
      proofBeat,
      closingBeat,
    ], { clearProps: "all" });

    const activeTimeline = gsap.timeline({
      paused: true,
      onUpdate: () => {
        const next = activeTimeline.progress();
        progress.current = next;
        syncProgressUi(next);
        if (reducedMotion) showReducedFrame(next);
      },
    });

    activeTimeline.to({ value: 0 }, { value: 1, duration: 1, ease: "none" }, 0);
    activeTimeline.to(intro, { opacity: 0, duration: 0.08, ease: "none" }, 0.04);
    activeTimeline.to(firstLine, {
      y: 24,
      opacity: 0,
      letterSpacing: "-0.055em",
      duration: 0.1,
      ease: "power2.in",
    }, 0.04);
    activeTimeline.to(secondLine, {
      y: -24,
      opacity: 0,
      letterSpacing: "-0.055em",
      duration: 0.1,
      ease: "power2.in",
    }, 0.04);
    activeTimeline.to(merged, {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration: 0.1,
      ease: "power2.out",
    }, 0.1);
    activeTimeline.to(merged, {
      opacity: 0,
      y: -20,
      duration: 0.08,
      ease: "power2.in",
    }, 0.22);
    activeTimeline.to(readingBeat, {
      opacity: 1,
      y: 0,
      duration: 0.1,
      ease: "power2.out",
    }, 0.23);
    activeTimeline.to([...element.querySelectorAll<HTMLElement>("[data-word]")], {
      opacity: 1,
      duration: 0.025,
      stagger: 0.0045,
      ease: "none",
    }, 0.28);
    activeTimeline.to(readingBeat, {
      opacity: 0,
      y: -20,
      duration: 0.08,
      ease: "power2.in",
    }, 0.5);
    activeTimeline.to(proofBeat, {
      opacity: 1,
      y: 0,
      duration: 0.09,
      ease: "power2.out",
    }, 0.51);
    activeTimeline.to([...proofLines], {
      scaleX: 1,
      duration: 0.14,
      stagger: 0.03,
      ease: "power2.out",
    }, 0.56);
    activeTimeline.to([...proofText], {
      yPercent: 0,
      duration: 0.11,
      stagger: 0.04,
      ease: "power2.out",
    }, 0.6);
    activeTimeline.to(proofBeat, {
      opacity: 0,
      y: -20,
      duration: 0.08,
      ease: "power2.in",
    }, 0.76);
    activeTimeline.to(closingBeat, {
      opacity: 1,
      y: 0,
      duration: 0.09,
      ease: "power2.out",
    }, 0.76);

    timeline.current = activeTimeline;
    const current = progress.current;
    activeTimeline.progress(current);
    if (reducedMotion) {
      showReducedFrame(current);
    } else if (Math.abs(target.current - current) > 0.001) {
      gsap.to(activeTimeline, {
        progress: target.current,
        duration: 0.9,
        ease: "power3.out",
        overwrite: true,
      });
    }

    return () => {
      progress.current = activeTimeline.progress();
      gsap.killTweensOf(activeTimeline, "progress");
      activeTimeline.kill();
      if (timeline.current === activeTimeline) timeline.current = null;
    };
  }, [lang, ready, reducedMotion, showReducedFrame, syncProgressUi]);

  useEffect(() => {
    const element = root.current;
    if (!ready || !element) return;

    const stepReduced = (direction: number) => {
      const previousTimer = reducedStepTimer.current;
      if (previousTimer === null) {
        const current = target.current;
        const next = direction > 0
          ? beatStarts.find((start) => start > current + 0.005) ?? 1
          : [...beatStarts].reverse().find((start) => start < current - 0.005) ?? 0;
        seekProgress(next, true);
      } else {
        window.clearTimeout(previousTimer);
      }
      reducedStepTimer.current = window.setTimeout(() => {
        reducedStepTimer.current = null;
      }, 450);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const multiplier = event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? window.innerHeight
          : 1;
      const delta = event.deltaY * multiplier;
      if (delta === 0) return;
      if (reducedMotion) {
        stepReduced(Math.sign(delta));
        return;
      }
      seekProgress(target.current + delta / (Math.max(1, window.innerHeight) * 3.2));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (event.target instanceof Element && event.target.closest("button,[data-stack-handle]")) return;
      pointerStart.current = {
        id: event.pointerId,
        y: event.clientY,
        target: target.current,
        moved: false,
      };
      if (event.isTrusted) element.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const start = pointerStart.current;
      if (!start || start.id !== event.pointerId) return;
      const distance = event.clientY - start.y;
      if (Math.abs(distance) > 6) start.moved = true;
      if (start.moved && !reducedMotion) {
        seekProgress(start.target - distance / (Math.max(1, window.innerHeight) * 2.2));
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerStart.current;
      if (!start || start.id !== event.pointerId) return;
      pointerStart.current = null;
      if (event.isTrusted && element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      const distance = event.clientY - start.y;
      if (start.moved && reducedMotion) stepReduced(-Math.sign(distance));
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (pointerStart.current?.id === event.pointerId) pointerStart.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const eventTarget = event.target;
      if (
        eventTarget instanceof Element
        && eventTarget.closest("input,textarea,select,[contenteditable='true']")
      ) return;

      const isSpace = event.key === " " || event.code === "Space";
      if (isSpace && eventTarget instanceof Element && eventTarget.closest("button")) return;

      if (event.key === "Home") {
        event.preventDefault();
        seekProgress(0, reducedMotion);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        seekProgress(1, reducedMotion);
        return;
      }

      const direction = event.key === "ArrowDown" || event.key === "PageDown" || (isSpace && !event.shiftKey)
        ? 1
        : event.key === "ArrowUp" || event.key === "PageUp" || (isSpace && event.shiftKey)
          ? -1
          : 0;
      if (!direction) return;

      event.preventDefault();
      if (reducedMotion) {
        stepReduced(direction);
        return;
      }
      const next = direction > 0
        ? beatStarts.find((start) => start > target.current + 0.005) ?? 1
        : [...beatStarts].reverse().find((start) => start < target.current - 0.005) ?? 0;
      seekProgress(next);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerCancel);
    element.addEventListener("keydown", onKeyDown);

    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerCancel);
      element.removeEventListener("keydown", onKeyDown);
      pointerStart.current = null;
      if (reducedStepTimer.current !== null) {
        window.clearTimeout(reducedStepTimer.current);
        reducedStepTimer.current = null;
      }
    };
  }, [ready, reducedMotion, seekProgress]);

  const copy = letters[lang];
  const readingWords = copy.reading.split(/\s+/);
  const visit = (section: "project" | "contact") =>
    window.dispatchEvent(new CustomEvent("portfolio:request-section", { detail: { section } }));

  return (
    <div
      ref={root}
      className={styles.paper}
      data-lenis-prevent
      data-about-progress="0.00"
    >
      <article className={styles.sheet} lang={lang} aria-labelledby="about-heading">
        <header className={styles.folio} data-page-part>
          <span ref={hint} className={styles.hint} aria-hidden="true">
            <ArrowDown size={14} strokeWidth={1.6} />
            <span>{copy.hint}</span>
          </span>
          <div className={styles.langSwitch} role="group" aria-label={copy.langGroup}>
            <button
              type="button"
              lang="en"
              aria-label="English"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <button
              type="button"
              lang="id"
              aria-label="Bahasa Indonesia"
              aria-pressed={lang === "id"}
              onClick={() => setLang("id")}
            >
              ID
            </button>
          </div>
          <span ref={progressBar} className={styles.progressBar} aria-hidden="true" />
        </header>

        <div className={styles.spread} data-about-middle>
          <div className={styles.leftCol}>
            <h1 id="about-heading" className={styles.title} data-page-part>
              {copy.title}<span className={styles.dot} aria-hidden="true">.</span>
            </h1>
            <figure className={styles.plate} data-page-part>
              <Image
                src="/hero-justchaniago-left.png"
                alt="Chaniago"
                width={1448}
                height={1086}
                sizes="(max-width: 820px) 27vw, 300px"
              />
            </figure>
          </div>

          <div
            ref={stage}
            className={styles.stage}
            data-page-part
            data-about-stage
          >
            <div className={styles.beat} data-beat="opening">
              <div className={styles.openingCopy}>
                <p className={styles.intro} data-motion data-intro>{copy.intro}</p>
                <div className={styles.headline}>
                  <div className={styles.headlineLines}>
                    <p data-motion data-first-line>{copy.firstLine}</p>
                    <p data-motion data-second-line>{copy.secondLine}</p>
                  </div>
                  <p className={styles.merged} data-motion data-merged>
                    {copy.merged}<span className={styles.dot}>.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className={`${styles.beat} ${styles.readingBeat}`} data-beat="reading">
              <p className={styles.reading} data-motion data-reading-text>
                {readingWords.map((word, index) => (
                  <span className={styles.word} data-motion data-word key={`${word}-${index}`}>
                    {word}{index < readingWords.length - 1 ? " " : ""}
                  </span>
                ))}
              </p>
            </div>

            <div className={`${styles.beat} ${styles.proofBeat}`} data-beat="proofs">
              <ul className={styles.proofs}>
                {copy.proofs.map((proof) => (
                  <li key={proof}>
                    <span className={styles.proofRule} data-motion data-proof-rule aria-hidden="true" />
                    <span className={styles.proofText}>
                      <span data-motion data-proof-text>{proof}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${styles.beat} ${styles.closingBeat}`} data-beat="closing">
              <div className={styles.closeBlock} data-motion data-closing-text>
                <p className={styles.closing}>{copy.closing}</p>
                <p className={styles.ask}>{copy.ask}</p>
                <div className={styles.signoff}>
                  <strong className={styles.mark}>Chaniago<i aria-hidden="true">.</i></strong>
                  <span>{copy.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className={styles.footer} data-page-part>
          <button type="button" className={styles.returnButton} onClick={onClose}>
            <span className={styles.returnArrow} aria-hidden="true">←</span>
            <span>{copy.home}</span>
          </button>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryLink} onClick={() => visit("project")}>
              <span>{copy.work}</span>
              <ArrowUpRight className={styles.arrow} aria-hidden="true" />
            </button>
            <button type="button" className={styles.primaryLink} onClick={() => visit("contact")}>
              <span>{copy.contact}</span>
              <ArrowUpRight className={styles.arrow} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
