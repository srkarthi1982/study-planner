import {
  archivePlan,
  createLog,
  createPlan,
  createTask,
  deleteTask,
  getPlanDetail,
  getTodaySnapshot,
  listLogs,
  listPlans,
  updatePlan,
  updateTask,
} from "./studyPlanner";

export const studyPlanner = {
  listPlans,
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
};

export const server = {
  studyPlanner,
};
