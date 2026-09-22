import { HeaderLogo } from "./HeaderLogo";
import { HeaderNav } from "./HeaderNav";
import styles from "./HeaderLogo.module.css";

export function Header() {
  return <header className={styles.header}><HeaderLogo /><HeaderNav /></header>;
}
