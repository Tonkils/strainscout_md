"use client";

import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { useEmailCapture } from "@/hooks/useEmailCapture";

interface DealDigestBannerProps {
  totalStrains: number;
  totalDispensaries: number;
}

export default function DealDigestBanner({ totalStrains, totalDispensaries }: DealDigestBannerProps) {
  const { email, setEmail, status, errorMsg, alreadySignedUp, isDismissed, submit, dismiss } =
    useEmailCapture("deal_digest");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  if (isDismissed && !alreadySignedUp && status !== "success") return null;

  return (
    <section className="container py-6 sm:py-8">
      <div
        style={{
          background: "#FFD66B",
          border: "3px solid #1A1A2E",
          borderRadius: "18px",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {alreadySignedUp || status === "success" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "#4EC96B",
                border: "3px solid #1A1A2E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: "#FFF8EE" }} />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-heading), Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#1A1A2E",
                  marginBottom: "4px",
                }}
              >
                You&apos;re Getting Maryland&apos;s Best Deals
              </h3>
              <p style={{ fontSize: "14px", color: "rgba(26,26,46,0.7)" }}>
                Your personalized deal digest arrives every Tuesday morning.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-heading), Georgia, serif",
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#1A1A2E",
                  marginBottom: "8px",
                  lineHeight: 1.2,
                }}
              >
                Save $15–40 Per 8th — Every Week
              </h2>
              <p style={{ fontSize: "15px", color: "rgba(26,26,46,0.75)", lineHeight: 1.6, maxWidth: "560px" }}>
                We track{" "}
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}>{totalStrains.toLocaleString()}</span>
                {" "}strains across{" "}
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}>{totalDispensaries}</span>
                {" "}dispensaries so you don&apos;t have to. Get the biggest price drops delivered free every Tuesday.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", gap: "0", maxWidth: "480px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  background: "#fff",
                  border: "3px solid #1A1A2E",
                  borderRight: "none",
                  borderRadius: "12px 0 0 12px",
                  padding: "0 16px",
                }}
              >
                <Mail style={{ width: "16px", height: "16px", color: "rgba(26,26,46,0.4)", flexShrink: 0, marginRight: "8px" }} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "submitting"}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "14px",
                    color: "#1A1A2E",
                    padding: "14px 0",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={status === "submitting"}
                style={{
                  padding: "14px 20px",
                  background: "#FF6B57",
                  color: "#FFF8EE",
                  border: "3px solid #1A1A2E",
                  borderRadius: "0 12px 12px 0",
                  fontWeight: 800,
                  fontSize: "13px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  cursor: status === "submitting" ? "not-allowed" : "pointer",
                  opacity: status === "submitting" ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (status !== "submitting") {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #1A1A2E";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {status === "submitting" ? (
                  <Loader2 aria-hidden="true" style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                ) : (
                  <>Get Free Weekly Deals</>
                )}
              </button>
            </form>

            {errorMsg && (
              <p style={{ fontSize: "12px", color: "#FF6B57", marginTop: "-16px" }}>{errorMsg}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "-12px" }}>
              <p style={{ fontSize: "11px", color: "rgba(26,26,46,0.5)" }}>Unsubscribe anytime. No spam, ever.</p>
              <button
                type="button"
                onClick={dismiss}
                style={{
                  fontSize: "11px",
                  color: "rgba(26,26,46,0.4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
