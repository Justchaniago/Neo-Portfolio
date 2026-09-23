import { HeaderLogo } from "./HeaderLogo";
import { HeaderNav } from "./HeaderNav";
import { AmbientToggle } from "../ambient/AmbientToggle";
import styles from "./HeaderLogo.module.css";

export function Header() {
  return <header className={styles.header}><HeaderLogo /><HeaderNav /><AmbientToggle /></header>;
}
