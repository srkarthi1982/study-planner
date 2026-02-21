import { APP_KEY } from "../app.meta";
import type { StudyPlannerDashboardSummaryV1 } from "../dashboard/summary.schema";
import { postWebhook } from "./webhook";

const getWebhookUrl = (baseUrl: string) =>
  `${baseUrl.replace(/\/$/, "")}/api/webhooks/study-planner-activity.json`;

export const pushStudyPlannerSummary = async (params: {
  userId: string;
  eventType: string;
  summary: StudyPlannerDashboardSummaryV1;
}): Promise<void> => {
  try {
    const baseUrl =
      import.meta.env.PARENT_APP_URL ??
      import.meta.env.ANSIVERSA_PARENT_BASE_URL ??
      import.meta.env.PUBLIC_ROOT_APP_URL ??
      null;
    const url = baseUrl ? getWebhookUrl(baseUrl) : import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_URL ?? null;
    const secret =
      import.meta.env.ANSIVERSA_WEBHOOK_SECRET ??
      import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_SECRET;

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
