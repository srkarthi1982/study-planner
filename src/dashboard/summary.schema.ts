import {
  StudyPlans,
  StudySessions,
  StudyTasks,
  and,
  count,
  db,
  eq,
  inArray,
} from "astro:db";

export type StudyPlannerDashboardSummaryV1 = {
  version: 1;
  generatedAt: string;
  totals: {
    plans: number;
    activePlans: number;
    tasks: number;
    tasksCompleted: number;
    tasksDueToday: number;
  };
  activity: {
    logsThisWeek: number;
    minutesThisWeek: number;
    lastCompletedTaskAt?: string | null;
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
  const generatedAt = new Date().toISOString();

  const [{ total: plansRaw } = { total: 0 }] = await db
    .select({ total: count() })
    .from(StudyPlans)
    .where(eq(StudyPlans.ownerId, userId));

  const [{ total: activeRaw } = { total: 0 }] = await db
    .select({ total: count() })
    .from(StudyPlans)
    .where(and(eq(StudyPlans.ownerId, userId), eq(StudyPlans.status, "active")));

  const planRows = await db
    .select({ id: StudyPlans.id })
    .from(StudyPlans)
    .where(eq(StudyPlans.ownerId, userId));

  const planIds = planRows.map((row) => row.id);

  const tasks = planIds.length
    ? await db.select().from(StudyTasks).where(inArray(StudyTasks.planId, planIds))
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

  const sessions = planIds.length
    ? await db.select().from(StudySessions).where(inArray(StudySessions.planId, planIds))
    : [];

  const sessionsThisWeek = sessions.filter((session) => {
    const created = session.startedAt ?? session.createdAt;
    if (!created) return false;
    const value = new Date(created);
    return value >= weekStart;
  });

  const minutesThisWeek = sessionsThisWeek.reduce(
    (sum, session) => sum + Number(session.durationMinutes ?? 0),
    0,
  );

  const lastCompletedTask = tasks
    .filter((task) => task.completedAt)
    .sort((a, b) => {
      const aDate = new Date(a.completedAt as Date).getTime();
      const bDate = new Date(b.completedAt as Date).getTime();
      return bDate - aDate;
    })[0];

  return {
    version: 1,
    generatedAt,
    totals: {
      plans: Number(plansRaw ?? 0),
      activePlans: Number(activeRaw ?? 0),
      tasks: tasks.length,
      tasksCompleted,
      tasksDueToday,
    },
    activity: {
      logsThisWeek: sessionsThisWeek.length,
      minutesThisWeek,
      lastCompletedTaskAt: toIso(lastCompletedTask?.completedAt),
    },
  };
};
