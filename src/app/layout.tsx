import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Google_Sans_Flex, Space_Grotesk } from "next/font/google";
import { SplashScreen } from "@/components/splash-screen/SplashScreen";
import { Header } from "@/components/header/Header";
import { CustomCursor } from "@/components/cursor/CustomCursor";
import { SpatialHud } from "@/components/hud/SpatialHud";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ProjectTransition } from "@/components/projects/ProjectTransition";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  axes: ["opsz", "wdth"],
  subsets: ["latin"],
  variable: "--font-google-sans-flex",
  display: "swap",
  adjustFontFallback: false,
});

const spaceGrotesk = Space_Grotesk({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chaniago.me"),
  title: "chaniago.me — Founder, Chaniago Labs",
  description: "Portfolio of Chaniago — Founder of Chaniago Labs, Creative Developer, and Systems Architect based in Surabaya, Indonesia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSansFlex.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="h-full flex flex-col">
        <SplashScreen />
        <CustomCursor />
        <CommandPalette />
        <div data-page-content className="flex flex-1 flex-col h-full w-full relative overflow-hidden">
          <Header />
          <SpatialHud />
          <ProjectTransition />
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
