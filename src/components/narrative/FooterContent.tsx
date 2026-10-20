"use client";

import { useState, useRef } from "react";
import styles from "./FooterContent.module.css";
import { ArrowUpRight, Check, Copy } from "lucide-react";

const pages = [
  { label: "Project", section: "project", href: "#projects-layer" },
  { label: "About", section: "about", href: "#about" },
  { label: "Contact", section: "contact", href: "#contact" },
];

const connections = [
  { label: "Email", href: "mailto:hello@chaniago.me" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/justchaniago/" },
  { label: "GitHub", href: "https://github.com/Justchaniago" },
];

export function FooterContent() {
  const [copied, setCopied] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("hello@chaniago.me");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = "mailto:hello@chaniago.me";
    }
  };

  const handleMagneticMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse" || !ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.22;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.28;
    ctaRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
  };

  const handleMagneticLeave = () => {
    if (!ctaRef.current) return;
    ctaRef.current.style.removeProperty("transform");
  };

  return (
    <div className={styles.content}>
      <div className={styles.columns}>
        <div className={styles.invitationBlock}>
          <h2 className={styles.invitation}>Let’s make<br />something matter.</h2>
          <div className={styles.ctaRow}>
            <button
              ref={ctaRef}
              type="button"
              className={styles.magneticCta}
              onPointerMove={handleMagneticMove}
              onPointerLeave={handleMagneticLeave}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("portfolio:request-section", {
                  detail: { section: "contact" },
                }));
              }}
            >
              <span>Start a conversation</span>
              <ArrowUpRight className={styles.ctaIcon} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.copyEmailBtn}
              onClick={handleCopyEmail}
              aria-label="Copy email address hello@chaniago.me"
            >
              {copied ? <Check className={styles.copyIcon} aria-hidden="true" /> : <Copy className={styles.copyIcon} aria-hidden="true" />}
              <span>{copied ? "Copied to clipboard" : "hello@chaniago.me"}</span>
            </button>
          </div>
        </div>
        <nav className={styles.group} aria-label="Footer navigation">
          <p className={styles.label}>Explore</p>
          {pages.map(page => (
            <a key={page.section} className={styles.link} href={page.href}
              onClick={event => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("portfolio:request-section", {
                  detail: { section: page.section },
                }));
              }}>
              <span>{page.label}</span><ArrowUpRight className={styles.arrow} aria-hidden="true" focusable="false" />
            </a>
          ))}
        </nav>
        <nav className={styles.group} aria-label="Connect with Chaniago">
          <p className={styles.label}>Connect</p>
          {connections.map(connection => (
            <a key={connection.label} className={styles.link} href={connection.href}
              target={connection.href.startsWith("https:") ? "_blank" : undefined}
              rel={connection.href.startsWith("https:") ? "noopener noreferrer" : undefined}>
              <span>{connection.label}</span><ArrowUpRight className={styles.arrow} aria-hidden="true" focusable="false" />
            </a>
          ))}
        </nav>
      </div>
      <p className={styles.copyright}>© 2026 Chaniago</p>
    </div>
  );
}
