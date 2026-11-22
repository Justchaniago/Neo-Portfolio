import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import { studyNeighbors } from "@/lib/projectPosters";
import { ProjectCaseStudy } from "@/components/projects/ProjectCaseStudy";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PROJECTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((item) => item.slug === slug);
  if (!project) notFound();

  return {
    title: `${project.title} — chaniago.me`,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const projectIndex = PROJECTS.findIndex((item) => item.slug === slug);
  if (projectIndex === -1) notFound();

  const project = PROJECTS[projectIndex];

  return (
    <ProjectCaseStudy
      key={project.slug}
      project={project}
      {...studyNeighbors(slug)}
    />
  );
}
