export type StudyPlanDTO = {
  id: number;
  ownerId: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  tags?: string | null;
  status: "active" | "completed" | "archived";
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  tasksCount?: number;
};

export type StudyTaskDTO = {
  id: number;
  planId: number;
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  estimatedMinutes?: number | null;
  status: "pending" | "in_progress" | "done";
  completedAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type StudyLogDTO = {
  id: number;
  planId: number;
  taskId?: number | null;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  durationMinutes?: number | null;
  notes?: string | null;
  planTitle?: string;
  taskTitle?: string;
  createdAt?: string | Date | null;
};

export type PlanForm = {
  title: string;
  description: string;
  subject: string;
  tags: string;
};

export type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  estimatedMinutes: string;
};

export type LogForm = {
  planId: string;
  taskId: string;
  occurredAt: string;
  minutes: string;
  notes: string;
};
