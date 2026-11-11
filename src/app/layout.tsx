import type { Metadata, Viewport } from "next";
import { SplashScreen } from "@/components/splash-screen/SplashScreen";
import { Header } from "@/components/header/Header";
import { CustomCursor } from "@/components/cursor/CustomCursor";
import { SpatialHud } from "@/components/hud/SpatialHud";
import "./globals.css";

export const metadata: Metadata = {
  title: "chaniago.me — Creative Software Engineer",
  description: "Portfolio of Chaniago — Freelance Software Engineer, Creative Developer, and Systems Architect based in Surabaya, Indonesia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full flex flex-col">
        <SplashScreen />
        <CustomCursor />
        <div data-page-content className="flex flex-1 flex-col h-full w-full relative overflow-hidden">
          <Header />
          <SpatialHud />
          {children}
        </div>
      </body>
    </html>
  );
}
