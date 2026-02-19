import { defineDb } from "astro:db";
import {
  Faq,
  StudyPlans,
  StudyPlanTasks,
  StudyLogs,
} from "./tables";

export default defineDb({
  tables: {
    StudyPlans,
    StudyPlanTasks,
    StudyLogs,
    Faq,
  },
});
