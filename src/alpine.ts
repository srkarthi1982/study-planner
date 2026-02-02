import type { Alpine } from "alpinejs";
import { registerStudyPlannerStore } from "./modules/study-planner/store";

export default function initAlpine(Alpine: Alpine) {
  registerStudyPlannerStore(Alpine);
}
