import { defineDb } from "astro:db";
import {
  Bookmark,
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
    Bookmark,
    Faq,
  },
});
