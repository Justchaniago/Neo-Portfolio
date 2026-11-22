import { WorkIndex } from "../WorkIndex";
import styles from "./Impression.module.css";

export { metadata } from "../page";

export default function Page() {
  return <div className={styles.impression}><WorkIndex impression /></div>;
}
