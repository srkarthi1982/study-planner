import {
  archivePlan,
  createLog,
  createPlan,
  createTask,
  deletePlan,
  deleteTask,
  getDashboardSummary,
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
  deletePlan,
  getPlanDetail,
  getDashboardSummary,
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
