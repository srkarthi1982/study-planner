import { ActionError, defineAction } from "astro:actions";
import {
  StudyPlans,
  StudySessions,
  StudyTasks,
  and,
  count,
  db,
  desc,
  eq,
  inArray,
} from "astro:db";
import { z } from "astro:schema";
import { requirePro, requireUser } from "./_guards";
import { FREE_LIMITS } from "../lib/freeLimits";
import { buildStudyPlannerDashboardSummary } from "../dashboard/summary.schema";
import { pushStudyPlannerSummary } from "../lib/pushActivity";
import { notifyParent } from "../lib/notifyParent";

const parseNumberId = (value: string | number, label: string) => {
  const raw = typeof value === "string" ? Number.parseInt(value, 10) : value;
  if (!Number.isFinite(raw) || raw <= 0) {
    throw new ActionError({ code: "BAD_REQUEST", message: `${label} is invalid.` });
  }
  return raw;
};

const requirePlan = async (userId: string, planId: number) => {
  const plan = await db
    .select()
    .from(StudyPlans)
    .where(and(eq(StudyPlans.id, planId), eq(StudyPlans.ownerId, userId)))
    .get();

  if (!plan) {
    throw new ActionError({ code: "NOT_FOUND", message: "Plan not found." });
  }

  return plan;
};

const requireTask = async (planId: number, taskId: number) => {
  const task = await db
    .select()
    .from(StudyTasks)
    .where(and(eq(StudyTasks.id, taskId), eq(StudyTasks.planId, planId)))
    .get();

  if (!task) {
    throw new ActionError({ code: "NOT_FOUND", message: "Task not found." });
  }

  return task;
};

const getPlanIds = async (userId: string) => {
  const plans = await db
    .select({ id: StudyPlans.id })
    .from(StudyPlans)
    .where(eq(StudyPlans.ownerId, userId));
  return plans.map((plan) => plan.id);
};

const enforcePlanLimit = async (context: Parameters<typeof requireUser>[0], userId: string) => {
  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(StudyPlans)
    .where(eq(StudyPlans.ownerId, userId));

  if (Number(total ?? 0) >= FREE_LIMITS.maxPlans) {
    requirePro(context);
  }
};

const enforceTaskLimit = async (context: Parameters<typeof requireUser>[0], userId: string) => {
  const planIds = await getPlanIds(userId);
  const total = planIds.length
    ? await db
        .select({ total: count() })
        .from(StudyTasks)
        .where(inArray(StudyTasks.planId, planIds))
    : [{ total: 0 }];

  if (Number(total?.[0]?.total ?? 0) >= FREE_LIMITS.maxTasks) {
    requirePro(context);
  }
};

const enforceLogLimit = async (context: Parameters<typeof requireUser>[0], userId: string) => {
  const planIds = await getPlanIds(userId);
  const total = planIds.length
    ? await db
        .select({ total: count() })
        .from(StudySessions)
        .where(inArray(StudySessions.planId, planIds))
    : [{ total: 0 }];

  if (Number(total?.[0]?.total ?? 0) >= FREE_LIMITS.maxLogs) {
    requirePro(context);
  }
};

const emitCompletionNotification = async (params: {
  userId: string;
  planId: number;
  taskTitle: string;
}) => {
  const url = `/plans/${params.planId}`;
  await notifyParent({
    userId: params.userId,
    eventType: "task.completed",
    title: `Task completed: ${params.taskTitle}`,
    url,
  });
};

const emitDueNotification = async (params: {
  userId: string;
  planId: number;
  taskTitle: string;
  type: "task.due" | "task.overdue";
}) => {
  const url = `/plans/${params.planId}`;
  const title =
    params.type === "task.overdue"
      ? `Task overdue: ${params.taskTitle}`
      : `Task due today: ${params.taskTitle}`;

  await notifyParent({
    userId: params.userId,
    eventType: params.type,
    title,
    url,
  });
};

const pushSummary = async (userId: string, eventType: string) => {
  const summary = await buildStudyPlannerDashboardSummary(userId);
  await pushStudyPlannerSummary({ userId, eventType, summary });
};

const planPayloadSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  subject: z.string().optional(),
  tags: z.string().optional(),
});

const taskPayloadSchema = z.object({
  planId: z.union([z.number(), z.string()]),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
});

