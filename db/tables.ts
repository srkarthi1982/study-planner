import { column, defineTable, NOW } from "astro:db";

/**
 * A high-level study plan created by the user.
 * Example: "JEE 2026 Physics Plan", "Semester 1 Revision", "Weekly Study Plan".
 */
export const StudyPlans = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    ownerId: column.text(),

    title: column.text(),
    description: column.text({ optional: true }),

    // Tags or subjects
    subject: column.text({ optional: true }),
    tags: column.text({ optional: true }),

    status: column.text({
      enum: ["active", "completed", "archived"],
      default: "active",
    }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Tasks inside a study plan.
 * Example: "Read Chapter 2", "Solve 30 MCQs", "Watch 1-hour lecture"
 */
export const StudyPlanTasks = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    planId: column.number({ references: () => StudyPlans.columns.id }),

    title: column.text(),
    description: column.text({ optional: true }),

    // Optional due date
    dueDate: column.date({ optional: true }),

    // Optional estimate in minutes
    estimatedMinutes: column.number({ optional: true }),

    status: column.text({
      enum: ["pending", "in_progress", "done"],
      default: "pending",
    }),
    completedAt: column.date({ optional: true }),
    dueNotifiedAt: column.date({ optional: true }),
    overdueNotifiedAt: column.date({ optional: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Sessions recorded by the learner.
 * Useful for progress analytics.
 */
export const StudyLogs = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    planId: column.number({ references: () => StudyPlans.columns.id }),
    taskId: column.number({
      references: () => StudyPlanTasks.columns.id,
      optional: true,
    }),

    // When the study session happened
    startedAt: column.date({ default: NOW }),
    endedAt: column.date({ optional: true }),

    // Total minutes studied
    durationMinutes: column.number({ default: 0 }),

    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

export const studyPlannerTables = {
  StudyPlans,
  StudyPlanTasks,
  StudyLogs,
} as const;
