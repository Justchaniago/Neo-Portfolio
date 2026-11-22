"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { animateMoreRoom } from "./animateMoreRoom";
import styles from "./MoreRoom.module.css";

export function MoreRoom() {
  const reader = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reader.current) return animateMoreRoom(reader.current);
  }, []);

  return (
    <main ref={reader} className={styles.reader} aria-label="Chaniago Labs: how AI is used" tabIndex={0}>
      <section data-track="" className={styles.track} aria-labelledby="more-room-title">
        <div data-stage="" className={styles.stage}>
          <div data-field="" className={styles.field} aria-hidden="true" />
          <i className={styles.pin} aria-hidden="true" />
          <span className={styles.origin} aria-hidden="true">Surabaya, ID</span>
          <div data-copy="" className={styles.copy}>
            <h1 id="more-room-title" data-title="" className={styles.title}>
              <span className={styles.row}>
                <span>More room </span>
                <span>for the work</span>
              </span>{" "}
              <span className={styles.row}>
                <i data-baseline="" className={styles.mark} aria-hidden="true" />
                that matters<span data-period="" className={styles.period}>.</span>
              </span>
            </h1>
            <div className={styles.body}>
              <p>
                At Chaniago Labs, AI gets a working version built early, so you can try it instead of
                imagining it. The time that saves goes into the parts I won’t hand off: testing it with the
                people who’ll use it, and fixing what breaks before it ships.
              </p>
              <Link className={styles.link} data-work="" href="/?section=project" prefetch={false}>
                See selected work <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.closing} aria-labelledby="more-room-invite">
        <h2 id="more-room-invite">
          Have an idea?
          <br />
          <Link href="/?section=contact" prefetch={false}>
            Let’s make it real.
          </Link>
        </h2>
      </section>
    </main>
  );
}
