"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasConsent } from "@/lib/cookies";

const GA_ID = "G-GM6V8H260M";

export default function GoogleAnalytics() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    setConsentGiven(hasConsent("analytics"));

    const onConsent = () => setConsentGiven(hasConsent("analytics"));
    window.addEventListener("consent-updated", onConsent);
    return () => window.removeEventListener("consent-updated", onConsent);
  }, []);

  if (!consentGiven) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            send_page_view: true,
            cookie_flags: 'SameSite=Lax;Secure'
          });
        `}
      </Script>
    </>
  );
}
