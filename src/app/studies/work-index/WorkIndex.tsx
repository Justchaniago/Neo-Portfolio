"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NeoAvoCapture } from "@/components/projects/NeoAvoCapture";
import { ProjectVisualStage } from "@/components/projects/ProjectVisualStage";
import { getProjectBySlug } from "@/lib/projects";
import { KineticIndex } from "./KineticIndex";
import s from "./WorkIndex.module.css";

function Lettering({ slug, title }: { slug: string; title: string }) {
  return <span className={s.lettering} style={{ viewTransitionName: `work-${slug}` }}>
    {slug === "gong-cha-workspace" ? <>Gong Cha<br />Workspace</> : title}
  </span>;
}

export function WorkIndex({ impression = false }: { impression?: boolean }) {
  const [slug, setSlug] = useState("");
  const reader = useRef<HTMLElement>(null);
  const returnY = useRef(0);
  const selected = getProjectBySlug(slug)?.project;

  useEffect(() => {
    let current = "";
    const sync = (initial: boolean) => {
      const key = location.hash.slice(1);
      const next = getProjectBySlug(key) ? key : "";
      if (next === current) return;
      const previous = current;
      current = next;
      if (!previous) returnY.current = reader.current?.scrollTop ?? 0;
      const show = () => {
        flushSync(() => setSlug(next));
        if (!reader.current) return;
        if (next) reader.current.scrollTop = 0;
        const focus = next ? reader.current.querySelector("h1") : reader.current.querySelector<HTMLElement>(`a[href="#${previous}"]`);
        if (!initial) focus?.focus({ preventScroll: true });
      };
      if (!initial && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.startViewTransition(show);
      } else show();
    };
    const change = () => sync(false);
    const first = requestAnimationFrame(() => sync(true));
    window.addEventListener("hashchange", change);
    return () => { cancelAnimationFrame(first); window.removeEventListener("hashchange", change); };
  }, []);

  return <main className={s.reader} ref={reader}>
    {selected ? <div className={s.sheet}>
      <div className={s.colophon}>
        <a href="#work">← Selected work</a>
        <span>Chaniago Labs</span>
      </div>
      <article className={s.detail}>
        <h1 tabIndex={-1}><Lettering slug={slug} title={selected.title} /></h1>
        <div className={s.proof}>
          <div style={{viewTransitionName:`proof-${slug}`}}>
          {selected.retail ? <figure className={s.retail} style={{ background: selected.accentSoft }}>
            <Image src={selected.retail.screenshots[0].src} alt={selected.retail.screenshots[0].alt}
              width={selected.retail.screenshots[0].width} height={selected.retail.screenshots[0].height} unoptimized />
            <figcaption>{selected.retail.screenshots[0].label} / Demo data</figcaption>
          </figure> : selected.visualKind === "incident" ? <NeoAvoCapture screen="incidents" /> : <ProjectVisualStage project={selected} />}
          </div>
          <div className={s.note}>
            <p>{selected.summary}</p>
            <a href={`/projects/${slug}`}>Full case study <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </article>
    </div> : <KineticIndex returnY={returnY} impression={impression} />}
  </main>;
}
