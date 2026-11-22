import Image from "next/image";
import styles from "./NeoAvoCapture.module.css";

const captures = {
  overview: {
    title: "Overview",
    alt: "Neo-AVO flags two active incidents for the operator to review.",
    caption: "The console flags two active incidents. The operator can go straight to the attention queue.",
    desktop: [1920, 726], phone: [780, 1058],
  },
  incidents: {
    title: "Incidents",
    alt: "An open, high-severity task failure for the Briefing Agent, with one recorded occurrence.",
    caption: "The queue names the affected agent, groups occurrences and marks the failure as open. Inspect opens the record.",
    desktop: [1640, 519], phone: [780, 707],
  },
} as const;

export function NeoAvoCapture({ screen }: { screen: keyof typeof captures }) {
  const capture = captures[screen];
  const src = `/projects/neo-avo/${screen}`;
  const hero = screen === "overview";
  return (
    <figure className={styles.figure} data-case-hero={hero || undefined}>
      <div className={styles.label}><span>Product screenshot</span><span>{capture.title}</span></div>
      <picture>
        <source media="(max-width: 599px)" srcSet={`${src}-phone.webp`}
          width={capture.phone[0]} height={capture.phone[1]} />
        <Image unoptimized src={`${src}-desktop.webp`} width={capture.desktop[0]} height={capture.desktop[1]}
          alt={capture.alt} loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : undefined} />
      </picture>
      <figcaption>
        <span>{capture.caption}</span>
        {(["phone", "desktop"] as const).map(device => (
          <a key={device} className={styles[device]} href={`${src}-${device}.webp`} target="_blank" rel="noreferrer"
            aria-label={`Open full-size ${capture.title} screenshot in a new tab`}>Full size ↗</a>
        ))}
      </figcaption>
    </figure>
  );
}
