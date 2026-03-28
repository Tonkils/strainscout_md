# Strategic Document 1: Website Launch Readiness & QA Plan

**Author:** Manus AI
**Date:** March 26, 2026

## 1. Executive Summary
This document outlines the critical path to technical readiness for the official launch of StrainScoutMD.com. With a target launch date set for three weeks prior to April 20th (4/20), the immediate priority is resolving existing technical blockers and executing a rigorous Quality Assurance (QA) protocol. This plan provides a structured approach for Emily (Lead Developer) to ensure the platform is fully functional, reliable, and capable of handling increased traffic during the peak cannabis retail season.

## 2. Current State Assessment & Critical Blockers
An initial technical audit of StrainScoutMD.com conducted on March 26, 2026, revealed a highly functional homepage and robust strain detail pages (e.g., `/strain/ice-cream-cake`). The core value proposition—cross-dispensary price comparison with terpene and THC data—is clearly articulated and technically impressive.

However, a **Severity 1 (Critical) Blocker** was identified: Multiple core navigation paths are currently returning `403 Forbidden` errors. These must be resolved immediately before any marketing efforts begin.

| Affected URL Path | Current Status | Required Action |
|-------------------|----------------|-----------------|
| `/cheapest` | 403 Forbidden | Check server routing, permissions, or missing view templates. |
| `/top-value` | 403 Forbidden | Verify backend controller logic and frontend routing. |
| `/dispensaries` | 403 Forbidden | Ensure dispensary directory database queries are functioning and accessible. |
| `/compare` | Inaccessible | Debug comparison tool logic and ensure route is public. |

## 3. Pre-Launch QA Checklist
To guarantee a seamless user experience, the following QA checklist must be completed by the development team prior to the soft launch.

### 3.1 Functional Testing
- **Navigation:** Verify all header and footer links resolve to the correct, accessible pages (resolving the 403 errors).
- **Search Functionality:** Test the global search bar with various inputs (strain names, brand names, specific terpenes) to ensure accurate and fast results.
- **Filtering and Sorting:** Validate that users can accurately sort by "Cheapest" and "Top Value" once those pages are restored.
- **Outbound Links:** Ensure all "Buy," "View on Leafly," and "Find on Weedmaps" buttons correctly append affiliate tags (if applicable) and open in new tabs.
- **Form Submissions:** Test the "Get Free Weekly Deals" and "Price Alerts" email capture forms to confirm data is successfully routed to the CRM/database.

### 3.2 Data Integrity Testing
- **Scraper Validation:** Run a manual spot-check comparing StrainScoutMD prices against the live menus of 5 randomly selected dispensaries to verify the 99.8% accuracy claim.
- **Grading System:** Review the logic assigning Grade A, B, and C to ensure it accurately reflects data completeness.

### 3.3 Performance and Mobile Testing
- **Mobile Responsiveness:** Conduct thorough testing on iOS (Safari) and Android (Chrome) devices, as the majority of consumer traffic will be mobile.
- **Page Load Speed:** Optimize image assets and database queries to ensure strain detail pages load in under 2.5 seconds.

## 4. User Journey Validation
Before launch, the team must validate the primary user journeys to ensure there is no friction in the conversion funnel.

1. **The Deal Hunter:** Lands on Homepage -> Clicks "Cheapest" -> Filters by Flower -> Clicks "Buy" -> Redirects to Dispensary.
2. **The Specific Strain Seeker:** Uses Search Bar for "Ice Cream Cake" -> Views Strain Detail Page -> Compares Prices -> Signs up for Price Alert.
3. **The Newsletter Subscriber:** Reads Value Proposition on Homepage -> Enters Email -> Receives Confirmation -> Receives first Tuesday Newsletter.

## 5. Launch Timeline & Milestones
To meet the goal of launching three weeks prior to 4/20 (Target Launch: March 30, 2026), the following timeline must be adhered to:

| Date | Milestone | Owner |
|------|-----------|-------|
| March 27 | Resolve all 403 Forbidden errors on subpages. | Emily |
| March 28 | Complete Functional and Data Integrity QA. | Emily / QA Tester |
| March 29 | Final Mobile Optimization and User Journey Validation. | Emily |
| March 30 | **Soft Launch:** Platform is fully public and functional. | Team |
| April 1 | Begin aggressive Instagram marketing campaign (5x/day). | Emily |

## 6. Conclusion
The technical foundation of StrainScoutMD is strong, but the current routing errors present a significant barrier to entry. By systematically addressing these blockers and executing this QA plan, the team will ensure a stable, high-performing platform ready to capture the surge in consumer interest leading up to the 4/20 holiday.
