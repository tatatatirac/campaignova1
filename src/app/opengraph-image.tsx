import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Campaignova AI Marketing Director";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f4f2ec",
          color: "#121412",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 520,
            height: 520,
            borderRadius: 999,
            background:
              "radial-gradient(circle, #d9ff43 0%, #b8ff3f 42%, rgba(217,255,67,0) 72%)",
            opacity: 0.95
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -160,
            bottom: -190,
            width: 580,
            height: 580,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(105,92,255,0.42) 0%, rgba(105,92,255,0.18) 45%, rgba(105,92,255,0) 72%)"
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "60px 70px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 18,
                background: "#121412",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d9ff43",
                fontSize: 42,
                fontWeight: 900
              }}
            >
              /
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 31, fontWeight: 900 }}>Campaignova</div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: 4,
                  color: "#656a64"
                }}
              >
                AI MARKETING DIRECTOR
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 58,
              gap: 42,
              alignItems: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 610
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: 5,
                  color: "#695cff"
                }}
              >
                YOUR MONTHLY MARKETING OPERATING SYSTEM
              </div>
              <div
                style={{
                  marginTop: 22,
                  fontSize: 82,
                  lineHeight: 0.93,
                  fontWeight: 900,
                  letterSpacing: -5
                }}
              >
                Know exactly what to post next.
              </div>
              <div
                style={{
                  marginTop: 28,
                  fontSize: 24,
                  lineHeight: 1.35,
                  color: "#535851"
                }}
              >
                Strategy, calendar, posts, emails, landing copy and ready-made
                videos built around your business.
              </div>
            </div>

            <div
              style={{
                width: 374,
                borderRadius: 32,
                background: "#171817",
                padding: 20,
                boxShadow: "0 28px 80px rgba(18,20,18,0.20)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#ffffff"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      fontSize: 13,
                      letterSpacing: 3,
                      color: "#a4a6a1",
                      fontWeight: 900
                    }}
                  >
                    CAMPAIGN DASHBOARD
                  </div>
                  <div style={{ marginTop: 9, fontSize: 23, fontWeight: 900 }}>
                    July growth plan
                  </div>
                </div>
                <div
                  style={{
                    borderRadius: 999,
                    background: "#d9ff43",
                    padding: "10px 13px",
                    color: "#121412",
                    fontSize: 13,
                    fontWeight: 900
                  }}
                >
                  92% READY
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  borderRadius: 26,
                  background: "#ffffff",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div
                  style={{
                    color: "#777c75",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 2
                  }}
                >
                  NEXT BEST ACTION
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#121412"
                  }}
                >
                  Publish proof reel
                </div>
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #d9ff43, #82d95d)",
                    height: 142,
                    padding: 22,
                    display: "flex",
                    alignItems: "flex-end",
                    fontSize: 30,
                    lineHeight: 0.95,
                    fontWeight: 900
                  }}
                >
                  Stop losing leads after the first click.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  borderRadius: 18,
                  background: "#242624",
                  padding: "16px 18px",
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 900
                }}
              >
                30 posts / 5 emails / 30 ready-made videos
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: 16,
              color: "#5d625b",
              fontSize: 18,
              fontWeight: 800
            }}
          >
            <span>No prompts to write</span>
            <span>•</span>
            <span>Ready to publish</span>
            <span>•</span>
            <span>Built for your timezone</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
