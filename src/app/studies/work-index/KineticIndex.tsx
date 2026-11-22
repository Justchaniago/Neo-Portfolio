"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import Lenis from "lenis";
import { PROJECTS } from "@/lib/projects";
import s from "./Press.module.css";

const acts = [
  { slug: "gong-cha-vip", a: "30", b: "29", aside: ["cups left."], before: "A member walks in with thirty cups on one pass.", after: "One scan records today's cup. The same pass is ready for tomorrow.", paper: "#d8e6bf", ink: "#1b291a", print: "#964632" },
  { slug: "gong-cha-spin", a: "Spin", b: "Sip", aside: ["the wheel.", "your tea."], before: "A guest scans a flyer at the Central Park opening.", after: "The wheel stops. A voucher takes the prize from phone to counter.", paper: "#9e2531", ink: "#fff2db", print: "#ffce8a" },
  { slug: "neo-avo", a: "Due", b: "Late", aside: ["no error.", "one incident."], before: "The report is due. No error arrives. Neither does the report.", after: "The missed run opens an incident. Now an operator has something to act on.", paper: "#191f27", ink: "#e3eff4", print: "#e7ad67" },
  { slug: "vimax", a: "Script", b: "Shots", aside: ["on paper.", "in order."], before: "A written scene isn't a sequence you can review.", after: "The script becomes a storyboard, then a sequence of shots.", paper: "#f3d8be", ink: "#34251d", print: "#8c331c" },
  { slug: "gong-cha-workspace", a: "App", b: "Store", aside: ["in hand.", "in sync."], before: "A member sees an app. The store team sees a different screen.", after: "Between them sits a service layer. Workspace maps who owns each part.", paper: "#dee1ed", ink: "#222436", print: "#58448d" },
].map(a => ({ ...a, title: PROJECTS.find(p => p.slug === a.slug)!.title }));

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => { const t = clamp(n); return t*t*(3-2*t); };

export function KineticIndex({ returnY, impression = false }: { returnY: RefObject<number>; impression?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const step = useRef(1);
  const motor = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const strip = track.current, root = strip?.closest("main");
    if (!root || !strip) return;
    const sheets = Array.from(strip.querySelectorAll<HTMLElement>("[data-sheet]"));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0, last = -1;
    const render = () => {
      raf = 0;
      const pos = Math.max(0, root.scrollTop / step.current);
      // A complete sentence, then a sheet change. All poses read the same scroll coordinate.
      const phase = impression ? pos % acts.length : pos;
      const index = Math.min(acts.length-1, Math.floor(phase));
      const time = phase-index;
      const reveal = ease((time-.72)/.28);
      const following = impression ? (index+1) % acts.length : index+1;
      const front = reveal > .52 && following < acts.length ? following : index;
      sheets.forEach((sheet,i) => {
        const next = i === following && reveal > 0;
        sheet.hidden = i !== index && !next;
        if (sheet.hidden) return;
        const t = i === index ? ease((time-.12)/.40) : 0;
        const motion = reduce.matches ? Number(t >= .5) : t;
        sheet.style.setProperty("--beat", String(motion));
        sheet.style.setProperty("--cut", String(next ? (reduce.matches ? Number(front === i) : reveal) : 1));
        sheet.style.setProperty("--recede", String(i === index && !reduce.matches && following<acts.length ? reveal : 0));
        if (impression) {
          sheet.style.zIndex = next ? "1" : "0";
          sheet.style.setProperty("--feed", String(next && !reduce.matches ? 1-reveal : 0));
          sheet.style.setProperty("--read-after", String(Number(motion >= .58)));
        }
      });
      if (last !== front) { last = front; setActive(front); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };
    const size = () => {
      step.current = (strip.offsetHeight-root.clientHeight)/(impression ? acts.length : acts.length-1+.70) || 1;
      render();
    };
    root.scrollTo(0, returnY.current);
    const lenis = impression ? new Lenis({wrapper: root, content: strip, infinite: true,
      syncTouch: true, lerp: .085, autoRaf: true, overscroll: false}) : null;
    motor.current = lenis;
    const key = (event: KeyboardEvent) => {
      if (!lenis || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey ||
        (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,[contenteditable=true],[role=dialog]'))) return;
      const offsets: Record<string, number> = { ArrowDown: 48, ArrowUp: -48, PageDown: root.clientHeight*.88,
        PageUp: -root.clientHeight*.88, " ": root.clientHeight*.88*(event.shiftKey?-1:1) };
      if (!(event.key in offsets)) return;
      event.preventDefault();
      const dest = (lenis.targetScroll + offsets[event.key]) % lenis.limit;
      lenis.scrollTo((dest + lenis.limit) % lenis.limit, { lerp: .12 });
    };
    if (lenis) window.addEventListener("keydown", key);
    size();
    const resize = new ResizeObserver(size);
    resize.observe(root); resize.observe(strip);
    root.addEventListener("scroll", schedule, { passive: true });
    reduce.addEventListener("change", schedule);
    return () => { resize.disconnect(); root.removeEventListener("scroll", schedule); reduce.removeEventListener("change", schedule); cancelAnimationFrame(raf);
      window.removeEventListener("keydown", key); lenis?.destroy(); motor.current = null; };
  }, [returnY, impression]);

  return <div ref={track} className={s.track}>
    <section className={s.stage} aria-label="Five projects in motion">
      <h1 className="sr-only">Selected work by Chaniago</h1>
      {acts.map((a,i) => <article key={a.slug} data-sheet="" data-kind={a.slug} className={s.poster}
        inert={active!==i} aria-hidden={active!==i} style={{"--paper":a.paper,"--ink":a.ink,"--print":a.print} as CSSProperties}>
        <div className={s.print}>
          <div className={s.folio}><span>Chaniago Labs <i>/</i> Five working stories</span><span>0{i+1} <i>/</i> 05</span></div>
          <h2 className={s.byline}><a href={`#${a.slug}`} style={{viewTransitionName:`work-${a.slug}`}}>{a.title}</a></h2>
          <div className={s.bill} aria-hidden="true">
            <div className={s.slot}>
              {[a.a,a.b].map((word,k) => <span key={word} className={s.word} data-after={k===1}>
                {Array.from(word,(letter,j)=><b key={j} style={{"--order":j/(word.length-1||1)} as CSSProperties}>{letter}</b>)}
              </span>)}
            </div>
            <em>{a.aside.map(text=><span key={text}>{text}</span>)}</em>
          </div>
          <div className={s.baseline} data-rule="" aria-hidden="true" style={{viewTransitionName:`proof-${a.slug}`}}><i /></div>
          <div className={s.legend}><div className={s.lines}>
            <p>{a.before}</p><p>{a.after}</p>
          </div><a className={s.open} href={`#${a.slug}`}>Open study <span aria-hidden="true">↗</span></a></div>
        </div>
      </article>)}
      <nav className={s.transport} style={impression ? {zIndex:2} : undefined} aria-label="Jump to project">
        <span>Scroll to read ↓</span>
        {acts.map((a,i)=><button key={a.slug} type="button" aria-label={`Jump to ${a.title}`} aria-current={active===i?"step":undefined}
          onClick={()=>{
            const target = step.current*i;
            if (motor.current) motor.current.scrollTo(target, { duration: .95, easing: ease });
            else track.current?.closest("main")?.scrollTo({top:target,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
          }}>0{i+1}</button>)}
      </nav>
    </section>
  </div>;
}
