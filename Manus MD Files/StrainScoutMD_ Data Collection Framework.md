# StrainScoutMD: Data Collection Framework

**Author:** Manus AI
**Date:** March 26, 2026

## 1. Introduction
The Data Collection Framework establishes the methodology for gathering, validating, and utilizing data from the StrainScoutMD.com platform. As a price comparison tool, the integrity and freshness of the data are the core value propositions of the business. This framework ensures that the platform maintains its stated 99.8% validation accuracy and provides actionable insights to both consumers and the internal team.

## 2. Core Data Categories
The framework categorizes data into three primary pillars: Product & Pricing Data, User Interaction Data, and Platform Performance Data. Each category serves a distinct purpose in understanding the platform's utility and driving future growth.

### 2.1 Product and Pricing Data
This category encompasses the core inventory information scraped or aggregated from the 66 tracked Maryland dispensaries. The platform currently tracks over 844 strains and 103 verified brands. Key data points include strain names, genetics, THC percentages, terpene profiles, pricing (including price per gram), and dispensary availability. The framework mandates weekly updates (currently executed every Tuesday) to ensure price drops and new inventory are accurately reflected. A proprietary grading system (Grades A, B, C) is applied based on the completeness and confidence level of the aggregated data.

### 2.2 User Interaction Data
Understanding how users navigate the platform is critical for optimizing the conversion funnel. The framework outlines the collection of behavioral data, including search queries (strains, brands, terpenes), filter usage (e.g., sorting by "Cheapest" or "Top Value"), and click-through rates on outbound "Buy" or "View on Leafly/Weedmaps" buttons. Additionally, the framework tracks user acquisition metrics, such as sign-ups for the weekly email newsletter and specific strain price alerts.

### 2.3 Platform Performance Data
To ensure a seamless user experience, technical performance data must be continuously monitored. This includes page load times, error rates (such as the currently identified 403 Forbidden errors on subpages), and mobile responsiveness metrics. The framework requires the implementation of robust error logging to quickly identify and resolve issues that could impede the user journey.

## 3. Data Validation and Quality Assurance
Maintaining high data quality is paramount. The framework establishes a multi-tiered validation process. Automated scripts must cross-reference pricing data against historical averages to flag anomalous price drops or spikes for manual review. The "Data Confidence" grading system must be transparently communicated to the user, with Grade A representing data verified across multiple sources, including brand, terpenes, THC, and pricing. Regular audits of the scraping mechanisms are required to ensure compatibility with changes to dispensary website structures.

## 4. Data Utilization Strategy
The collected data will be leveraged to drive strategic decision-making across the organization.

| Data Category | Primary Utilization | Responsible Party |
|---------------|---------------------|-------------------|
| Product & Pricing | Powering the core comparison engine and weekly deal newsletters. | Development Team |
| User Interaction | Optimizing UX, identifying popular strains for targeted marketing campaigns. | Marketing Team |
| Platform Performance | Prioritizing bug fixes and infrastructure scaling. | Development Team |

## 5. Privacy and Compliance
The framework mandates strict adherence to data privacy regulations. User email addresses collected for newsletters and price alerts must be stored securely and used solely for their intended purpose, with clear opt-out mechanisms provided. As the platform operates within the cannabis industry, all data collection and marketing practices must comply with Maryland state regulations regarding cannabis advertising and consumer privacy.

## 6. Conclusion
By implementing this Data Collection Framework, StrainScoutMD will ensure the reliability of its core product offering while generating the insights necessary to refine its marketing and development strategies. This structured approach to data is essential for achieving a successful launch and establishing long-term market dominance in Maryland.
