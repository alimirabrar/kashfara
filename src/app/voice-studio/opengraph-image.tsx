import { ImageResponse } from "next/og";

export const alt = "KASHFARA VOICE STUDIO — Low-Compute On-Premise TTS + STT Voice AI";
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
          backgroundColor: "#FFFFFF",
          color: "#1D1D1F",
          padding: "64px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#000000",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              K
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              <span>KASHFARA</span>
              <span style={{ color: "#6E6E73", fontWeight: 400 }}>VOICE STUDIO</span>
            </div>
          </div>

          <div
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              backgroundColor: "#F5F5F7",
              border: "1px solid rgba(0,0,0,0.1)",
              fontSize: "16px",
              fontWeight: 600,
              color: "#1D1D1F",
            }}
          >
            LOW-COMPUTE TTS + STT · ON-PREMISE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#000000",
            }}
          >
            Enterprise Voice AI. Low Compute. Yours Forever.
          </div>
          <div style={{ fontSize: "26px", color: "#6E6E73", lineHeight: 1.4 }}>
            Unified TTS + STT voice model engineered for on-premise deployment with zero vendor lock-in. Proven by jobshop.ai for BPO hiring &amp; English skill analysis.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(0,0,0,0.1)",
            paddingTop: "24px",
            fontSize: "18px",
            color: "#6E6E73",
          }}
        >
          <div>kashfara.com/voice-studio</div>
          <div style={{ display: "flex", gap: "24px", color: "#000000", fontWeight: 600 }}>
            <span>TTS + STT</span>
            <span>No Vendor Lock-In</span>
            <span>BPO &amp; Sales Ready</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
