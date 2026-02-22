import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";
import { actions } from "astro:actions";
import type { LogForm, PlanForm, StudyLogDTO, StudyPlanDTO, StudyTaskDTO, TaskForm } from "./types";

const defaultPlanForm = (): PlanForm => ({
  title: "",
  description: "",
  subject: "",
  tags: "",
});

const defaultTaskForm = (): TaskForm => ({
  title: "",
  description: "",
  dueDate: "",
  estimatedMinutes: "",
});

const defaultLogForm = (): LogForm => ({
  planId: "",
  taskId: "",
  occurredAt: "",
  minutes: "",
  notes: "",
});

const defaultState = () => ({
  plans: [] as StudyPlanDTO[],
  bookmarks: new Set<string>(),
  currentPlan: null as StudyPlanDTO | null,
  tasks: [] as StudyTaskDTO[],
  today: {
    dueToday: [] as StudyTaskDTO[],
    overdue: [] as StudyTaskDTO[],
    upcoming: [] as StudyTaskDTO[],
  },
  logs: [] as StudyLogDTO[],
  newPlan: defaultPlanForm(),
  newTask: defaultTaskForm(),
  newLog: defaultLogForm(),
  loading: false,
  error: null as string | null,
  success: null as string | null,
  pendingDeleteTaskId: null as number | null,
  pendingDeleteTaskTitle: null as string | null,
  pendingDeleteTaskPlanId: null as number | null,
  isPaid: false,
});

export class StudyPlannerStore extends AvBaseStore implements ReturnType<typeof defaultState> {
  plans: StudyPlanDTO[] = [];
  bookmarks: Set<string> = new Set();
  currentPlan: StudyPlanDTO | null = null;
  tasks: StudyTaskDTO[] = [];
  today = { dueToday: [] as StudyTaskDTO[], overdue: [] as StudyTaskDTO[], upcoming: [] as StudyTaskDTO[] };
  logs: StudyLogDTO[] = [];
  newPlan: PlanForm = defaultPlanForm();
  newTask: TaskForm = defaultTaskForm();
  newLog: LogForm = defaultLogForm();
  loading = false;
  error: string | null = null;
  success: string | null = null;
  pendingDeleteTaskId: number | null = null;
  pendingDeleteTaskTitle: string | null = null;
  pendingDeleteTaskPlanId: number | null = null;
  isPaid = false;

  init(initial?: Partial<ReturnType<typeof defaultState>>) {
    if (!initial) return;
    Object.assign(this, defaultState(), initial);
    this.plans = (initial.plans ?? []) as StudyPlanDTO[];
    this.bookmarks = initial.bookmarks instanceof Set
      ? new Set(Array.from(initial.bookmarks).map((id) => String(id)))
      : new Set();
    this.currentPlan = (initial.currentPlan ?? null) as StudyPlanDTO | null;
    this.tasks = (initial.tasks ?? []) as StudyTaskDTO[];
    this.logs = (initial.logs ?? []) as StudyLogDTO[];
    this.today = (initial.today ?? this.today) as typeof this.today;
  }

  private unwrap<T = any>(result: any): T {
    if (result?.error) {
      const message = result.error?.message || result.error;
      throw new Error(message || "Request failed.");
    }
    return (result?.data ?? result) as T;
  }

  setBillingStatus(isPaid: boolean) {
    this.isPaid = Boolean(isPaid);
  }

  isBookmarked(planId: string | number) {
    return this.bookmarks.has(String(planId));
  }

  private setBookmarkState(planId: string | number, saved: boolean) {
    const key = String(planId);
    const next = new Set(this.bookmarks);
    if (saved) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.bookmarks = next;
  }

  async initBookmarks() {
    try {
      const res = await actions.studyPlanner.listPlanBookmarks({});
      const data = this.unwrap<{ items?: Array<{ planId: string | number }> }>(res);
      this.bookmarks = new Set((data.items ?? []).map((item) => String(item.planId)));
    } catch {
      this.bookmarks = new Set();
    }
  }

  async toggleBookmarkPlan(plan: { id: string | number; title?: string | null }) {
    const planId = String(plan.id ?? "").trim();
    if (!planId) return;

    const wasSaved = this.isBookmarked(planId);
    this.setBookmarkState(planId, !wasSaved);

    try {
      const res = await actions.studyPlanner.toggleBookmark({
        entityType: "plan",
        entityId: planId,
        label: plan.title?.trim() || "Untitled plan",
      });
      const data = this.unwrap<{ saved?: boolean }>(res);
      this.setBookmarkState(planId, Boolean(data?.saved));
    } catch (err: any) {
      this.setBookmarkState(planId, wasSaved);
      this.error = err?.message || "Unable to update bookmark.";
    }
  }

  async loadPlans() {
    this.loading = true;
    this.error = null;

    try {
      const res = await actions.studyPlanner.listPlans();
      const data = this.unwrap<{ plans: StudyPlanDTO[] }>(res);
      this.plans = data.plans ?? [];
    } catch (err: any) {
      this.error = err?.message || "Failed to load plans.";
    } finally {
      this.loading = false;
    }
  }

  async createPlan() {
    if (!this.newPlan.title.trim()) {
      this.error = "Title is required.";
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const res = await actions.studyPlanner.createPlan({
        title: this.newPlan.title,
        description: this.newPlan.description,
        subject: this.newPlan.subject,
        tags: this.newPlan.tags,
      });
      const data = this.unwrap<{ plan: StudyPlanDTO }>(res);
      if (data?.plan) {
        this.plans = [data.plan, ...this.plans];
        this.newPlan = defaultPlanForm();
        this.success = "Plan created.";
      }
    } catch (err: any) {
      this.error = err?.message || "Unable to create plan.";
    } finally {
      this.loading = false;
    }
  }

