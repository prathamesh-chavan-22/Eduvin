import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"), // 'l_and_d', 'manager', 'employee'
  preferredLanguage: text("preferred_language").default("en"), // 'en', 'hi', 'mr'
  createdAt: timestamp("created_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("draft"), // 'draft', 'published'
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  objectives: text("objectives").array(),
  audience: text("audience"),
  depth: text("depth"), // 'beginner', 'intermediate', 'advanced'
  generationStatus: text("generation_status"),
  generationProgress: text("generation_progress"),
});

export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  quiz: text("quiz"), // JSON stringified quiz data
  audioUrl: text("audio_url"),
  images: json("images"), // Array of image URLs
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  courseId: integer("course_id").references(() => courses.id),
  status: text("status").notNull().default("assigned"), // 'assigned', 'in_progress', 'completed'
  progressPct: integer("progress_pct").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  // Unique constraint to prevent duplicate enrollments
  userCourseUnique: unique("uix_user_course").on(table.userId, table.courseId),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const speakingTopics = pgTable("speaking_topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const speakingLessons = pgTable("speaking_lessons", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => speakingTopics.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficultyLevel: integer("difficulty_level").notNull(), // 1-5
  promptTemplateEn: text("prompt_template_en").notNull(),
  promptTemplateHi: text("prompt_template_hi"),
  promptTemplateMr: text("prompt_template_mr"),
  targetVocabulary: json("target_vocabulary"),
  exampleResponse: text("example_response"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLessonProgress = pgTable("user_lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lessonId: integer("lesson_id").references(() => speakingLessons.id).notNull(),
  attempts: integer("attempts").notNull().default(0),
  bestScore: doublePrecision("best_score"),
  completed: boolean("completed").notNull().default(false),
  lastPracticedAt: timestamp("last_practiced_at"),
  completedAt: timestamp("completed_at"),
});

export const speakingPractices = pgTable("speaking_practices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  lessonId: integer("lesson_id").references(() => speakingLessons.id),
  prompt: text("prompt").notNull(),
  transcript: text("transcript"),
  audioUrl: text("audio_url"),
  pronunciationScore: doublePrecision("pronunciation_score"),
  fluencyScore: doublePrecision("fluency_score"),
  vocabularyScore: doublePrecision("vocabulary_score"),
  grammarScore: doublePrecision("grammar_score"),
  feedback: text("feedback"),
  corrections: text("corrections"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workflowAnalyses = pgTable("workflow_analyses", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").references(() => users.id),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"),
  columnMapping: json("column_mapping"),
  totalEmployees: integer("total_employees").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => workflowAnalyses.id).notNull(),
  employeeName: text("employee_name").notNull(),
  department: text("department"),
  managerRemarks: text("manager_remarks"),
  aiSummary: text("ai_summary"),
  recommendedSkills: json("recommended_skills"),
  matchedCourseIds: json("matched_course_ids"),
  suggestedTrainings: json("suggested_trainings"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  notifications: many(notifications),
  speakingPractices: many(speakingPractices),
  lessonProgress: many(userLessonProgress),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, { fields: [courses.createdBy], references: [users.id] }),
  modules: many(courseModules),
  enrollments: many(enrollments),
}));

export const courseModulesRelations = relations(courseModules, ({ one }) => ({
  course: one(courses, { fields: [courseModules.courseId], references: [courses.id] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const speakingPracticesRelations = relations(speakingPractices, ({ one }) => ({
  user: one(users, { fields: [speakingPractices.userId], references: [users.id] }),
  lesson: one(speakingLessons, { fields: [speakingPractices.lessonId], references: [speakingLessons.id] }),
}));

export const speakingTopicsRelations = relations(speakingTopics, ({ many }) => ({
  lessons: many(speakingLessons),
}));

export const speakingLessonsRelations = relations(speakingLessons, ({ one, many }) => ({
  topic: one(speakingTopics, { fields: [speakingLessons.topicId], references: [speakingTopics.id] }),
  practices: many(speakingPractices),
  progress: many(userLessonProgress),
}));

export const userLessonProgressRelations = relations(userLessonProgress, ({ one }) => ({
  user: one(users, { fields: [userLessonProgress.userId], references: [users.id] }),
  lesson: one(speakingLessons, { fields: [userLessonProgress.lessonId], references: [speakingLessons.id] }),
}));

export const workflowAnalysesRelations = relations(workflowAnalyses, ({ one, many }) => ({
  creator: one(users, { fields: [workflowAnalyses.createdBy], references: [users.id] }),
  results: many(analysisResults),
}));

export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  analysis: one(workflowAnalyses, { fields: [analysisResults.analysisId], references: [workflowAnalyses.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true });
export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({ id: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, startedAt: true, completedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertSpeakingPracticeSchema = createInsertSchema(speakingPractices).omit({ id: true, createdAt: true });
export const insertSpeakingTopicSchema = createInsertSchema(speakingTopics).omit({ id: true, createdAt: true });
export const insertSpeakingLessonSchema = createInsertSchema(speakingLessons).omit({ id: true, createdAt: true });
export const insertUserLessonProgressSchema = createInsertSchema(userLessonProgress).omit({ id: true });

export const insertWorkflowAnalysisSchema = createInsertSchema(workflowAnalyses).omit({ id: true, createdAt: true, completedAt: true });
export const insertAnalysisResultSchema = createInsertSchema(analysisResults).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SpeakingPractice = typeof speakingPractices.$inferSelect;
export type InsertSpeakingPractice = z.infer<typeof insertSpeakingPracticeSchema>;
export type SpeakingTopic = typeof speakingTopics.$inferSelect;
export type InsertSpeakingTopic = z.infer<typeof insertSpeakingTopicSchema>;
export type SpeakingLesson = typeof speakingLessons.$inferSelect;
export type InsertSpeakingLesson = z.infer<typeof insertSpeakingLessonSchema>;
export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type InsertUserLessonProgress = z.infer<typeof insertUserLessonProgressSchema>;

export type WorkflowAnalysis = typeof workflowAnalyses.$inferSelect;
export type InsertWorkflowAnalysis = z.infer<typeof insertWorkflowAnalysisSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;

// Request Types
export type UpdateEnrollmentProgressRequest = { progressPct: number; status?: string };
export type CourseResponse = Course & { modules?: CourseModule[], creator?: User };
export type EnrollmentResponse = Enrollment & { course?: Course, user?: User };
