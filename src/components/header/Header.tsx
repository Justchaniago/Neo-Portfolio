import { HeaderLogo } from "./HeaderLogo";
import styles from "./HeaderLogo.module.css";

export function Header() {
  return <header className={styles.header}><HeaderLogo /></header>;
}
