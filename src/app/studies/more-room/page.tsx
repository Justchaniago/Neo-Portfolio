import type { Metadata } from "next";
import { MoreRoom } from "./MoreRoom";

export const metadata: Metadata = {
  title: "More room | Chaniago Labs",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MoreRoom />;
}
