import { db } from "./db";
import {
  users,
  courses,
  courseModules,
  enrollments,
  notifications,
  type User,
  type InsertUser,
  type Course,
  type InsertCourse,
  type CourseModule,
  type InsertCourseModule,
  type Enrollment,
  type InsertEnrollment,
  type Notification,
  type InsertNotification,
  type UpdateEnrollmentProgressRequest,
  type CourseResponse,
  type EnrollmentResponse,
  type SpeakingPractice,
  type InsertSpeakingPractice,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Courses
  getCourses(): Promise<CourseResponse[]>;
  getCourse(id: number): Promise<CourseResponse | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  
  // Modules
  getCourseModules(courseId: number): Promise<CourseModule[]>;
  createCourseModule(module: InsertCourseModule): Promise<CourseModule>;

  // Enrollments
  getEnrollments(userId?: number): Promise<EnrollmentResponse[]>;
  getEnrollment(id: number): Promise<EnrollmentResponse | undefined>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollmentProgress(id: number, update: UpdateEnrollmentProgressRequest): Promise<Enrollment>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification>;

  // Speaking Practice
  getSpeakingPractices(userId: number): Promise<SpeakingPractice[]>;
  createSpeakingPractice(practice: InsertSpeakingPractice): Promise<SpeakingPractice>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getCourses(): Promise<CourseResponse[]> {
    const allCourses = await db.select().from(courses);
    const result: CourseResponse[] = [];
    
    for (const c of allCourses) {
      const creator = await this.getUser(c.createdBy || 0);
      result.push({ ...c, creator });
    }
    return result;
  }

  async getCourse(id: number): Promise<CourseResponse | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) return undefined;

    const modules = await this.getCourseModules(course.id);
    const creator = await this.getUser(course.createdBy || 0);
    return { ...course, modules, creator };
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(insertCourse).returning();
    return course;
  }

  async getCourseModules(courseId: number): Promise<CourseModule[]> {
    return await db.select().from(courseModules).where(eq(courseModules.courseId, courseId));
  }

  async createCourseModule(insertModule: InsertCourseModule): Promise<CourseModule> {
    const [module] = await db.insert(courseModules).values(insertModule).returning();
    return module;
  }

  async getEnrollments(userId?: number): Promise<EnrollmentResponse[]> {
    let query = db.select().from(enrollments);
    if (userId) {
      query = query.where(eq(enrollments.userId, userId)) as any;
    }
    const allEnrollments = await query;
    const result: EnrollmentResponse[] = [];

    for (const e of allEnrollments) {
      const course = await this.getCourse(e.courseId || 0);
      const user = await this.getUser(e.userId || 0);
      result.push({ ...e, course, user });
    }
    return result;
  }

  async getEnrollment(id: number): Promise<EnrollmentResponse | undefined> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, id));
    if (!enrollment) return undefined;
    
    const course = await this.getCourse(enrollment.courseId || 0);
    const user = await this.getUser(enrollment.userId || 0);
    return { ...enrollment, course, user };
  }

  async createEnrollment(insertEnrollment: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(enrollments).values({
      ...insertEnrollment,
      startedAt: new Date(),
    }).returning();
    return enrollment;
  }

  async updateEnrollmentProgress(id: number, update: UpdateEnrollmentProgressRequest): Promise<Enrollment> {
    const updateData: any = { progressPct: update.progressPct };
    if (update.status) updateData.status = update.status;
    if (update.progressPct === 100) updateData.completedAt = new Date();

    const [enrollment] = await db
      .update(enrollments)
      .set(updateData)
      .where(eq(enrollments.id, id))
      .returning();
    return enrollment;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async getSpeakingPractices(userId: number): Promise<SpeakingPractice[]> {
    return await db
      .select()
      .from(speakingPractices)
      .where(eq(speakingPractices.userId, userId))
      .orderBy(desc(speakingPractices.createdAt));
  }

  async createSpeakingPractice(practice: InsertSpeakingPractice): Promise<SpeakingPractice> {
    const [result] = await db.insert(speakingPractices).values(practice).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
