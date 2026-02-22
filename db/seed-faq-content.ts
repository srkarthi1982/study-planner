import { Faq, db, eq } from "astro:db";

type FaqItem = { category: string; question: string; answer: string };

const FAQS: FaqItem[] = [
  {
    category: "Getting Started",
    question: "How do I create a study plan?",
    answer:
      "Go to Plans, create a new plan, and define what you want to study. You can then add tasks and due dates under that plan.",
  },
  {
    category: "Tasks",
    question: "Can I edit tasks after adding them?",
    answer:
      "Yes. Tasks can be updated after creation so you can adjust content, schedule, and progress as your study needs change.",
  },
  {
    category: "Progress",
    question: "Can I mark tasks as completed?",
    answer:
      "Yes. Task completion state is tracked so you can see what is done and what still needs attention.",
  },
  {
    category: "Saving",
    question: "Are plans saved automatically?",
    answer:
      "Plan and task data are persisted in your account context through the app flows, so your progress remains available when you return.",
  },
  {
    category: "Planning",
    question: "Can I create multiple study plans?",
    answer:
      "Yes. You can maintain multiple plans in parallel for different subjects, exams, or learning goals.",
  },
];

export default async function seedFaqContent() {
  await db.delete(Faq).where(eq(Faq.audience, "user"));

  await db.insert(Faq).values(
    FAQS.map((item, index) => ({
      audience: "user",
      category: item.category,
      question: item.question,
      answer_md: item.answer,
      sort_order: index + 1,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    }))
  );

  console.log(`Seeded ${FAQS.length} production FAQs for study-planner user audience.`);
}
