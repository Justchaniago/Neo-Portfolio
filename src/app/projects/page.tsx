import type { Metadata } from "next";
import { WorkIndex } from "../studies/work-index/WorkIndex";
import styles from "../studies/work-index/impression/Impression.module.css";

export const metadata: Metadata = {
  title: "Projects | Chaniago Labs",
  description: "Five working stories from Chaniago Labs.",
};

export default function ProjectsPage() {
  return <div className={styles.impression}><WorkIndex impression /></div>;
}
