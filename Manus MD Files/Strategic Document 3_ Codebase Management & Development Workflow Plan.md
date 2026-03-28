# Strategic Document 3: Codebase Management & Development Workflow Plan

**Author:** Manus AI
**Date:** March 26, 2026

## 1. Executive Summary
This document establishes the standard operating procedures for managing the StrainScoutMD codebase. Given the aggressive timeline leading up to the 4/20 launch and the collaborative development environment involving Emily (Lead Developer) and AI assistance (Claude), a structured workflow is essential. This plan ensures that code updates are regular, safe, and transparent, minimizing the risk of deployment failures during critical marketing periods.

## 2. Version Control and Branching Strategy
To maintain stability while allowing for rapid iteration, the project will utilize Git with a simplified feature-branch workflow.

### 2.1 Branch Architecture
- **`main` (Production):** This branch represents the live state of StrainScoutMD.com. Code merged here must be fully tested and production-ready. Direct commits to `main` are strictly prohibited.
- **`staging` (Pre-Production):** This branch acts as the integration environment. All feature branches merge here first for QA testing before being promoted to `main`.
- **`feature/[issue-name]`:** Temporary branches created by Emily or Claude for specific tasks (e.g., `feature/fix-403-errors`, `feature/add-price-alert-modal`).

### 2.2 Commit Conventions
Commit messages must be descriptive and follow a standardized format to ensure a clear project history.
- `feat:` for new features.
- `fix:` for bug resolutions.
- `chore:` for routine tasks (e.g., updating dependencies).
- Example: `fix: resolve 403 forbidden error on /cheapest route`

## 3. Collaborative Development Workflow (Emily & Claude)
The integration of AI assistance requires a clear protocol to prevent code conflicts and ensure Emily maintains architectural oversight.

### 3.1 Task Assignment and Scoping
1. **Define the Objective:** Before engaging Claude, Emily must clearly define the scope of the feature or bug fix.
2. **AI Generation:** Claude generates the code snippet or component based on the defined scope.
3. **Human Review:** Emily must review the AI-generated code for security, performance, and alignment with the existing codebase architecture before integration.

### 3.2 The Update Cadence
To meet the requirement for "regular codebase updates," the following cadence is established:
- **Daily Commits:** Emily should commit work-in-progress to feature branches daily to ensure code is backed up and progress is visible.
- **Bi-Weekly Staging Merges:** Feature branches should be merged into `staging` every Tuesday and Friday for integration testing.
- **Weekly Production Deployments:** Code from `staging` is promoted to `main` and deployed to production every Wednesday morning. This avoids deploying on Fridays, ensuring the team is available to address any post-deployment issues.

## 4. Deployment and Rollback Procedures
A reliable deployment pipeline is critical for maintaining uptime, especially as traffic increases closer to 4/20.

### 4.1 Deployment Checklist
Before merging `staging` into `main`, the following checks must pass:
- All automated tests (if applicable) execute successfully.
- Manual QA of the specific feature on the staging environment is complete.
- The site's core user journeys (search, filter, outbound click) are verified.

### 4.2 Rollback Protocol
In the event a deployment to `main` introduces a critical bug (e.g., a return of the 403 errors), the team must execute an immediate rollback.
1. Identify the failing commit hash on the `main` branch.
2. Execute `git revert [commit-hash]` to undo the changes.
3. Push the reverted state to production.
4. Investigate the root cause on the `staging` branch.

## 5. Data Pipeline Management
StrainScoutMD relies on weekly data updates (currently scheduled for Tuesdays). The codebase management plan must account for this data pipeline.
- **Scraper Maintenance:** The scripts responsible for aggregating dispensary data must be version-controlled alongside the application code.
- **Data Schema Changes:** Any changes to the database schema (e.g., adding a new field for a specific terpene) must be executed via database migrations, not manual SQL queries, to ensure consistency across environments.

## 6. Conclusion
By adhering to this Codebase Management and Development Workflow Plan, Emily and the team can confidently iterate on StrainScoutMD.com. This structured approach mitigates the risks associated with rapid development, ensuring the platform remains stable and performant as it scales to meet the demands of the Maryland cannabis market.
