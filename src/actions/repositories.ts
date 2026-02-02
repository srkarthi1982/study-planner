import { StudyLogs, StudyPlanTasks, StudyPlans } from "astro:db";
import { BaseRepository } from "./baseRepository";

type PlanRow = typeof StudyPlans.$inferSelect;
type TaskRow = typeof StudyPlanTasks.$inferSelect;
type LogRow = typeof StudyLogs.$inferSelect;

export const planRepository = new BaseRepository<typeof StudyPlans, PlanRow>(StudyPlans);
export const taskRepository = new BaseRepository<typeof StudyPlanTasks, TaskRow>(StudyPlanTasks);
export const logRepository = new BaseRepository<typeof StudyLogs, LogRow>(StudyLogs);
