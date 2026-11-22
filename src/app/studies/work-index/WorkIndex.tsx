"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ProjectCaseStudy } from "@/components/projects/ProjectCaseStudy";
import { getProjectBySlug } from "@/lib/projects";
import { studyNeighbors } from "@/lib/projectPosters";
import { KineticIndex } from "./KineticIndex";
import s from "./WorkIndex.module.css";

export function WorkIndex({ impression = false, embedded = false, initialSlug = "" }: { impression?: boolean; embedded?: boolean; initialSlug?: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const reader = useRef<HTMLElement>(null);
  const returnY = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const selected = getProjectBySlug(slug);
  const navigate = useCallback((next: string) => {
    const host = stage.current, inner = host?.firstElementChild;
    if (!host || !inner || host.hasAttribute("data-draft")) return;
    if (reader.current) returnY.current = reader.current.scrollTop;
    const show = () => {
      flushSync(() => setSlug(next));
      reader.current?.querySelector<HTMLElement>('[data-sheet][aria-hidden=false] h2 a')?.focus({ preventScroll: true });
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return show();
    const paper = () => {
      const face = host.querySelector('[data-sheet][aria-hidden="false"], [data-project-case-study]');
      if (face) host.style.backgroundColor = getComputedStyle(face).backgroundColor;
    };
    // One sequence both ways: the view thins to a line drawing, the next layout is drawn, then inked in.
    const timing = { easing: "cubic-bezier(.4,0,.2,1)", fill: "both" } as const;
    (async () => {
      host.setAttribute("data-draft", "");
      paper();
      const out = inner.animate([{ "--draft": 0, opacity: 1 }, { "--draft": 1, opacity: 1, offset: .68 }, { "--draft": 1, opacity: 0 }], { ...timing, duration: 560 });
      await out.finished.catch(() => {});
      show();
      if (next) paper();
      const back = inner.animate([{ "--draft": 1, opacity: 0 }, { "--draft": 1, opacity: 1, offset: .28 }, { "--draft": 0, opacity: 1 }], { ...timing, duration: 820 });
      out.cancel();
      await back.finished.catch(() => {});
      back.cancel();
      host.removeAttribute("data-draft");
      host.style.backgroundColor = "";
    })();
  }, []);

  const Surface = embedded ? "section" : "main";
  return <div ref={stage} data-draft-stage=""><div>{selected ? <ProjectCaseStudy key={slug} project={selected.project}
    {...studyNeighbors(slug)} onSelect={navigate} /> : <Surface className={s.reader} ref={reader} data-work-reader="" onClick={event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    const next = link && getProjectBySlug(link.hash.slice(1));
    if (!next) return;
    event.preventDefault();
    navigate(next.project.slug);
  }}>
    <KineticIndex returnY={returnY} impression={impression} />
  </Surface>}</div></div>;
}
