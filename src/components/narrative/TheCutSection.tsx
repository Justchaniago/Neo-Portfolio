"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { sectionHref } from "@/components/header/sections";
import { animateCut } from "./animateCut";
import { LabsDispatch } from "./LabsDispatch";
import styles from "./TheCutSection.module.css";

// Lane edges in em from the top of the line: two through the ascender, four through
// the x-height, two through the descender. No edge shaves a sliver off a letter.
const EDGES = [0.09, 0.195, 0.295, 0.435, 0.575, 0.715, 0.858, 0.955, 1.06];
const statement = "It\u2019s the studio I founded to build websites, apps, AI systems and automations. I lead every build, with Devin and other AI agents working alongside me.";

export function TheCutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const openedContact = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const main = section?.closest("main");
    if (!section || !main) return;
    const stopMotion = animateCut(section, main);
    const locks = new Set<string>();
    const { projectsActive, staticSection } = document.documentElement.dataset;
    if (projectsActive === "true") locks.add("projects");
    if (staticSection) locks.add("static-section");
    section.inert = locks.size > 0;
    const onLock = (event: Event) => {
      const { source, locked } = (event as CustomEvent<{ source: string; locked: boolean }>).detail;
      if (locked) locks.add(source);
      else locks.delete(source);
      section.inert = locks.size > 0;
    };
    const forgetOrigin = () => { openedContact.current = false; };
    const onSettled = (event: Event) => {
      if (!openedContact.current) return;
      if ((event as CustomEvent<{ top: string }>).detail.top !== "contact") return forgetOrigin();
      if (document.activeElement === document.body || document.activeElement === linkRef.current) {
        document.querySelector<HTMLButtonElement>("#contact [data-stack-handle]")?.focus({ preventScroll: true });
      }
    };
    const onClosed = () => {
      if (!openedContact.current) return;
      forgetOrigin();
      if (!section.inert) linkRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("portfolio:scroll-lock", onLock);
    window.addEventListener("portfolio:stack-top-settled", onSettled);
    window.addEventListener("portfolio:static-closed", onClosed);
    window.addEventListener("portfolio:go-home", forgetOrigin);
    return () => {
      stopMotion();
      window.removeEventListener("portfolio:scroll-lock", onLock);
      window.removeEventListener("portfolio:stack-top-settled", onSettled);
      window.removeEventListener("portfolio:static-closed", onClosed);
      window.removeEventListener("portfolio:go-home", forgetOrigin);
      section.inert = false;
    };
  }, []);

  return (
    <section ref={sectionRef} id="building-chaniago-labs" className={styles.section}
      data-home-chapter="LABS" aria-labelledby="cut-title">
      <div className={styles.track} data-cut-track>
        <div className={styles.stage} data-cut-stage>
          <h2 id="cut-title" className={styles.title}>
            <span className={styles.lead} data-cut-lead>Chaniago Labs cuts the busy out of</span>{" "}
            <span className={styles.word} data-cut-word>
              <del className={styles.busy} data-cut-busy>
                <span className={styles.ink}>busy</span>
                <span className={styles.lanes} aria-hidden="true">
                  {EDGES.slice(1).map((edge, lane) => (
                    <span key={lane} className={styles.lane} data-cut-lane
                      style={{ "--lane": lane, "--top": `${EDGES[lane]}em`, "--tall": `${(edge - EDGES[lane]).toFixed(3)}em` } as CSSProperties}>
                      <span>busy</span>
                    </span>
                  ))}
                </span>
              </del>
              <span className={styles.work} data-cut-work>work.</span>
            </span>
          </h2>
          <div className={styles.foot} data-cut-foot>
            <p className={styles.statement}>
              {statement.split(" ").map((token, index) => (
                <span key={index} data-cut-token>{token} </span>
              ))}
            </p>
            <a ref={linkRef} className={styles.contact} data-cut-contact href={sectionHref("contact")}
              onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                openedContact.current = true;
                window.dispatchEvent(new CustomEvent("portfolio:request-section", { detail: { section: "contact" } }));
              }}>
              <span>Show me your busywork</span>{"\u00a0"}<ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
        <span id="labs-blueprint" className={styles.proofRun} data-cut-proof-run aria-hidden="true" />
      </div>
      <LabsDispatch />
      <div id="labs-handoff" className={styles.coverRun} aria-hidden="true" />
    </section>
  );
}
