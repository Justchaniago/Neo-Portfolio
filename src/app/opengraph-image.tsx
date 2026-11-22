import { ImageResponse } from "next/og";

export const alt = "chaniago.me — Creative Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderBottom: "1px solid rgba(255,255,255,0.14)",
            paddingBottom: "24px",
            fontSize: "16px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.58)",
          }}
        >
          <span>01 // PORTFOLIO INDEX</span>
          <span style={{ color: "#dfa13d" }}>SURABAYA, ID · 07°15&apos;S 112°45&apos;E</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: "128px",
              fontWeight: 700,
              letterSpacing: "-0.06em",
              lineHeight: 0.9,
            }}
          >
            <span>chaniago</span>
            <span style={{ color: "#dfa13d" }}>.</span>
            <span>me</span>
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              color: "rgba(255,255,255,0.68)",
              marginTop: "12px",
            }}
          >
            Founder of Chaniago Labs &amp; Creative Technologist
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255,255,255,0.14)",
            paddingTop: "24px",
            fontSize: "15px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.48)",
          }}
        >
          <span>SYSTEMS ARCHITECTURE · WEBGL · AI WORKFLOWS</span>
          <span style={{ color: "#ffffff" }}>CHANIAGO.ME ↗</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
