import { defineDb } from "astro:db";
import {
  StudyPlans,
  StudyPlanTasks,
  StudyLogs,
} from "./tables";

export default defineDb({
  tables: {
    StudyPlans,
    StudyPlanTasks,
    StudyLogs,
  },
});
