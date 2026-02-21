import {
  archivePlan,
  createLog,
  createPlan,
  createTask,
  deleteTask,
  getPlanDetail,
  getTodaySnapshot,
  listPlanBookmarks,
  listLogs,
  listPlans,
  toggleBookmark,
  updatePlan,
  updateTask,
} from "./studyPlanner";

export const studyPlanner = {
  listPlans,
  listPlanBookmarks,
  createPlan,
  updatePlan,
  archivePlan,
  getPlanDetail,
  createTask,
  updateTask,
  deleteTask,
  createLog,
  listLogs,
  getTodaySnapshot,
  toggleBookmark,
};

export const server = {
  studyPlanner,
};
