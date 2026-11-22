"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { animateFieldwork } from "./animateFieldwork";
import styles from "./Fieldwork.module.css";

export function Fieldwork() {
  const reader = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reader.current) return animateFieldwork(reader.current);
  }, []);

  return (
    <main ref={reader} className={styles.reader} aria-label="Chaniago Labs: how I work" tabIndex={0}>
      <div data-track="" className={styles.track}>
        <div data-stage="" className={styles.stage}>
          <div data-field="" className={styles.field} aria-hidden="true" />
          <div className={styles.pin} aria-hidden="true"><span>Surabaya, ID</span></div>
          <section className={styles.opening} aria-labelledby="fieldwork-title">
            <p className={styles.folio}>Chaniago Labs <span>/</span> Field notes</p>
            <h1 id="fieldwork-title" className={styles.title}>
              <span>Show me how</span>{" "}<span>you do it <em>today.</em></span>
            </h1>
            <p className={styles.intro}>
              At Chaniago Labs, I use AI to turn an early idea into something you can try.
              Then we put it in the hands of someone who’ll actually use it, with a task they know by heart.
            </p>
          </section>
          <section className={styles.answer} aria-labelledby="fieldwork-question">
            <h2 id="fieldwork-question" data-question="" className={styles.question}>What got easier?</h2>
            <p className={styles.check}>Where did they pause? What still took two steps instead of one?</p>
            <p className={styles.decision}>That’s how I decide what to fix before I ship.</p>
            <Link className={styles.link} data-work="" href="/?section=project" prefetch={false}>
              See selected work <span aria-hidden="true">↗</span>
            </Link>
          </section>
          <div aria-hidden="true" className={styles.guide}><i /><span>Scroll</span></div>
        </div>
      </div>
      <section className={styles.closing} aria-labelledby="fieldwork-invite">
        <h2 id="fieldwork-invite">Have an idea?<br />
          <Link href="/?section=contact" prefetch={false}>Let’s make it real.</Link>
        </h2>
      </section>
    </main>
  );
}
