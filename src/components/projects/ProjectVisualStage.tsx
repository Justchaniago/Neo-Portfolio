import type { StandardProject } from "@/lib/projects";
import { IncidentPlate } from "./IncidentPlate";
import styles from "../../app/projects/[slug]/ProjectPage.module.css";

type Variant = "hero" | "detailA" | "detailB";

const kindClass = {
  film: styles.visualFilm,
  workspace: styles.visualWorkspace,
};

function Artwork({ kind, variant }: { kind: Exclude<StandardProject["visualKind"], "incident">; variant: Variant }) {
  if (kind === "film") {
    if (variant === "detailA") {
      return (
        <div className={styles.storyboard}>
          {["01", "02", "03"].map((frame) => (
            <div className={styles.storyFrame} key={frame}>
              <span>{frame}</span><i /><b />
            </div>
          ))}
          <strong>STORYBOARD</strong>
        </div>
      );
    }
    if (variant === "detailB") {
      return (
        <div className={styles.reviewBoard}>
          <div className={styles.filmPreview}><span>VIDEO OUTPUT</span><i>▶</i></div>
          <div className={styles.reviewTrack}><i /><i /><i /></div>
          <strong>REVIEW THE SEQUENCE</strong>
        </div>
      );
    }
    return (
      <div className={styles.filmComposition}>
        <div className={styles.storyFrame}><span>01</span><i /><b /></div>
        <div className={styles.storyFrame}><span>02</span><i /><b /></div>
        <div className={styles.storyFrame}><span>03</span><i /><b /></div>
        <strong>SCRIPT <i>→</i> STORYBOARD <i>→</i> VIDEO</strong>
      </div>
    );
  }

  if (variant === "detailA") {
    return (
      <div className={styles.architecturePair}>
        <div><span>MEMBER APP</span><strong>React Native<br />+ Expo</strong></div>
        <i>↕</i>
        <div><span>SERVICE LAYER</span><strong>FastAPI</strong></div>
      </div>
    );
  }
  if (variant === "detailB") {
    return (
      <div className={styles.architecturePair}>
        <div><span>SERVICE LAYER</span><strong>FastAPI</strong></div>
        <i>↕</i>
        <div><span>STORE TEAM</span><strong>Next.js admin</strong></div>
      </div>
    );
  }
  return (
    <div className={styles.architectureLayers}>
      <div><span>01 / MEMBER</span><strong>React Native · Expo</strong></div>
      <i>↕</i>
      <div><span>02 / SERVICE</span><strong>FastAPI</strong></div>
      <i>↕</i>
      <div><span>03 / STORE TEAM</span><strong>Next.js admin</strong></div>
    </div>
  );
}

export function ProjectVisualStage({ project, variant = "hero" }: { project: StandardProject; variant?: Variant }) {
  if (project.visualKind === "incident") return <IncidentPlate variant={variant} />;

  const kind = project.visualKind;
  const label = variant === "hero" ? "overview" : variant === "detailA" ? "stage detail one" : "stage detail two";

  return (
    <div
      className={`${styles.visualFrame} ${styles.visualTinted} ${variant === "hero" ? styles.visualHero : styles.visualDetail} ${kindClass[kind]}`}
      role="img"
      aria-label={`${project.title} ${label}`}
      data-visual-kind={kind}
      data-visual-variant={variant}
    >
      <div className={styles.frameBar}>
        <span className={styles.frameCode}>FIG. {project.number} / {variant === "hero" ? "OVERVIEW" : variant === "detailA" ? "A" : "B"}</span>
        <span className={styles.frameLabel}>{project.workflowHeading}</span>
      </div>
      <div className={styles.visualArtwork}>
        <Artwork kind={kind} variant={variant} />
      </div>
      {variant === "hero" && (
        <div className={styles.heroOverlayTitle} aria-hidden="true">
          <span>{project.number}</span>
          <span>—</span>
          <span>{project.title}</span>
        </div>
      )}
    </div>
  );
}
