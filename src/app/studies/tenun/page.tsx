import type { Metadata } from "next";
import { TenunStudy } from "./TenunStudy";

export const metadata: Metadata = {
  title: "Tenun | Chaniago Labs",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <TenunStudy />;
}
