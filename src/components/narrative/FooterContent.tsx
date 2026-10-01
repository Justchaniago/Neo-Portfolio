import styles from "./FooterContent.module.css";
import { ArrowUpRight } from "lucide-react";

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
  return (
    <div className={styles.content}>
      <div className={styles.columns}>
        <h2 className={styles.invitation}>Let’s make<br />something matter.</h2>
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
