import { useRef, useState, type MouseEventHandler } from "react";
import Image from "next/image";
import Link from "next/link";
import type { RetailProject } from "@/lib/projects";
import { projectPosters } from "@/lib/projectPosters";
import { PassCounter, SpinCounter } from "./RetailCounter";
import styles from "./RetailStudy.module.css";

function ProductProof({ project }: { project: RetailProject }) {
  const [frame, setFrame] = useState(0);
  const { retail } = project;
  const shot = retail.screenshots[frame];
  const portrait = shot.width < shot.height;
  return (
    <figure className={styles.proof} data-case-hero>
      <div className={styles.mount}>
        <div className={styles.folio}>
          <span>{shot.sample ? "Product UI / Demo data" : "Live site capture"}</span><span>Fig. {projectPosters[project.slug].number}.{frame + 1}</span>
        </div>
        <div className={styles.canvas} data-format={portrait ? "portrait" : "landscape"}>
          {portrait && <div className={styles.impression}>
            <strong>{retail.rule[0]}</strong>
            <span>{retail.rule[1]}</span>
          </div>}
          <Image key={shot.src} className={styles.capture} src={shot.src} alt={shot.alt}
            width={shot.width} height={shot.height}
            unoptimized loading="eager" fetchPriority="high" />
        </div>
        <div className={styles.folio}><span>{shot.label}</span><span>{frame + 1} / {retail.screenshots.length}</span></div>
      </div>
      <figcaption className={styles.proofTools}>
        <div className={styles.switch} role="group" aria-label="Choose product screenshot">
          {retail.screenshots.map((screen, index) => (
            <button type="button" key={screen.src} aria-pressed={frame === index} onClick={() => setFrame(index)}>
              {screen.label}
            </button>
          ))}
        </div>
        <a className={styles.quiet} href={shot.src} target="_blank" rel="noreferrer"
          aria-label={`Open full-size ${project.title} ${shot.label} screenshot in a new tab`}>Full size <span aria-hidden="true">↗</span></a>
      </figcaption>
    </figure>
  );
}

export function RetailStudy({ project, onContact }: {
  project: RetailProject;
  onContact: MouseEventHandler<HTMLAnchorElement>;
}) {
  const sample = useRef<HTMLElement>(null);
  const spin = project.visualKind === "wheel";
  const { retail } = project;
  const openSample = () => {
    const section = sample.current;
    if (!section) return;
    section.focus({ preventScroll: true });
    section.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <div className={styles.edition} data-edition={spin ? "spin" : "vip"}>
      <div className={styles.cover}>
        <header className={styles.lead}>
          <h2 className={styles.headline} data-case-hero>
            {retail.headline[0]} <em>{retail.headline[1]}</em>
          </h2>
          <p className={styles.standfirst} data-case-hero>{project.summary}</p>
          <div className={styles.actions} data-case-hero>
            <button type="button" className={styles.action} onClick={openSample}>{project.workflowHeading}<span aria-hidden="true">↓</span></button>
            <a className={styles.quiet} href={retail.liveUrl} target="_blank" rel="noreferrer">
              {spin ? "Live campaign" : "Live member access"} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </header>
        <ProductProof project={project} />
      </div>

      <div className={styles.spread}>
        <section className={styles.brief} data-case-reveal>
          <p className={styles.kicker}>The brief</p>
          <h2>{retail.briefTitle}</h2>
          <p className={styles.prose}>{retail.brief}</p>
          <p className={styles.dateline}>{retail.dateline}</p>
        </section>
        <section ref={sample} className={styles.sample} tabIndex={-1} aria-labelledby="sample-title" data-case-reveal>
          <div className={styles.folio}><span>Interactive sample</span><span>Local only</span></div>
          <h2 id="sample-title">{spin ? "Follow one voucher." : "Count a return visit."}</h2>
          {spin ? <SpinCounter /> : <PassCounter />}
          <p className={styles.disclaimer}>{spin ? "Illustration only. No registration or real voucher." : "Illustration only. No account or real redemption."}</p>
        </section>
      </div>

      <section className={styles.notes} aria-labelledby="notes-title" data-case-reveal>
        <div>
          <p className={styles.kicker}>Field notes</p>
          <h2 id="notes-title">{spin ? "Designing for the queue." : "Designing for the return."}</h2>
        </div>
        <ol>{project.workflow.map((item, index) => <li key={item.step}>
          <span aria-hidden="true" className={styles.noteIndex}>0{index + 1}</span>
          <div><h3>{item.step}</h3><p>{item.description}</p></div>
        </li>)}</ol>
      </section>

      <details className={styles.delivery}>
        <summary>Delivery & technology <span aria-hidden="true" /></summary>
        <div className={styles.deliveryBody}>
          <div><h3>What was built</h3><ul>{project.deliverables.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div><h3>Built with</h3><p>{project.stack.join(" / ")}</p>
            {project.repository && <a className={styles.quiet} href={project.repository} target="_blank" rel="noreferrer">View public source ↗</a>}
          </div>
        </div>
      </details>

      <aside className={styles.invite} data-case-reveal>
        <h2>{retail.invitation}</h2>
        <Link className={styles.action} href="/?section=contact" onClick={onContact}>
          {spin ? "Discuss your launch" : "Discuss your membership idea"} <span aria-hidden="true">↗</span>
        </Link>
      </aside>
    </div>
  );
}
