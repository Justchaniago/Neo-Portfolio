"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { triggerRouteTransition } from "@/components/projects/ProjectTransition";
import styles from "./HeaderNav.module.css";
import { currentSection, headerSections, sectionHref } from "./sections";

export function HeaderNav() {
  const [activeSection, setActiveSection] = useState("hero");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const scroller = document.querySelector("main");
    if (!scroller) return;

    const mobile = window.matchMedia("(max-width: 767px)");
    let turnAt = scroller.scrollTop;
    let collapsed = false;
    let currentActiveSection = "";
    let limit = scroller.scrollHeight - scroller.clientHeight;

    const update = () => {
      const y = Math.max(0, Math.min(limit, scroller.scrollTop));
      const section = currentSection(pathname);
      const layerActive = (pathname === "/" && section !== "hero")
        || document.documentElement.dataset.overlayOpen === "true"
        || Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001
        || Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001;
      const threshold = mobile.matches ? 24 : 40;

      let next = collapsed;
      if (pathname !== "/" || layerActive || y <= threshold) {
        next = false;
        turnAt = y;
      } else {
        // Measure from the last turn, not the previous Lenis frame.
        turnAt = collapsed ? Math.max(turnAt, y) : Math.min(turnAt, y);
        if (collapsed ? turnAt - y >= 6 : y - turnAt >= 12) {
          next = !collapsed;
          turnAt = y;
        }
      }

      if (section !== currentActiveSection) {
        currentActiveSection = section;
        setActiveSection(section);
      }

      if (pathname === "/") {
        const baseTitle = "chaniago.me — Creative Software Engineer";
        const nextTitle =
          section === "project"
            ? "Projects — chaniago.me"
            : section === "about"
              ? "About — chaniago.me"
              : section === "contact"
                ? "Contact — chaniago.me"
                : baseTitle;
        if (document.title !== nextTitle) {
          document.title = nextTitle;
        }
      }

      if (next === collapsed) return;
      collapsed = next;
      document.documentElement.dataset.headerCompact = String(next);
    };

    const measureAndUpdate = () => {
      limit = scroller.scrollHeight - scroller.clientHeight;
      update();
    };

    const initialFrame = requestAnimationFrame(measureAndUpdate);
    scroller.addEventListener("scroll", update, { passive: true });
    const stateObserver = new MutationObserver(update);
    stateObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-projects-active", "data-static-section", "data-overlay-open"],
    });
    mobile.addEventListener("change", measureAndUpdate);
    const resizeObserver = new ResizeObserver(measureAndUpdate);
    resizeObserver.observe(scroller);
    if (scroller.firstElementChild) {
      resizeObserver.observe(scroller.firstElementChild);
    }

    return () => {
      cancelAnimationFrame(initialFrame);
      scroller.removeEventListener("scroll", update);
      stateObserver.disconnect();
      resizeObserver.disconnect();
      mobile.removeEventListener("change", measureAndUpdate);
      delete document.documentElement.dataset.headerCompact;
    };
  }, [pathname]);

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {headerSections.map((item, index) => (
          <a
            key={item.name}
            className={styles.navLink}
            data-section={item.name}
            href={sectionHref(item.name)}
            data-project-link={item.name === "project" ? "true" : undefined}
            aria-current={item.name === activeSection ? "location" : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              if (pathname !== "/" || item.name === "project") {
                const href = sectionHref(item.name);
                if (href === pathname) { window.location.hash = "work"; return; }
                triggerRouteTransition({
                  href,
                  label: item.transition,
                  navigate: () => router.push(href),
                });
                return;
              }
              window.dispatchEvent(new CustomEvent("portfolio:request-section", {
                detail: { section: item.name },
              }));
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") {
                window.dispatchEvent(new CustomEvent("portfolio:nav-hover", { detail: { index } }));
              }
            }}
          >
            {item.name}
          </a>
      ))}
    </nav>
  );
}
