import type { Metadata } from "next";
import { WorkIndex } from "./WorkIndex";
import styles from "./impression/Impression.module.css";

export const metadata: Metadata = {
  title: "Work index | Chaniago",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <div className={styles.impression}><WorkIndex impression /></div>;
}
