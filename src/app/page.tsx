"use client";

import Image from "next/image";
import { AntigravityHalo } from "@/components/animations/AntigravityHalo";
import { ProjectsExperience } from "@/components/projects/ProjectsExperience";

export default function Home() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <ProjectsExperience>
      <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden w-full">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <AntigravityHalo />
        </div>

        <Image
          src="/hero-justchaniago.png"
          alt="Just Chaniago wearing sunglasses"
          width={1448}
          height={1086}
          priority
          sizes="(max-width: 640px) 345vw, (max-width: 1024px) 100vw, 85vw"
          className="relative z-10 h-auto w-[min(345vw,180dvh)] max-w-none select-none object-contain pointer-events-none sm:w-[min(100vw,112dvh)] lg:w-[min(85vw,112dvh)]"
        />
      </div>
      </ProjectsExperience>
    </main>
  );
}