const logPayloadSchema = z.object({
  planId: z.union([z.number(), z.string()]),
  taskId: z.union([z.number(), z.string()]).optional(),
  occurredAt: z.coerce.date().optional(),
  minutes: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const listPlans = defineAction({
  handler: async (_, context) => {
    const user = requireUser(context);

    const plans = await db
      .select()
      .from(StudyPlans)
      .where(eq(StudyPlans.ownerId, user.id))
      .orderBy(desc(StudyPlans.updatedAt), desc(StudyPlans.createdAt), desc(StudyPlans.id));

    const planIds = plans.map((plan) => plan.id);
    const tasks = planIds.length
      ? await db.select().from(StudyTasks).where(inArray(StudyTasks.planId, planIds))
      : [];

    const countsByPlan = tasks.reduce<Record<number, number>>((acc, task) => {
      acc[task.planId] = (acc[task.planId] ?? 0) + 1;
      return acc;
    }, {});

    const enriched = plans.map((plan) => ({
      ...plan,
      tasksCount: countsByPlan[plan.id] ?? 0,
    }));

    return { plans: enriched };
  },
});

export const createPlan = defineAction({
  input: planPayloadSchema,
  handler: async (input, context) => {
    const user = requireUser(context);
    await enforcePlanLimit(context, user.id);

    const [plan] = await db
      .insert(StudyPlans)
      .values({
        ownerId: user.id,
        title: input.title,
        description: input.description,
        subject: input.subject,
        tags: input.tags,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (plan) {
      await pushSummary(user.id, "plan.created");
    }

    return { plan };
  },
});

export const updatePlan = defineAction({
  input: planPayloadSchema
    .partial()
    .extend({ id: z.union([z.number(), z.string()]) }),
  handler: async (input, context) => {
    const user = requireUser(context);
    const planId = parseNumberId(input.id, "Plan id");
    await requirePlan(user.id, planId);

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (typeof input.title !== "undefined") updateValues.title = input.title;
    if (typeof input.description !== "undefined") updateValues.description = input.description;
    if (typeof input.subject !== "undefined") updateValues.subject = input.subject;
    if (typeof input.tags !== "undefined") updateValues.tags = input.tags;

    const [plan] = await db
      .update(StudyPlans)
      .set(updateValues)
      .where(and(eq(StudyPlans.id, planId), eq(StudyPlans.ownerId, user.id)))
      .returning();

    if (plan) {
      await pushSummary(user.id, "plan.updated");
    }

    return { plan };
  },
});

export const archivePlan = defineAction({
  input: z.object({ id: z.union([z.number(), z.string()]) }),
  handler: async (input, context) => {
    const user = requireUser(context);
    const planId = parseNumberId(input.id, "Plan id");
    await requirePlan(user.id, planId);

    const [plan] = await db
      .update(StudyPlans)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(StudyPlans.id, planId), eq(StudyPlans.ownerId, user.id)))
      .returning();

    if (plan) {
      await pushSummary(user.id, "plan.archived");
    }

    return { plan };
  },
});

export const getPlanDetail = defineAction({
  input: z.object({ id: z.union([z.number(), z.string()]) }),
  handler: async (input, context) => {
    const user = requireUser(context);
    const planId = parseNumberId(input.id, "Plan id");
    const plan = await requirePlan(user.id, planId);

    const tasks = await db
      .select()
      .from(StudyTasks)
      .where(eq(StudyTasks.planId, planId))
      .orderBy(desc(StudyTasks.updatedAt), desc(StudyTasks.createdAt), desc(StudyTasks.id));

    return { plan, tasks };
  },
});

export const createTask = defineAction({
  input: taskPayloadSchema,
  handler: async (input, context) => {
    const user = requireUser(context);
    const planId = parseNumberId(input.planId, "Plan id");
    await requirePlan(user.id, planId);
    await enforceTaskLimit(context, user.id);

    const [task] = await db
      .insert(StudyTasks)
      .values({
        planId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        estimatedMinutes: input.estimatedMinutes,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (task) {
      await pushSummary(user.id, "task.created");
    }

    return { task };
  },
});

export const updateTask = defineAction({
  input: taskPayloadSchema
    .partial()
    .extend({ id: z.union([z.number(), z.string()]) }),
  handler: async (input, context) => {
    const user = requireUser(context);
    const taskId = parseNumberId(input.id, "Task id");
    if (typeof input.planId === "undefined") {
      throw new ActionError({ code: "BAD_REQUEST", message: "Plan id is required." });
    }
    const planId = parseNumberId(input.planId, "Plan id");
    await requirePlan(user.id, planId);

    const existing = await requireTask(planId, taskId);
    const newStatus = input.status ?? existing.status;
    const completedAt = newStatus === "done" ? existing.completedAt ?? new Date() : null;

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      status: newStatus,
      completedAt,
    };
    if (typeof input.title !== "undefined") updateValues.title = input.title;
    if (typeof input.description !== "undefined") updateValues.description = input.description;
    if (typeof input.dueDate !== "undefined") updateValues.dueDate = input.dueDate;
    if (typeof input.estimatedMinutes !== "undefined") {
      updateValues.estimatedMinutes = input.estimatedMinutes;
    }

    const [task] = await db
      .update(StudyTasks)
      .set(updateValues)
      .where(and(eq(StudyTasks.id, taskId), eq(StudyTasks.planId, planId)))
      .returning();

    if (task) {
      if (existing.status !== "done" && task.status === "done") {
        await emitCompletionNotification({
          userId: user.id,
          planId,
          taskTitle: task.title,
        });
      }
      await pushSummary(user.id, "task.updated");
    }

    return { task };
  },
});

export const deleteTask = defineAction({
  input: z.object({
    id: z.union([z.number(), z.string()]),
    planId: z.union([z.number(), z.string()]),
  }),
  handler: async (input, context) => {
    const user = requireUser(context);
    const taskId = parseNumberId(input.id, "Task id");
    const planId = parseNumberId(input.planId, "Plan id");
    await requirePlan(user.id, planId);

    const [task] = await db
      .delete(StudyTasks)
      .where(and(eq(StudyTasks.id, taskId), eq(StudyTasks.planId, planId)))
      .returning();

    if (!task) {
      throw new ActionError({ code: "NOT_FOUND", message: "Task not found." });
    }

    await pushSummary(user.id, "task.deleted");

    return { task };
  },
});

export const createLog = defineAction({
  input: logPayloadSchema,
  handler: async (input, context) => {
    const user = requireUser(context);
    const planId = parseNumberId(input.planId, "Plan id");
    await requirePlan(user.id, planId);
    await enforceLogLimit(context, user.id);

    const taskId = input.taskId ? parseNumberId(input.taskId, "Task id") : undefined;
    if (taskId) {
      await requireTask(planId, taskId);
    }

    const occurredAt = input.occurredAt ?? new Date();
    const minutes = Number(input.minutes ?? 0);

    const [log] = await db
      .insert(StudySessions)
      .values({
        planId,
        taskId,
        startedAt: occurredAt,
        endedAt: minutes > 0 ? new Date(occurredAt.getTime() + minutes * 60000) : null,
        durationMinutes: minutes,
        notes: input.notes,
        createdAt: new Date(),
      })
      .returning();

    if (log) {
      await pushSummary(user.id, "log.created");
    }

    return { log };
  },
});

export const listLogs = defineAction({
  handler: async (_, context) => {
    const user = requireUser(context);
    const planIds = await getPlanIds(user.id);

    const logs = planIds.length
      ? await db
          .select()
          .from(StudySessions)
          .where(inArray(StudySessions.planId, planIds))
          .orderBy(desc(StudySessions.startedAt), desc(StudySessions.createdAt), desc(StudySessions.id))
      : [];

    const plans = planIds.length
      ? await db.select().from(StudyPlans).where(inArray(StudyPlans.id, planIds))
      : [];
    const planMap = plans.reduce<Record<number, string>>((acc, plan) => {
      acc[plan.id] = plan.title;
      return acc;
    }, {});

    const taskIds = logs.map((log) => log.taskId).filter((id): id is number => Boolean(id));
    const tasks = taskIds.length
      ? await db.select().from(StudyTasks).where(inArray(StudyTasks.id, taskIds))
      : [];
    const taskMap = tasks.reduce<Record<number, string>>((acc, task) => {
      acc[task.id] = task.title;
      return acc;
    }, {});

    const enriched = logs.map((log) => ({
      ...log,
      planTitle: planMap[log.planId] ?? "",
      taskTitle: log.taskId ? taskMap[log.taskId] ?? "" : "",
    }));

    return { logs: enriched };
  },
});

export const getTodaySnapshot = defineAction({
  handler: async (_, context) => {
    const user = requireUser(context);
    const planIds = await getPlanIds(user.id);

    const tasks = planIds.length
      ? await db.select().from(StudyTasks).where(inArray(StudyTasks.planId, planIds))
      : [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const dueToday = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") return false;
      const due = new Date(task.dueDate);
      return due >= todayStart && due < tomorrowStart;
    });

    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") return false;
      const due = new Date(task.dueDate);
      return due < todayStart;
    });

    const upcoming = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") return false;
      const due = new Date(task.dueDate);
      return due >= tomorrowStart;
    });

    const now = new Date();

    for (const task of dueToday) {
      if (!task.dueNotifiedAt) {
        void emitDueNotification({
          userId: user.id,
          planId: task.planId,
          taskTitle: task.title,
          type: "task.due",
        });
        await db
          .update(StudyTasks)
          .set({ dueNotifiedAt: now, updatedAt: new Date() })
          .where(eq(StudyTasks.id, task.id));
      }
    }

    for (const task of overdue) {
      if (!task.overdueNotifiedAt) {
        void emitDueNotification({
          userId: user.id,
          planId: task.planId,
          taskTitle: task.title,
          type: "task.overdue",
        });
        await db
          .update(StudyTasks)
          .set({ overdueNotifiedAt: now, updatedAt: new Date() })
          .where(eq(StudyTasks.id, task.id));
      }
    }

    return { dueToday, overdue, upcoming };
  },
});
