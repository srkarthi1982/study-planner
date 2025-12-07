import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { db, eq, and, StudyPlans, StudyTasks, StudySessions, StudyReminders } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createPlan: defineAction({
    input: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      subject: z.string().optional(),
      tags: z.string().optional(),
      status: z.enum(["active", "completed", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .insert(StudyPlans)
        .values({
          ownerId: user.id,
          title: input.title,
          description: input.description,
          subject: input.subject,
          tags: input.tags,
          status: input.status ?? "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { plan };
    },
  }),

  updatePlan: defineAction({
    input: z.object({
      id: z.number().int(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      subject: z.string().optional(),
      tags: z.string().optional(),
      status: z.enum(["active", "completed", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(StudyPlans)
        .where(and(eq(StudyPlans.id, id), eq(StudyPlans.ownerId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Plan not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { plan: existing };
      }

      const [plan] = await db
        .update(StudyPlans)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(StudyPlans.id, id), eq(StudyPlans.ownerId, user.id)))
        .returning();

      return { plan };
    },
  }),

  archivePlan: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .update(StudyPlans)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(StudyPlans.id, input.id), eq(StudyPlans.ownerId, user.id)))
        .returning();

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Plan not found.",
        });
      }

      return { plan };
    },
  }),

  listMyPlans: defineAction({
    input: z
      .object({
        status: z.enum(["active", "completed", "archived"]).optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const plans = await db
        .select()
        .from(StudyPlans)
        .where(eq(StudyPlans.ownerId, user.id));

      const filtered = input?.status
        ? plans.filter((plan) => plan.status === input.status)
        : plans;

      return { plans: filtered };
    },
  }),

  getPlanWithTasks: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(StudyPlans)
        .where(and(eq(StudyPlans.id, input.id), eq(StudyPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Plan not found.",
        });
      }

      const tasks = await db.select().from(StudyTasks).where(eq(StudyTasks.planId, input.id));

      return { plan, tasks };
    },
  }),

  saveTask: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      planId: z.number().int(),
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      dueDate: z.coerce.date().optional(),
      estimatedMinutes: z.number().int().positive().optional(),
      status: z.enum(["pending", "in_progress", "done"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(StudyPlans)
        .where(and(eq(StudyPlans.id, input.planId), eq(StudyPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Plan not found.",
        });
      }

      const baseValues = {
        planId: input.planId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        estimatedMinutes: input.estimatedMinutes,
        status: input.status ?? "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(StudyTasks)
          .where(eq(StudyTasks.id, input.id))
          .limit(1);

        if (!existing || existing.planId !== input.planId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Task not found.",
          });
        }

        const [task] = await db
          .update(StudyTasks)
          .set(baseValues)
          .where(eq(StudyTasks.id, input.id))
          .returning();

        return { task };
      }

      const [task] = await db.insert(StudyTasks).values(baseValues).returning();
      return { task };
    },
  }),

  deleteTask: defineAction({
    input: z.object({
      id: z.number().int(),
      planId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(StudyPlans)
        .where(and(eq(StudyPlans.id, input.planId), eq(StudyPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Plan not found.",
        });
      }

      const [deleted] = await db
        .delete(StudyTasks)
        .where(and(eq(StudyTasks.id, input.id), eq(StudyTasks.planId, input.planId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Task not found.",
        });
      }

      return { task: deleted };
    },
  }),

  startSession: defineAction({
    input: z.object({
      planId: z.number().int(),
      taskId: z.number().int().optional(),
      startedAt: z.coerce.date().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(StudyPlans)
        .where(and(eq(StudyPlans.id, input.planId), eq(StudyPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Plan not found.",
        });
      }

      if (input.taskId) {
        const [task] = await db
          .select()
          .from(StudyTasks)
          .where(and(eq(StudyTasks.id, input.taskId), eq(StudyTasks.planId, input.planId)))
          .limit(1);

        if (!task) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Task not found.",
          });
        }
      }

      const [session] = await db
        .insert(StudySessions)
        .values({
          planId: input.planId,
          taskId: input.taskId,
          startedAt: input.startedAt ?? new Date(),
        })
        .returning();

      return { session };
    },
  }),

  completeSession: defineAction({
    input: z.object({
      id: z.number().int(),
      endedAt: z.coerce.date().optional(),
      durationMinutes: z.number().int().nonnegative().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      requireUser(context);

      const [session] = await db
        .select()
        .from(StudySessions)
        .where(eq(StudySessions.id, input.id))
        .limit(1);

      if (!session) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      const [updated] = await db
        .update(StudySessions)
        .set({
          endedAt: input.endedAt ?? new Date(),
          durationMinutes: input.durationMinutes ?? session.durationMinutes,
          notes: input.notes ?? session.notes,
        })
        .where(eq(StudySessions.id, input.id))
        .returning();

      return { session: updated };
    },
  }),

  createReminder: defineAction({
    input: z.object({
      planId: z.number().int().optional(),
      taskId: z.number().int().optional(),
      message: z.string().min(1, "Message is required"),
      remindAt: z.coerce.date(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.planId) {
        const [plan] = await db
          .select()
          .from(StudyPlans)
          .where(and(eq(StudyPlans.id, input.planId), eq(StudyPlans.ownerId, user.id)))
          .limit(1);

        if (!plan) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Plan not found.",
          });
        }
      }

      if (input.taskId) {
        const [task] = await db
          .select()
          .from(StudyTasks)
          .where(eq(StudyTasks.id, input.taskId))
          .limit(1);

        if (!task) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Task not found.",
          });
        }
      }

      const [reminder] = await db
        .insert(StudyReminders)
        .values({
          ownerId: user.id,
          planId: input.planId,
          taskId: input.taskId,
          message: input.message,
          remindAt: input.remindAt,
          createdAt: new Date(),
        })
        .returning();

      return { reminder };
    },
  }),

  listReminders: defineAction({
    input: z
      .object({
        planId: z.number().int().optional(),
        taskId: z.number().int().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      const reminders = await db
        .select()
        .from(StudyReminders)
        .where(eq(StudyReminders.ownerId, user.id));

      const filtered = reminders.filter((reminder) => {
        const matchesPlan = input?.planId ? reminder.planId === input.planId : true;
        const matchesTask = input?.taskId ? reminder.taskId === input.taskId : true;
        return matchesPlan && matchesTask;
      });

      return { reminders: filtered };
    },
  }),
};
