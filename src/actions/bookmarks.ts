import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { Bookmark, StudyPlans, and, db, desc, eq, inArray } from "astro:db";
import { z } from "astro:schema";
import { requireUser } from "./_guards";

const bookmarkEntityTypeSchema = z.enum(["plan"]);

const normalizeEntityId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ActionError({ code: "BAD_REQUEST", message: "Entity id is required." });
  }
  return trimmed;
};

const normalizeLabel = (value?: string) => {
  const trimmed = value?.trim() ?? "";
  return trimmed || "Untitled plan";
};

const normalizeMeta = (value?: unknown) => {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

export const listPlanBookmarks = defineAction({
  input: z.object({}).optional(),
  async handler(_input, context: ActionAPIContext) {
    const user = requireUser(context);

    const bookmarks = await db
      .select({
        id: Bookmark.id,
        entityId: Bookmark.entityId,
        label: Bookmark.label,
        createdAt: Bookmark.createdAt,
      })
      .from(Bookmark)
      .where(and(eq(Bookmark.userId, user.id), eq(Bookmark.entityType, "plan")))
      .orderBy(desc(Bookmark.createdAt), desc(Bookmark.id));

    const planIds = bookmarks
      .map((row) => Number.parseInt(String(row.entityId), 10))
      .filter((value) => Number.isFinite(value) && value > 0);

    const plans = planIds.length
      ? await db
          .select({
            id: StudyPlans.id,
            title: StudyPlans.title,
            updatedAt: StudyPlans.updatedAt,
          })
          .from(StudyPlans)
          .where(and(eq(StudyPlans.ownerId, user.id), inArray(StudyPlans.id, planIds)))
      : [];

    const planMap = new Map<string, { title?: string | null; updatedAt?: Date | string | null }>(
      plans.map((plan) => [String(plan.id), { title: plan.title, updatedAt: plan.updatedAt }]),
    );

    return {
      items: bookmarks.map((row) => {
        const plan = planMap.get(String(row.entityId));
        const title = plan?.title ?? row.label ?? "Untitled plan";
        const updatedAt = plan?.updatedAt ?? row.createdAt ?? null;
        const planId = String(row.entityId);

        return {
          entityId: planId,
          planId,
          title,
          label: title,
          bookmarkedAt: row.createdAt,
          updatedAt,
          href: `/plans/${planId}`,
        };
      }),
    };
  },
});

export const toggleBookmark = defineAction({
  input: z.object({
    entityType: bookmarkEntityTypeSchema,
    entityId: z.string().min(1, "Entity id is required"),
    label: z.string().optional(),
    meta: z.unknown().optional(),
  }),
  async handler(input, context: ActionAPIContext) {
    const user = requireUser(context);
    const entityId = normalizeEntityId(input.entityId);
    const label = normalizeLabel(input.label);
    const meta = normalizeMeta(input.meta);

    const existing = await db
      .select({ id: Bookmark.id })
      .from(Bookmark)
      .where(
        and(
          eq(Bookmark.userId, user.id),
          eq(Bookmark.entityType, input.entityType),
          eq(Bookmark.entityId, entityId),
        ),
      )
      .get();

    if (existing?.id) {
      await db.delete(Bookmark).where(eq(Bookmark.id, existing.id));
      return { saved: false };
    }

    try {
      await db.insert(Bookmark).values({
        userId: user.id,
        entityType: input.entityType,
        entityId,
        label,
        meta,
      });
      return { saved: true };
    } catch {
      const stillExists = await db
        .select({ id: Bookmark.id })
        .from(Bookmark)
        .where(
          and(
            eq(Bookmark.userId, user.id),
            eq(Bookmark.entityType, input.entityType),
            eq(Bookmark.entityId, entityId),
          ),
        )
        .get();

      if (stillExists?.id) {
        return { saved: true };
      }

      throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to toggle bookmark." });
    }
  },
});
