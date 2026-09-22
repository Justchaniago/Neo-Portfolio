"use client";

import { AntigravityHalo } from "@/components/animations/AntigravityHalo";
import { HeroPortrait } from "@/components/hero/HeroPortrait";
import { ProjectsExperience } from "@/components/projects/ProjectsExperience";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white">
      <ProjectsExperience>
      <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden w-full">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <AntigravityHalo />
        </div>

        <div className={`${styles.heroImage} relative z-10 h-full w-full`}>
          <HeroPortrait />
        </div>
      </div>
      </ProjectsExperience>
    </main>
  );
}
