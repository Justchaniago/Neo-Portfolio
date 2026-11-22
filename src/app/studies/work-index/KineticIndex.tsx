"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import Lenis from "lenis";
import { PROJECTS } from "@/lib/projects";
import { projectPosters } from "@/lib/projectPosters";
import s from "./Press.module.css";

const acts = [
  { slug: "gong-cha-vip", a: "30", b: "29", aside: ["cups left."], before: "A member walks in with thirty cups on one pass.", after: "One scan records today's cup. The same pass is ready for tomorrow.", paper: "#d8e6bf", ink: "#1b291a", print: "#964632" },
  { slug: "gong-cha-spin", a: "Spin", b: "Sip", aside: ["the wheel.", "your tea."], before: "A guest scans a flyer at the Central Park opening.", after: "The wheel stops. A voucher takes the prize from phone to counter.", paper: "#9e2531", ink: "#fff2db", print: "#ffce8a" },
  { slug: "neo-avo", a: "Due", b: "Late", aside: ["no error.", "one incident."], before: "The report is due. No error arrives. Neither does the report.", after: "The missed run opens an incident. Now an operator has something to act on.", paper: "#191f27", ink: "#e3eff4", print: "#e7ad67" },
  { slug: "vimax", a: "Script", b: "Shots", aside: ["on paper.", "in order."], before: "A written scene isn't a sequence you can review.", after: "The script becomes a storyboard, then a sequence of shots.", paper: "#f3d8be", ink: "#34251d", print: "#8c331c" },
  { slug: "gong-cha-workspace", a: "App", b: "Store", aside: ["in hand.", "in sync."], before: "A member sees an app. The store team sees a different screen.", after: "Between them sits a service layer. Workspace maps who owns each part.", paper: "#dee1ed", ink: "#222436", print: "#58448d" },
].map(a => { const p = PROJECTS.find(p => p.slug === a.slug)!; return { ...a, title: p.title, category: p.category, focus: p.focus }; });
const short = ["VIP", "Spin", "Neo-AVO", "ViMax", "Workspace"];

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => { const t = clamp(n); return t*t*(3-2*t); };
let firstPeekConsumed = false;

export function KineticIndex({ returnY, impression = false }: { returnY: RefObject<number>; impression?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const step = useRef(1);
  const motor = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const root = track.current?.closest<HTMLElement>("[data-work-reader]");
    const second = root?.querySelector<HTMLElement>('[data-kind="gong-cha-spin"]');
    if (!impression || !root || !second || firstPeekConsumed || returnY.current !== 0) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    const layer = root.closest("#projects-layer");
    let timer: number | undefined;
    const arm = () => {
      clearTimeout(timer);
      if (firstPeekConsumed || document.hidden || (layer && Number(document.documentElement.dataset.projectsProgress) < .999)) return;
      timer = window.setTimeout(() => {
        if (root.scrollTop || document.hidden || root.closest("[inert]") ||
          (layer && document.documentElement.dataset.projectsActive !== "true")) return;
        firstPeekConsumed = true;
        second.dataset.peek = "";
        second.hidden = false;
      }, 4000);
    };
    arm();
    window.addEventListener("portfolio:stack-top-settled", arm);
    document.addEventListener("visibilitychange", arm);
    const stop = () => {
      clearTimeout(timer);
      if (second.hasAttribute("data-peek")) { second.hidden = true; delete second.dataset.peek; }
    };
    const dismiss = () => { firstPeekConsumed = true; stop(); };
    const events = ["wheel", "touchstart", "pointerdown", "scroll"] as const;
    events.forEach(type => root.addEventListener(type, dismiss, { passive: true }));
    window.addEventListener("keydown", dismiss);
    reduce.addEventListener("change", dismiss);
    second.addEventListener("animationend", stop);
    return () => {
      stop(); events.forEach(type => root.removeEventListener(type, dismiss));
      window.removeEventListener("keydown", dismiss); reduce.removeEventListener("change", dismiss);
      second.removeEventListener("animationend", stop);
      window.removeEventListener("portfolio:stack-top-settled", arm);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [impression, returnY]);

  useLayoutEffect(() => {
    const strip = track.current, root = strip?.closest<HTMLElement>("[data-work-reader]");
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
        if (sheet.hasAttribute("data-peek") && pos === 0) return;
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
      if (!lenis || root.closest("[inert]") || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey ||
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
        inert={active!==i} aria-hidden={active!==i} style={(impression ? {"--paper":projectPosters[a.slug].paper,"--ink":projectPosters[a.slug].ink,"--print":i===4?"#ffb37a":"#c4551b"}
          : {"--paper":a.paper,"--ink":a.ink,"--print":a.print}) as CSSProperties}>
        <div className={s.print}>
          <div className={s.folio}>
            {impression && <span data-entry-rule="" aria-hidden="true" />}
            <span>Chaniago Labs <i>/</i> {impression ? "Projects" : "Five working stories"}</span>
            <span>0{i+1} <i>/</i> 05</span>
          </div>
          <header data-head="">
            <h2 className={s.byline}><a href={`#${a.slug}`}>{a.title}</a></h2>
            {impression && <p data-meta="">{a.category} · {a.focus}</p>}
          </header>
          {impression && <p className="sr-only">{projectPosters[a.slug].decision}</p>}
          <div className={s.bill} data-bill="" aria-hidden="true">
            <div className={s.slot} data-slot="">
              {[a.a,a.b].map((word,k) => <span key={word} className={s.word} data-after={k===1}>
                {Array.from(word,(letter,j)=><b key={j} style={{"--order":j/(word.length-1||1)} as CSSProperties}>{letter}</b>)}
              </span>)}
            </div>
            <em>{impression ? <span data-decision="">{projectPosters[a.slug].decision}</span> : a.aside.map(text=><span key={text}>{text}</span>)}</em>
          </div>
          <div className={s.baseline} data-rule="" aria-hidden="true"><i /></div>
          <div className={s.legend}><div className={s.lines}>
            <p>{a.before}</p><p>{a.after}</p>
          </div><a className={s.open} data-open="" href={`#${a.slug}`}>{impression ? "View project" : "Open study"} <span aria-hidden="true">↗</span></a></div>
        </div>
      </article>)}
      <nav className={s.transport} style={impression ? {zIndex:2} : undefined} aria-label="Jump to project">
        {acts.map((a,i)=><button key={a.slug} type="button" aria-label={`Jump to ${a.title}`} aria-current={active===i?"step":undefined}
          onClick={()=>{
            const target = step.current*i;
            if (motor.current) motor.current.scrollTo(target, { duration: .95, easing: ease });
            else track.current?.closest("[data-work-reader]")?.scrollTo({top:target,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
          }}><span data-num="">0{i+1}</span>{impression && <span data-short="">{short[i]}</span>}</button>)}
      </nav>
    </section>
  </div>;
}
