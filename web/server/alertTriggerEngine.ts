/**
 * StrainScout MD — Alert Trigger Engine
 * Sprint 8: Compares catalog prices against active user alerts
 * and fires push notifications via Manus notification API when targets are met.
 *
 * Designed to run:
 *   1. After every catalog refresh (triggered via tRPC admin endpoint)
 *   2. On-demand via the admin dashboard
 *
 * Notification rules:
 *   - Max 1 notification per alert per 24 hours (frequency cap)
 *   - Alert status changes to "triggered" with price/dispensary/timestamp details
 *   - Expired alerts (>90 days) are automatically marked as expired
 */

import { getActiveAlerts, updatePriceAlert, getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { priceAlerts } from "../drizzle/schema";
import { eq, and, sql, lt } from "drizzle-orm";

const CATALOG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663317311392/oGX3NFZ9WLXhuXs89evvau/strainscout_catalog_v8.min_b0a7caef.json";

/** Minimal catalog strain shape needed for price comparison */
interface CatalogStrainPrice {
  id: string;
  name: string;
  prices: { dispensary: string; price: number }[];
}

/** Result of a single alert check */
export interface AlertTriggerResult {
  alertId: number;
  strainId: string;
  strainName: string;
  targetPrice: number;
  matchedPrice: number;
  matchedDispensary: string;
  userId: number;
  notified: boolean;
}

/** Summary of a full trigger engine run */
export interface TriggerRunSummary {
  runAt: string;
  activeAlertsChecked: number;
  alertsTriggered: number;
  alertsExpired: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: string[];
  triggers: AlertTriggerResult[];
}

/**
 * Fetch the current catalog from CDN and build a price lookup map.
 * Map key: strainId → array of { dispensary, price }
 */
async function fetchCatalogPrices(): Promise<Map<string, { dispensary: string; price: number }[]>> {
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

  const data = (await res.json()) as CatalogStrainPrice[];
  const priceMap = new Map<string, { dispensary: string; price: number }[]>();

  for (const strain of data) {
    if (!strain.prices || strain.prices.length === 0) continue;
    const validPrices = strain.prices.filter((p) => p.price > 0);
    if (validPrices.length > 0) {
      priceMap.set(strain.id, validPrices);
    }
  }

  return priceMap;
}

/**
 * Expire alerts that have passed their expiresAt date.
 * Returns the count of alerts expired.
 */
async function expireOldAlerts(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  const result = await db
    .update(priceAlerts)
    .set({ status: "expired" })
    .where(
      and(
        eq(priceAlerts.status, "active"),
        lt(priceAlerts.expiresAt, now)
      )
    );

  // MySQL returns affectedRows in the result
  return (result as any)[0]?.affectedRows ?? 0;
}

/**
 * Check if an alert was already triggered/notified within the last 24 hours.
 * This enforces the frequency cap of max 1 notification per alert per day.
 */
function wasRecentlyTriggered(triggeredAt: Date | null): boolean {
  if (!triggeredAt) return false;
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return triggeredAt.getTime() > twentyFourHoursAgo;
}

/**
 * Build a notification message for a triggered alert.
 */
function buildNotificationMessage(trigger: AlertTriggerResult): {
  title: string;
  content: string;
} {
  const savings = (trigger.targetPrice - trigger.matchedPrice).toFixed(2);
  return {
    title: `Price Alert: ${trigger.strainName} is now $${trigger.matchedPrice.toFixed(2)}`,
    content: [
      `Your price alert for **${trigger.strainName}** has been triggered!`,
      "",
      `Current price: $${trigger.matchedPrice.toFixed(2)} at ${trigger.matchedDispensary}`,
      `Your target: $${trigger.targetPrice.toFixed(2)}`,
      savings !== "0.00" ? `You're saving $${savings} below your target.` : `Price matches your target exactly.`,
      "",
      `View this strain on StrainScout MD to see all available prices.`,
    ].join("\n"),
  };
}

/**
 * Main trigger engine function.
 * Loads all active alerts, fetches current catalog prices,
 * compares each alert against the catalog, and fires notifications for matches.
 */
export async function runAlertTriggerEngine(): Promise<TriggerRunSummary> {
  const summary: TriggerRunSummary = {
    runAt: new Date().toISOString(),
    activeAlertsChecked: 0,
    alertsTriggered: 0,
    alertsExpired: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    errors: [],
    triggers: [],
  };

  try {
    // Step 1: Expire old alerts
    summary.alertsExpired = await expireOldAlerts();

    // Step 2: Fetch current catalog prices
    const priceMap = await fetchCatalogPrices();

    // Step 3: Load all active alerts
    const activeAlerts = await getActiveAlerts();
    summary.activeAlertsChecked = activeAlerts.length;

    if (activeAlerts.length === 0) {
      return summary;
    }

    // Step 4: Check each alert against catalog prices
    const triggeredAlerts: AlertTriggerResult[] = [];

    for (const alert of activeAlerts) {
      const catalogPrices = priceMap.get(alert.strainId);
      if (!catalogPrices || catalogPrices.length === 0) continue;

      // Parse the target price from decimal string
      const targetPrice = parseFloat(String(alert.targetPrice));
      if (isNaN(targetPrice) || targetPrice <= 0) continue;

      // Check frequency cap — skip if triggered within last 24 hours
      if (wasRecentlyTriggered(alert.triggeredAt)) continue;

      // Find matching prices
      let bestMatch: { dispensary: string; price: number } | null = null;

      for (const cp of catalogPrices) {
        if (cp.price > targetPrice) continue;

        // If alert is for a specific dispensary, only match that one
        if (alert.dispensary && alert.dispensary !== cp.dispensary) continue;

        // Track the lowest matching price
        if (!bestMatch || cp.price < bestMatch.price) {
          bestMatch = cp;
        }
      }

      if (bestMatch) {
        triggeredAlerts.push({
          alertId: alert.id,
          strainId: alert.strainId,
          strainName: alert.strainName,
          targetPrice,
          matchedPrice: bestMatch.price,
          matchedDispensary: bestMatch.dispensary,
          userId: alert.userId,
          notified: false,
        });
      }
    }

    // Step 5: Update alert statuses and send notifications
    for (const trigger of triggeredAlerts) {
      try {
        // Update the alert to "triggered" status with details
        await updatePriceAlert(trigger.alertId, {
          status: "triggered",
        });

        // Also update the triggered details directly (updatePriceAlert doesn't handle these)
        const db = await getDb();
        if (db) {
          await db
            .update(priceAlerts)
            .set({
              triggeredPrice: String(trigger.matchedPrice),
              triggeredDispensary: trigger.matchedDispensary,
              triggeredAt: new Date(),
              currentPrice: String(trigger.matchedPrice),
            })
            .where(eq(priceAlerts.id, trigger.alertId));
        }

        // Send push notification via Manus notification API
        const message = buildNotificationMessage(trigger);
        const notified = await notifyOwner(message);

        trigger.notified = notified;
        if (notified) {
          summary.notificationsSent++;
        } else {
          summary.notificationsFailed++;
        }

        summary.alertsTriggered++;
        summary.triggers.push(trigger);
      } catch (err) {
        const errorMsg = `Failed to process alert ${trigger.alertId}: ${err instanceof Error ? err.message : String(err)}`;
        summary.errors.push(errorMsg);
        console.error(`[AlertTrigger] ${errorMsg}`);
      }
    }

    // Step 6: Send a summary notification to the owner if any alerts were triggered
    if (summary.alertsTriggered > 0) {
      try {
        const summaryLines = summary.triggers.map(
          (t) => `• ${t.strainName}: $${t.matchedPrice.toFixed(2)} at ${t.matchedDispensary} (target: $${t.targetPrice.toFixed(2)})`
        );

        await notifyOwner({
          title: `StrainScout: ${summary.alertsTriggered} Price Alert${summary.alertsTriggered > 1 ? "s" : ""} Triggered`,
          content: [
            `${summary.alertsTriggered} of ${summary.activeAlertsChecked} active alerts matched current catalog prices.`,
            "",
            "Triggered alerts:",
            ...summaryLines,
            "",
            `${summary.alertsExpired} expired alerts were cleaned up.`,
            `Run completed at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET.`,
          ].join("\n"),
        });
      } catch {
        // Summary notification failure is non-critical
        console.warn("[AlertTrigger] Failed to send summary notification");
      }
    }

    return summary;
  } catch (err) {
    const errorMsg = `Alert trigger engine failed: ${err instanceof Error ? err.message : String(err)}`;
    summary.errors.push(errorMsg);
    console.error(`[AlertTrigger] ${errorMsg}`);
    return summary;
  }
}
