import type { APIRoute } from "astro";
import { actions } from "astro:actions";
import { json, requireUserApiAccess } from "../../../lib/apiAuth";

export const GET: APIRoute = async ({ request, cookies, callAction }) => {
  const auth = requireUserApiAccess(cookies, request);
  if (auth instanceof Response) return auth;

  const result = await callAction(actions.studyPlanner.getDashboardSummary, {});
  const payload = (result as any)?.data ?? result;
  const error = (result as any)?.error;
  if (error) {
    return json(500, {
      error: error?.message ?? "Failed to load dashboard summary.",
      code: error?.code ?? "INTERNAL_SERVER_ERROR",
    });
  }

  return json(200, payload ?? {});
};

export const POST: APIRoute = async () => json(405, { error: "Method Not Allowed" });
