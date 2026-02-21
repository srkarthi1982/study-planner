import {
  Bookmark,
  StudyLogs,
  StudyPlanTasks,
  StudyPlans,
  and,
  count,
  db,
  eq,
  inArray,
} from "astro:db";

export type StudyPlannerDashboardSummaryV1 = {
  appId: "study-planner";
  version: 1;
  updatedAt: string;
  totals: {
    plansTotal: number;
    plansActive: number;
    tasksTotal: number;
    tasksCompleted: number;
    tasksDueToday: number;
    logsThisWeek: number;
    bookmarksTotal: number;
  };
  recent: {
    recentPlans: Array<{ id: number; title: string; updatedAt: string | null }>;
    recentTasks: Array<{ id: number; title: string; updatedAt: string | null }>;
    recentLogs: Array<{ id: number; title: string; createdAt: string | null }>;
  };
};

const toIso = (value?: Date | string | null) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const buildStudyPlannerDashboardSummary = async (
  userId: string,
): Promise<StudyPlannerDashboardSummaryV1> => {
  const updatedAt = new Date().toISOString();

  const [{ total: plansRaw } = { total: 0 }] = await db
    .select({ total: count() })
    .from(StudyPlans)
    .where(eq(StudyPlans.ownerId, userId));

  const [{ total: activeRaw } = { total: 0 }] = await db
    .select({ total: count() })
    .from(StudyPlans)
    .where(and(eq(StudyPlans.ownerId, userId), eq(StudyPlans.status, "active")));

  const planRows = await db
    .select({
      id: StudyPlans.id,
      title: StudyPlans.title,
      updatedAt: StudyPlans.updatedAt,
    })
    .from(StudyPlans)
    .where(eq(StudyPlans.ownerId, userId));

  const planIds = planRows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));

  const tasks = planIds.length
    ? await db.select().from(StudyPlanTasks).where(inArray(StudyPlanTasks.planId, planIds))
    : [];

  const tasksCompleted = tasks.filter((task) => task.status === "done").length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const tasksDueToday = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    return due >= todayStart && due < tomorrowStart && task.status !== "done";
  }).length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const logs = planIds.length
    ? await db.select().from(StudyLogs).where(inArray(StudyLogs.planId, planIds))
    : [];

  const logsThisWeekRows = logs.filter((log) => {
    const created = log.startedAt ?? log.createdAt;
    if (!created) return false;
    const value = new Date(created);
    return value >= weekStart;
  });

  const [{ total: bookmarksRaw } = { total: 0 }] = await db
    .select({ total: count() })
    .from(Bookmark)
    .where(and(eq(Bookmark.userId, userId), eq(Bookmark.entityType, "plan")));

  const planTitleMap = new Map<number, string>(
    planRows.map((plan) => [Number(plan.id), plan.title ?? "Untitled plan"]),
  );
  const taskTitleMap = new Map<number, string>(
    tasks.map((task) => [Number(task.id), task.title ?? "Untitled task"]),
  );

  const recentPlans = [...planRows]
    .sort((a, b) => {
      const aDate = new Date(a.updatedAt ?? 0).getTime();
      const bDate = new Date(b.updatedAt ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 5)
    .map((plan) => ({
      id: Number(plan.id),
      title: plan.title ?? "Untitled plan",
      updatedAt: toIso(plan.updatedAt),
    }));

  const recentTasks = [...tasks]
    .sort((a, b) => {
      const aDate = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bDate = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 5)
    .map((task) => ({
      id: Number(task.id),
      title: task.title ?? "Untitled task",
      updatedAt: toIso(task.updatedAt ?? task.createdAt),
    }));

  const recentLogs = [...logs]
    .sort((a, b) => {
      const aDate = new Date(a.startedAt ?? a.createdAt ?? 0).getTime();
      const bDate = new Date(b.startedAt ?? b.createdAt ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 5)
    .map((log) => {
      const taskTitle = log.taskId ? taskTitleMap.get(Number(log.taskId)) : undefined;
      const planTitle = planTitleMap.get(Number(log.planId));
      const title = taskTitle || planTitle || "Study log";
      return {
        id: Number(log.id),
        title,
        createdAt: toIso(log.startedAt ?? log.createdAt),
      };
    });

  return {
    appId: "study-planner",
    version: 1,
    updatedAt,
    totals: {
      plansTotal: Number(plansRaw ?? 0),
      plansActive: Number(activeRaw ?? 0),
      tasksTotal: tasks.length,
      tasksCompleted,
      tasksDueToday,
      logsThisWeek: logsThisWeekRows.length,
      bookmarksTotal: Number(bookmarksRaw ?? 0),
    },
    recent: {
      recentPlans,
      recentTasks,
      recentLogs,
    },
  };
};
