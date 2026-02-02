import { StudyPlans, StudyTasks, StudySessions, StudyReminders } from "astro:db";
import { BaseRepository } from "./baseRepository";

type PlanRow = typeof StudyPlans.$inferSelect;
type TaskRow = typeof StudyTasks.$inferSelect;
type SessionRow = typeof StudySessions.$inferSelect;
type ReminderRow = typeof StudyReminders.$inferSelect;

export const planRepository = new BaseRepository<typeof StudyPlans, PlanRow>(StudyPlans);
export const taskRepository = new BaseRepository<typeof StudyTasks, TaskRow>(StudyTasks);
export const sessionRepository = new BaseRepository<typeof StudySessions, SessionRow>(StudySessions);
export const reminderRepository = new BaseRepository<typeof StudyReminders, ReminderRow>(StudyReminders);
