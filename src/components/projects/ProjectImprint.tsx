import type { ProjectItem } from "@/lib/projects";

export function ProjectImprint({ kind }: { kind: ProjectItem["visualKind"] }) {
  return (
    <svg viewBox="0 0 244 72" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => {
        switch (kind) {
          case "incident":
            return <path key={index} d={`M4 ${25 + index * 2}h50l8 -12 6 12 8 -20 9 23 6 -3h49l8 -12 6 12h82`} />;
          case "wheel":
            return <circle key={index} cx="122" cy="36" r={10 + index * 3.5} />;
          case "film":
            return <path key={index} d={`M${8 + index * 3} 10v52m${12 + index * 3} -52v52`} />;
          case "pass":
            return <rect key={index} x={28 + index * 4} y={12 + index * 2} width={188 - index * 8} height={48 - index * 4} rx="7" />;
          case "workspace":
            return <path key={index} d={`M20 ${14 + index * 5}h54l22 20h52l22 -20h54M20 ${58 - index * 5}h54l22 -20h52l22 20h54`} />;
        }
      })}
    </svg>
  );
}
