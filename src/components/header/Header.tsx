import { HeaderLogo } from "./HeaderLogo";
import { HeaderNav } from "./HeaderNav";
import { AmbientToggle } from "../ambient/AmbientToggle";
import { MobileNav } from "./MobileNav";
import styles from "./HeaderLogo.module.css";

export function Header() {
  return <header className={styles.header}><HeaderLogo /><HeaderNav /><MobileNav /><AmbientToggle /></header>;
}
