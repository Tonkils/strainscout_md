import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for StrainScout MD, Maryland's cannabis price comparison platform. Read our terms before using the site.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground">
                Terms of Service
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last updated: April 8, 2026
              </p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Please read these terms carefully before using StrainScout MD. By
            accessing or using our platform, you agree to be bound by these
            terms.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container py-8 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* 1. Acceptance of Terms */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                By accessing or using StrainScout MD (&quot;the Service&quot;),
                operated at strainscoutmd.com, you agree to be bound by these
                Terms of Service (&quot;Terms&quot;). If you do not agree to
                these Terms, do not use the Service.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you
                and StrainScout MD. Your continued use of the Service after any
                modifications to these Terms constitutes acceptance of those
                changes.
              </p>
            </div>
          </div>

          {/* 2. Description of Service */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              2. Description of Service
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                StrainScout MD is a cannabis price comparison platform focused
                on the Maryland market. We aggregate and display pricing
                information from licensed Maryland dispensaries to help consumers
                make informed purchasing decisions.
              </p>
              <p className="font-medium text-foreground/80">
                StrainScout MD is not a dispensary, retailer, or seller of
                cannabis products. We do not sell, distribute, or facilitate the
                sale of any cannabis or cannabis-related products. We are
                strictly an informational service.
              </p>
              <p>
                The Service may include features such as strain comparison
                tools, price alerts, dispensary directories, market data
                analysis, and community features like comments and votes.
              </p>
            </div>
          </div>

          {/* 3. Age Requirement and Maryland Compliance */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              3. Age Requirement and Maryland Compliance
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                You must be at least 21 years of age to use StrainScout MD. By
                using the Service, you represent and warrant that you are at
                least 21 years old and legally permitted to access cannabis-related
                information in the State of Maryland.
              </p>
              <p>
                StrainScout MD is designed for use in connection with
                Maryland&apos;s legal adult-use cannabis market. The information
                provided on this platform is intended solely for informational
                purposes and does not constitute an endorsement or
                encouragement to purchase or consume cannabis. All cannabis
                purchases must be made in compliance with Maryland state law
                through licensed dispensaries.
              </p>
              <p>
                We are not responsible for ensuring your compliance with any
                applicable local, state, or federal laws regarding cannabis.
              </p>
            </div>
          </div>

          {/* 4. User Accounts and Responsibilities */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              4. User Accounts and Responsibilities
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Some features of the Service may require you to create an
                account. When you create an account, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Provide accurate and complete information</li>
                <li>
                  Maintain the security of your account credentials
                </li>
                <li>
                  Accept responsibility for all activity that occurs under your
                  account
                </li>
                <li>
                  Notify us immediately of any unauthorized use of your account
                </li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that
                violate these Terms, engage in fraudulent activity, or are used
                in a manner that could harm the Service or other users.
              </p>
            </div>
          </div>

          {/* 5. User-Generated Content */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              5. User-Generated Content
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                The Service may allow you to submit content including comments,
                reviews, votes, ratings, and dispensary partner claims
                (&quot;User Content&quot;). By submitting User Content, you:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>
                  Grant StrainScout MD a non-exclusive, royalty-free,
                  worldwide license to use, display, and distribute your User
                  Content in connection with the Service
                </li>
                <li>
                  Represent that your User Content is accurate and does not
                  violate any third-party rights
                </li>
                <li>
                  Agree not to submit content that is unlawful, defamatory,
                  misleading, or harmful
                </li>
              </ul>
              <p>
                We reserve the right to remove any User Content at our sole
                discretion without notice. We do not endorse or guarantee the
                accuracy of any User Content.
              </p>
              <p>
                Dispensary partner claims are subject to verification. Claiming
                a dispensary profile does not guarantee approval, and we reserve
                the right to reject or revoke partner status at any time.
              </p>
            </div>
          </div>

          {/* 6. Data Accuracy Disclaimer */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              6. Data Accuracy and Pricing Disclaimer
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground/80">
                Prices displayed on StrainScout MD are periodic snapshots
                collected from publicly available dispensary sources. They are
                not real-time and may not reflect current pricing at any given
                dispensary.
              </p>
              <p>
                While we strive to keep our data as accurate and up-to-date as
                possible, we cannot guarantee the accuracy, completeness, or
                timeliness of any pricing or product information displayed on the
                Service. Prices, product availability, THC/terpene content, and
                other details may change at any time without notice.
              </p>
              <p>
                Always verify pricing and availability directly with the
                dispensary before making a purchase. StrainScout MD is not
                responsible for any discrepancies between the prices shown on
                our platform and the actual prices at a dispensary.
              </p>
            </div>
          </div>

          {/* 7. Intellectual Property */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              7. Intellectual Property
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                The Service and its original content (excluding User Content),
                features, and functionality are owned by StrainScout MD and are
                protected by copyright, trademark, and other intellectual
                property laws.
              </p>
              <p>
                You may not reproduce, distribute, modify, create derivative
                works of, publicly display, or otherwise exploit any content
                from the Service without our prior written consent. This
                includes but is not limited to our compiled pricing data, market
                analysis, and proprietary algorithms.
              </p>
              <p>
                Strain names, dispensary names, and brand names referenced on
                the Service are the property of their respective owners.
              </p>
            </div>
          </div>

          {/* 8. Prohibited Uses */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              8. Prohibited Uses
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>
                  Scrape, crawl, or otherwise extract data in bulk without our
                  written permission
                </li>
                <li>
                  Interfere with or disrupt the Service or its infrastructure
                </li>
                <li>
                  Impersonate any person or entity, or falsely represent your
                  affiliation with a dispensary or brand
                </li>
                <li>
                  Post false pricing information or misleading reviews
                </li>
                <li>
                  Use the Service for any illegal purpose or in violation of any
                  applicable laws
                </li>
                <li>
                  Attempt to gain unauthorized access to any part of the Service
                </li>
              </ul>
            </div>
          </div>

          {/* 9. Limitation of Liability */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              9. Limitation of Liability
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                The Service is provided on an &quot;as is&quot; and &quot;as
                available&quot; basis without warranties of any kind, either
                express or implied, including but not limited to warranties of
                merchantability, fitness for a particular purpose, or
                non-infringement.
              </p>
              <p>
                To the fullest extent permitted by law, StrainScout MD shall not
                be liable for any indirect, incidental, special, consequential,
                or punitive damages, or any loss of profits or revenue, whether
                incurred directly or indirectly, or any loss of data, use, or
                goodwill, arising out of:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Your use of or inability to use the Service</li>
                <li>
                  Any inaccuracies in pricing, product data, or other
                  information displayed on the Service
                </li>
                <li>
                  Any purchasing decisions made based on information from the
                  Service
                </li>
                <li>
                  Any unauthorized access to or alteration of your account or
                  data
                </li>
              </ul>
              <p>
                In no event shall our total liability exceed one hundred dollars
                ($100).
              </p>
            </div>
          </div>

          {/* 10. Third-Party Links */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              10. Third-Party Links
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                The Service may contain links to third-party websites or
                services, including dispensary websites. We are not responsible
                for the content, privacy practices, or availability of any
                third-party sites. Visiting any linked site is at your own risk.
              </p>
            </div>
          </div>

          {/* 11. Changes to Terms */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              11. Changes to Terms
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                We reserve the right to modify these Terms at any time. When we
                make changes, we will update the &quot;Last updated&quot; date
                at the top of this page. Material changes may be communicated
                via a notice on the Service or by email if you have an account.
              </p>
              <p>
                Your continued use of the Service after any changes to these
                Terms constitutes your acceptance of the revised Terms.
              </p>
            </div>
          </div>

          {/* 12. Governing Law */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              12. Governing Law
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of the State of Maryland, without regard to its
                conflict of law provisions. Any disputes arising from these
                Terms or your use of the Service shall be resolved in the
                courts of the State of Maryland.
              </p>
            </div>
          </div>

          {/* 13. Contact Information */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
              13. Contact Information
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                If you have any questions about these Terms, please contact us
                at:
              </p>
              <div className="bg-card/80 border border-border/30 rounded-lg p-4">
                <p className="font-medium text-foreground">StrainScout MD</p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:hello@strainscoutmd.com"
                    className="text-primary hover:underline"
                  >
                    hello@strainscoutmd.com
                  </a>
                </p>
                <p>Website: strainscoutmd.com</p>
              </div>
            </div>
          </div>

          {/* Related Links */}
          <div className="pt-6 border-t border-border/30">
            <p className="text-sm text-muted-foreground">
              See also our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
