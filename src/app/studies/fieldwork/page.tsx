import type { Metadata } from "next";
import { Fieldwork } from "./Fieldwork";

export const metadata: Metadata = {
  title: "What got easier? | Chaniago Labs",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Fieldwork />;
}
