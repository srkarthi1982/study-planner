import { defineDb } from "astro:db";
import {
  StudyPlans,
  StudyTasks,
  StudySessions,
  StudyReminders,
} from "./tables";

export default defineDb({
  tables: {
    StudyPlans,
    StudyTasks,
    StudySessions,
    StudyReminders,
  },
});
