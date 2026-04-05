import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "StrainScout MD privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: April 5, 2026
      </p>

      {/* Overview */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">Overview</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        StrainScout MD (strainscoutmd.com) is a Maryland cannabis price
        comparison tool. We collect data to personalize your experience and
        improve our service. This policy explains what we collect, how we use
        it, and how we protect it.
      </p>

      {/* Information We Collect */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        Information We Collect
      </h2>

      <h3 className="font-serif text-lg text-foreground mt-4 mb-2">
        Information You Provide
      </h3>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>Email address (when you sign up for deal alerts)</li>
        <li>Strain preferences</li>
      </ul>

      <h3 className="font-serif text-lg text-foreground mt-4 mb-2">
        Automatically Collected
      </h3>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>IP address (for city-level location only)</li>
        <li>Browser type</li>
        <li>Device type</li>
        <li>Pages visited</li>
        <li>Referral source</li>
        <li>UTM parameters</li>
      </ul>

      <h3 className="font-serif text-lg text-foreground mt-4 mb-2">Cookies</h3>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>
          <strong>Essential cookies</strong> — required for the site to function
        </li>
        <li>
          <strong>Analytics cookies</strong> — Google Analytics and PostHog, only
          with your consent
        </li>
        <li>
          <strong>Marketing cookies</strong> — reserved for future use, only with
          your consent
        </li>
      </ul>

      {/* How We Use Your Information */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        How We Use Your Information
      </h2>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>Personalize deals for your area (city-level location from IP)</li>
        <li>Send weekly deal digest emails (if subscribed)</li>
        <li>Understand which features are most useful (analytics)</li>
        <li>Improve strain recommendations and price tracking</li>
      </ul>

      {/* Cookie Consent */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        Cookie Consent
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        We show a cookie consent banner on your first visit. You can accept all,
        choose essential only, or customize your preferences. Analytics and
        marketing cookies require your explicit consent. You can change your
        preferences at any time by clearing your cookies.
      </p>

      {/* Data Sharing */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        Data Sharing
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        We do <strong>not</strong> sell your personal data. We use the following
        third-party services:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>Google Analytics (anonymized usage data)</li>
        <li>PostHog (behavioral analytics)</li>
        <li>Supabase (database hosting)</li>
        <li>ipapi.co (IP-to-city lookup, no personal data stored)</li>
      </ul>

      {/* Data Retention */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        Data Retention
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Email signups are retained while your subscription is active. Analytics
        data is retained for 12 months. Cookies expire per their configured
        duration (consent: 1 year, attribution: 30 days).
      </p>

      {/* Your Rights */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        Your Rights
      </h2>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>Unsubscribe from emails at any time</li>
        <li>Decline analytics cookies</li>
        <li>Request deletion of your data by contacting us</li>
      </ul>

      {/* Children's Privacy */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">
        Children&apos;s Privacy
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        StrainScout MD is intended for adults 21+ in Maryland. We do not
        knowingly collect data from minors.
      </p>

      {/* Contact */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">Contact</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Questions about this policy? Email{" "}
        <a
          href="mailto:privacy@strainscoutmd.com"
          className="text-primary hover:underline"
        >
          privacy@strainscoutmd.com
        </a>
        .
      </p>

      {/* Changes */}
      <h2 className="font-serif text-xl text-foreground mt-8 mb-3">Changes</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        We may update this policy from time to time. Changes will be posted on
        this page with an updated date.
      </p>
    </div>
  );
}
