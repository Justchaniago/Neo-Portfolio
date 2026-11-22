"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Lenis from "lenis";
import { PROJECT_COUNT, type ProjectItem } from "@/lib/projects";
import { getPerformanceProfile } from "@/lib/performanceTier";
import { pageMotion } from "@/lib/pageMotion";
import { triggerRouteTransition } from "./ProjectTransition";
import { ProjectVisualStage } from "./ProjectVisualStage";
import { NeoAvoCapture } from "./NeoAvoCapture";
import { RetailStudy } from "./RetailStudy";
import { ProjectImprint } from "./ProjectImprint";
import styles from "../../app/projects/[slug]/ProjectPage.module.css";

type Props = {
  project: ProjectItem;
  prevProject: ProjectItem;
  nextProject: ProjectItem;
};

export function ProjectCaseStudy({ project, prevProject, nextProject }: Props) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const backHref = `/projects#${project.slug}`;
  const prevHref = `/projects/${prevProject.slug}`;
  const nextHref = `/projects/${nextProject.slug}`;

  const goWithTransition = useCallback(
    (href: string, label: string, accent: string, event?: MouseEvent<HTMLAnchorElement>) => {
      if (event) {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
      }
      triggerRouteTransition({
        href,
        label,
        accent,
        navigate: () => router.push(href),
      });
    },
    [router],
  );

  // Smooth scroll (Lenis on high/medium tier), scroll-lock integration, & top reading progress bar
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const progressEl = progressRef.current;
    if (!scroller || !content) return;

    scroller.scrollTop = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const perf = getPerformanceProfile();
    const scrollLocks = new Set<string>();
    let maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    let lastProgress = -1;
    let frame = 0;
    let lenis: Lenis | null = null;

    const syncScroll = (scrollTop: number) => {
      const clamped = Math.max(0, scrollTop);
      const progress = Math.min(1, clamped / maxScroll);
      if (Math.abs(progress - lastProgress) > 0.001) {
        lastProgress = progress;
        if (progressEl) {
          progressEl.style.transform = `scaleX(${progress.toFixed(4)})`;
        }
      }
      if (!reduced.matches && perf.tier !== "low" && clamped < 900) {
        content.style.setProperty("--hero-stage-shift", `${(clamped * 0.065).toFixed(1)}px`);
      }
    };

    const startRaf = () => {
      if (frame || !lenis || reduced.matches || document.hidden || scrollLocks.size > 0) return;
      const tick = (time: number) => {
        frame = 0;
        if (!lenis || document.hidden || scrollLocks.size > 0) return;
        lenis.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const stopRaf = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onScrollLock = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; locked?: boolean }>).detail;
      if (!detail?.source) return;
      if (detail.locked) scrollLocks.add(detail.source);
      else scrollLocks.delete(detail.source);

      if (scrollLocks.size > 0) {
        scroller.style.overflowY = "hidden";
        lenis?.stop();
        stopRaf();
      } else {
        scroller.style.removeProperty("overflow-y");
        lenis?.start();
        startRaf();
      }
    };

    const measure = () => {
      maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      lastProgress = -1;
      syncScroll(scroller.scrollTop);
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(scroller);
    resizeObserver.observe(content);
    window.addEventListener("portfolio:scroll-lock", onScrollLock);
    measure();

    if (reduced.matches || perf.tier === "low") {
      const onNativeScroll = () => syncScroll(scroller.scrollTop);
      scroller.addEventListener("scroll", onNativeScroll, { passive: true });
      return () => {
        window.removeEventListener("portfolio:scroll-lock", onScrollLock);
        scroller.removeEventListener("scroll", onNativeScroll);
        scroller.style.removeProperty("overflow-y");
        resizeObserver.disconnect();
      };
    }

    lenis = new Lenis({
      wrapper: scroller,
      content,
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.09,
    });
    const onLenis = (instance: Lenis) => syncScroll(instance.scroll);
    lenis.on("scroll", onLenis);

    const onVisibility = () => {
      if (document.hidden) stopRaf();
      else startRaf();
    };
    document.addEventListener("visibilitychange", onVisibility);
    startRaf();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("portfolio:scroll-lock", onScrollLock);
      scroller.style.removeProperty("overflow-y");
      resizeObserver.disconnect();
      lenis?.off("scroll", onLenis);
      lenis?.destroy();
      lenis = null;
      stopRaf();
    };
  }, [project.slug]);

  // Coordinated hero entrance, scroll-reveal observer, route-exit animation, and Escape shortcut
  useLayoutEffect(() => {
    const content = contentRef.current;
    const titleEl = titleRef.current;
    if (!content) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowTier = getPerformanceProfile().tier === "low";
    const heroParts = content.querySelectorAll<HTMLElement>("[data-case-hero]");
    const revealBlocks = Array.from(content.querySelectorAll<HTMLElement>("[data-case-reveal]"));

    let entranceTl: gsap.core.Timeline | null = null;
    let splashObserver: MutationObserver | null = null;

    const playEntrance = () => {
      if (reduced) {
        gsap.set(heroParts, { clearProps: "all" });
        if (titleEl) titleEl.style.fontVariationSettings = '"wdth" 100';
        return;
      }
      entranceTl?.kill();
      entranceTl = gsap.timeline();
      entranceTl.fromTo(
        heroParts,
        { autoAlpha: 0, y: pageMotion.lift },
        {
          autoAlpha: 1,
          y: 0,
          duration: pageMotion.content,
          stagger: pageMotion.stagger,
          ease: pageMotion.ease,
          clearProps: "transform",
        },
        0,
      );
      if (titleEl && !lowTier) {
        entranceTl.fromTo(
          titleEl,
          { fontVariationSettings: '"wdth" 62' },
          { fontVariationSettings: '"wdth" 100', duration: 0.86, ease: "expo.out" },
          0.04,
        );
      } else if (titleEl) {
        titleEl.style.fontVariationSettings = '"wdth" 100';
      }
    };

    if (!reduced) {
      gsap.set(heroParts, { autoAlpha: 0, y: pageMotion.lift });
    }

    const enterWhenUncovered = () => {
      if (document.documentElement.dataset.routeTransitioning === "waiting") {
        window.addEventListener("portfolio:route-enter", playEntrance, { once: true });
      } else {
        playEntrance();
      }
    };
    if (document.documentElement.dataset.splashComplete === "true") {
      enterWhenUncovered();
    } else {
      splashObserver = new MutationObserver(() => {
        if (document.documentElement.dataset.splashComplete === "true") {
          splashObserver?.disconnect();
          splashObserver = null;
          enterWhenUncovered();
        }
      });
      splashObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-splash-complete"],
      });
    }

    let io: IntersectionObserver | null = null;
    if (reduced) {
      revealBlocks.forEach((el) => {
        el.dataset.revealed = "true";
      });
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            el.dataset.revealed = "true";
            io?.unobserve(el);
          });
        },
        { root: scrollerRef.current, threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
      revealBlocks.forEach((el) => io?.observe(el));
    }

    let exit: gsap.core.Tween | undefined;
    const resetExit = () => exit?.revert();
    const onRouteExit = () => {
      if (reduced || !scrollerRef.current) return;
      exit = gsap.to(scrollerRef.current, {
        y: -22,
        opacity: 0.32,
        duration: pageMotion.cover,
        ease: "power2.in",
        overwrite: true,
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const pageWrap = document.querySelector<HTMLElement>("[data-page-content]");
      if (pageWrap?.inert || document.querySelector("[role='dialog']")) return;
      event.preventDefault();
      goWithTransition(backHref, "INDEX / PROJECTS", project.accent);
    };

    window.addEventListener("portfolio:route-exit", onRouteExit);
    window.addEventListener("portfolio:route-enter", resetExit);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      splashObserver?.disconnect();
      window.removeEventListener("portfolio:route-enter", playEntrance);
      resetExit();
      entranceTl?.kill();
      io?.disconnect();
      window.removeEventListener("portfolio:route-exit", onRouteExit);
      window.removeEventListener("portfolio:route-enter", resetExit);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [backHref, goWithTransition, project.accent, project.slug]);

  const accentStyle = {
    "--project-accent": project.accent,
    "--project-accent-soft": project.accentSoft,
    "--next-accent": nextProject.accent,
  } as CSSProperties;

  return (
    <main ref={scrollerRef} className={styles.page} style={accentStyle}
      data-project-case-study={project.slug} data-retail-edition={project.retail ? true : undefined}>
      <div className={styles.progressTrack} aria-hidden="true">
        <div ref={progressRef} className={styles.progressBar} />
      </div>

      <div ref={contentRef} className={styles.scrollContent}>
        <article className={styles.caseStudy}>
          <div className={styles.topBar} data-case-hero>
            <Link
              href={backHref}
              className={styles.backPill}
              data-cursor="rail"
              data-cursor-label="INDEX ↩"
              onClick={(e) => goWithTransition(backHref, "INDEX / PROJECTS", project.accent, e)}
            >
              <span className={styles.backArrow} aria-hidden="true">←</span>
              <span>All projects</span>
              <kbd className={styles.escHint} aria-hidden="true">ESC</kbd>
            </Link>

            <div className={styles.switcher} aria-label="Switch project">
              <Link
                href={prevHref}
                className={styles.switchBtn}
                aria-label={`Previous project: ${prevProject.title}`}
                onClick={(e) => goWithTransition(prevHref, `${prevProject.number} — ${prevProject.title}`, prevProject.accent, e)}
              >
                ←
              </Link>
              <span className={styles.switchCounter}>{project.number} / {PROJECT_COUNT}</span>
              <Link
                href={nextHref}
                className={styles.switchBtn}
                aria-label={`Next project: ${nextProject.title}`}
                onClick={(e) => goWithTransition(nextHref, `${nextProject.number} — ${nextProject.title}`, nextProject.accent, e)}
              >
                →
              </Link>
            </div>
          </div>

          {project.retail ? (
            <RetailStudy project={project} titleRef={titleRef}
              onContact={event => goWithTransition("/?section=contact", "03 — CONTACT", project.accent, event)} />
          ) : <>
          <div className={styles.opener}>
            <header className={styles.hero}>
              <div className={styles.eyebrowRow} data-case-hero>
                <span className={styles.signalDot} aria-hidden="true" />
                <span>CASE STUDY {project.number}</span>
                <span className={styles.sep} aria-hidden="true">·</span>
                <span>{project.focus}</span>
              </div>

              <div className={styles.titleMask} data-case-hero>
                <h1 ref={titleRef} className={styles.title}>{project.title}</h1>
              </div>

              <p className={styles.summary} data-case-hero>{project.summary}</p>
            </header>

            {project.visualKind === "incident" ? <NeoAvoCapture screen="overview" /> : <figure className={styles.coverWrap} data-case-hero>
              <ProjectVisualStage project={project} variant="hero" />
              <figcaption className={styles.coverCaption}>
                <span>Plate {project.number} / {project.deliverables[0]}</span>
                <ProjectImprint kind={project.visualKind} />
              </figcaption>
            </figure>}
          </div>

          <dl className={styles.meta} data-case-hero data-has-year={project.year ? "true" : undefined}>
            <div>
              <dt>Product</dt>
              <dd>{project.product}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{project.focus}</dd>
            </div>
            {project.year && <div>
              <dt>Year</dt>
              <dd>{project.year}</dd>
            </div>}
            <div>
              <dt>Stack</dt>
              <dd className={styles.stack}>{project.stack.join(" · ")}</dd>
            </div>
          </dl>

          <section
            className={styles.workflowSection}
            data-case-reveal
            aria-label={project.workflowHeading}
          >
            <h2 className={styles.workflowHeading}>{project.workflowHeading}</h2>
            {project.workflow.map((item, index) => (
              <div key={item.step} className={styles.workflowCard}>
                <span className={styles.workflowIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.workflowStep}>{item.step}</span>
                <span className={styles.workflowDescription}>{item.description}</span>
              </div>
            ))}
          </section>

          {project.visualKind === "incident" && <NeoAvoCapture screen="incidents" />}
          <section className={styles.chapters} aria-label="Case study narrative">
            {project.chapters.map((chapter) => (
              <div key={chapter.index} className={styles.chapterRow} data-case-reveal>
                <div className={styles.chapterMeta}>
                  <span className={styles.chapterIndex}>{chapter.index}</span>
                  <h2 className={styles.chapterHeading}>{chapter.heading}</h2>
                </div>
                <p className={styles.chapterBody}>{chapter.body}</p>
              </div>
            ))}
          </section>

          <section className={styles.gallery} data-case-reveal aria-label={`${project.title} visual details`}>
            {(["detailA", "detailB"] as const).map((variant) => (
              <div key={variant} className={styles.plateWrap}>
                <ProjectVisualStage project={project} variant={variant} />
              </div>
            ))}
          </section>

          <section className={styles.specStrip} data-case-reveal aria-label="Sources, deliverables, and architecture">
            {(project.repository || project.upstream) && <div className={styles.specCol}>
              <h2 className={styles.specHeading}>Source</h2>
              {project.repository && <a className={styles.backPill} href={project.repository} target="_blank" rel="noreferrer">
                {project.visualKind === "film" ? "Project-specific adaptation · Chaniago ↗" : "Public project repository ↗"}
              </a>}
              {project.upstream && <a className={styles.backPill} href={project.upstream} target="_blank" rel="noreferrer">
                Upstream baseline · HKUDS/ViMax ↗
              </a>}
            </div>}
            <div className={styles.specCol}>
              <h2 className={styles.specHeading}>What was built</h2>
              <ul className={styles.specList}>
                {project.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className={styles.specCol}>
              <h2 className={styles.specHeading}>Core stack</h2>
              <ul className={styles.specList}>
                {project.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
          </>}
        </article>

        <footer className={styles.nextPortal} data-case-reveal aria-label="Next case study">
          <div className={styles.nextInner}>
            <div className={styles.nextTopRow}>
              <span className={styles.nextEyebrow}>
                <span className={styles.nextDot} aria-hidden="true" />
                <span>NEXT CASE STUDY · {nextProject.number} / {PROJECT_COUNT}</span>
              </span>
              <span className={styles.nextMeta}>{nextProject.category}{nextProject.year ? ` · ${nextProject.year}` : ""}</span>
            </div>

            <Link
              href={nextHref}
              className={styles.nextHeroLink}
              data-cursor="rail"
              data-cursor-label="NEXT ↗"
              onClick={(e) => goWithTransition(nextHref, `${nextProject.number} — ${nextProject.title}`, nextProject.accent, e)}
            >
              <span className={styles.nextTitle}>{nextProject.title}</span>
              <span className={styles.nextCircle} aria-hidden="true">
                <span className={styles.nextArrow}>↗</span>
              </span>
            </Link>

            <div className={styles.nextBottomRow}>
              <Link
                href={backHref}
                className={styles.allProjectsLink}
                onClick={(e) => goWithTransition(backHref, "INDEX / PROJECTS", project.accent, e)}
              >
                <span aria-hidden="true">←</span>
                <span>Return to project rail</span>
              </Link>
              <span className={styles.nextSummary}>{nextProject.summary}</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
