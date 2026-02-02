import { APP_KEY } from "../app.meta";
import type { StudyPlannerDashboardSummaryV1 } from "../dashboard/summary.schema";
import { postWebhook } from "./webhook";

export const pushStudyPlannerSummary = async (params: {
  userId: string;
  eventType: string;
  summary: StudyPlannerDashboardSummaryV1;
}): Promise<void> => {
  try {
    const url = import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_URL ?? null;
    const secret = import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_SECRET;

    const payload = {
      appId: APP_KEY,
      userId: params.userId,
      eventType: params.eventType,
      summaryVersion: params.summary.version,
      summary: params.summary,
    };

    await postWebhook({
      url,
      secret,
      payload,
      appKey: APP_KEY,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("pushStudyPlannerSummary failed", error);
    }
  }
};