  async loadPlanDetail(planId: number) {
    this.loading = true;
    this.error = null;

    try {
      const res = await actions.studyPlanner.getPlanDetail({ id: planId });
      const data = this.unwrap<{ plan: StudyPlanDTO; tasks: StudyTaskDTO[] }>(res);
      this.currentPlan = data.plan ?? null;
      this.tasks = data.tasks ?? [];
    } catch (err: any) {
      this.error = err?.message || "Unable to load plan.";
    } finally {
      this.loading = false;
    }
  }

  async createTask(planId: number) {
    if (!this.newTask.title.trim()) {
      this.error = "Task title is required.";
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const res = await actions.studyPlanner.createTask({
        planId,
        title: this.newTask.title,
        description: this.newTask.description,
        dueDate: this.newTask.dueDate ? new Date(this.newTask.dueDate) : undefined,
        estimatedMinutes: this.newTask.estimatedMinutes
          ? Number.parseInt(this.newTask.estimatedMinutes, 10)
          : undefined,
      });
      const data = this.unwrap<{ task: StudyTaskDTO }>(res);
      if (data?.task) {
        this.tasks = [data.task, ...this.tasks];
        this.newTask = defaultTaskForm();
        this.success = "Task created.";
      }
    } catch (err: any) {
      this.error = err?.message || "Unable to create task.";
    } finally {
      this.loading = false;
    }
  }

  async toggleTaskCompletion(task: StudyTaskDTO, planId: number) {
    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const res = await actions.studyPlanner.updateTask({
        id: task.id,
        planId,
        status: task.status === "done" ? "pending" : "done",
      });
      const data = this.unwrap<{ task: StudyTaskDTO }>(res);
      if (data?.task) {
        this.tasks = this.tasks.map((item) => (item.id === data.task.id ? data.task : item));
        this.success = data.task.status === "done" ? "Task completed." : "Task reopened.";
      }
    } catch (err: any) {
      this.error = err?.message || "Unable to update task.";
    } finally {
      this.loading = false;
    }
  }

  requestDeleteTask(task: StudyTaskDTO, planId: number) {
    const taskId = Number(task?.id);
    if (!Number.isFinite(taskId) || taskId <= 0 || !Number.isFinite(planId) || planId <= 0) return;
    this.pendingDeleteTaskId = taskId;
    this.pendingDeleteTaskPlanId = planId;
    this.pendingDeleteTaskTitle = task?.title?.trim() || null;
  }

  clearPendingDeleteTask() {
    this.pendingDeleteTaskId = null;
    this.pendingDeleteTaskTitle = null;
    this.pendingDeleteTaskPlanId = null;
  }

  async confirmDeleteTask() {
    if (!this.pendingDeleteTaskId || !this.pendingDeleteTaskPlanId) return;

    this.loading = true;
    this.error = null;
    this.success = null;

    const taskId = this.pendingDeleteTaskId;
    const planId = this.pendingDeleteTaskPlanId;

    try {
      await actions.studyPlanner.deleteTask({ id: taskId, planId });
      await this.loadPlanDetail(planId);
      this.success = "Deleted.";
      this.clearPendingDeleteTask();
    } catch (err: any) {
      this.error = "Failed to delete. Please try again.";
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          (window as any).AvDialog?.open?.("study-planner-task-delete-dialog");
        }, 0);
      }
      if (import.meta.env.DEV) {
        console.warn("Failed to delete task", err);
      }
    } finally {
      this.loading = false;
    }
  }

  async loadToday() {
    this.loading = true;
    this.error = null;

    try {
      const res = await actions.studyPlanner.getTodaySnapshot();
      const data = this.unwrap<{ dueToday: StudyTaskDTO[]; overdue: StudyTaskDTO[]; upcoming: StudyTaskDTO[] }>(
        res,
      );
      this.today = {
        dueToday: data.dueToday ?? [],
        overdue: data.overdue ?? [],
        upcoming: data.upcoming ?? [],
      };
    } catch (err: any) {
      this.error = err?.message || "Unable to load today view.";
    } finally {
      this.loading = false;
    }
  }

  async loadLogs() {
    this.loading = true;
    this.error = null;

    try {
      const res = await actions.studyPlanner.listLogs();
      const data = this.unwrap<{ logs: StudyLogDTO[] }>(res);
      this.logs = data.logs ?? [];
    } catch (err: any) {
      this.error = err?.message || "Unable to load logs.";
    } finally {
      this.loading = false;
    }
  }

  async createLog() {
    if (!this.newLog.planId) {
      this.error = "Select a plan first.";
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const res = await actions.studyPlanner.createLog({
        planId: Number.parseInt(this.newLog.planId, 10),
        taskId: this.newLog.taskId ? Number.parseInt(this.newLog.taskId, 10) : undefined,
        occurredAt: this.newLog.occurredAt ? new Date(this.newLog.occurredAt) : undefined,
        minutes: this.newLog.minutes ? Number.parseInt(this.newLog.minutes, 10) : undefined,
        notes: this.newLog.notes,
      });
      const data = this.unwrap<{ log: StudyLogDTO }>(res);
      if (data?.log) {
        this.logs = [data.log, ...this.logs];
        this.newLog = defaultLogForm();
        this.success = "Log saved.";
      }
    } catch (err: any) {
      this.error = err?.message || "Unable to save log.";
    } finally {
      this.loading = false;
    }
  }
}

export const registerStudyPlannerStore = (Alpine: Alpine) => {
  Alpine.store("studyPlanner", new StudyPlannerStore());
};
