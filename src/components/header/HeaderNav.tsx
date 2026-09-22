"use client";

import { useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import gsap from "gsap";
import styles from "./HeaderLogo.module.css";

const ITEMS = [
  { label: "project", href: "#projects-layer" },
  { label: "about", href: "#about" },
  { label: "contact", href: "#contact" },
];

export function HeaderNav() {
  const links = useRef<Array<HTMLAnchorElement | null>>([]);

  const move = (index: number, event: PointerEvent<HTMLAnchorElement>) => {
    const link = links.current[index];
    if (!link || event.pointerType === "touch") return;
    const bounds = link.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
    gsap.to(link, { x, y, duration: 0.36, ease: "power3.out", overwrite: true });
  };

  const reset = (index: number) => {
    const link = links.current[index];
    if (link) gsap.to(link, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.55)", overwrite: true });
  };

  return <nav className={styles.nav} aria-label="Main navigation">
    {ITEMS.map((item, index) => (
      <a
        key={item.label}
        ref={(element) => { links.current[index] = element; }}
        className={styles.navLink}
        href={item.href}
        data-project-link={item.label === "project" ? "true" : undefined}
        onClick={(event) => {
          if (item.label !== "project") return;
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("portfolio:toggle-projects"));
        }}
        onPointerMove={(event) => move(index, event)}
        onPointerLeave={() => reset(index)}
      >
        {Array.from(item.label, (character, characterIndex) => <span className={styles.navChar} style={{ "--char-index": characterIndex } as CSSProperties} key={`${character}-${characterIndex}`}>{character}</span>)}
      </a>
    ))}
  </nav>;
}
