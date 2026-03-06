import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertSpeakingPracticeSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Simple unsecure auth for MVP purposes
// In a real application this would use Passport/JWT or Replit Auth
const SESSION_SECRET = process.env.SESSION_SECRET || "development_secret";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const PgSession = connectPg(session);
  app.use(session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
  }));

  // Seed DB Function
  async function seedDatabase() {
    try {
      const users = await storage.getUsers();
      if (users.length === 0) {
        console.log("Seeding database...");
        
        const lAndD = await storage.createUser({ email: "admin@lms.local", password: "password", fullName: "Admin User", role: "l_and_d" });
        const manager = await storage.createUser({ email: "manager@lms.local", password: "password", fullName: "Manager User", role: "manager" });
        const employee = await storage.createUser({ email: "employee@lms.local", password: "password", fullName: "John Employee", role: "employee" });
        
        const course1 = await storage.createCourse({ title: "Onboarding 101", description: "Welcome to the company!", status: "published", createdBy: lAndD.id });
        await storage.createCourseModule({ courseId: course1.id, title: "Company History", content: "We started in 2024...", sortOrder: 1 });
        await storage.createCourseModule({ courseId: course1.id, title: "Code of Conduct", content: "Be nice.", sortOrder: 2 });
        
        const course2 = await storage.createCourse({ title: "Advanced Security", description: "How to keep things secure.", status: "published", createdBy: lAndD.id });
        await storage.createCourseModule({ courseId: course2.id, title: "Phishing", content: "Don't click weird links.", sortOrder: 1 });
        
        await storage.createEnrollment({ userId: employee.id, courseId: course1.id, status: "in_progress", progressPct: 50 });
        
        await storage.createNotification({ userId: employee.id, title: "Welcome", message: "Welcome to the LMS!", isRead: false });
        console.log("Database seeded successfully.");
      }
    } catch (err) {
      console.error("Error seeding database:", err);
    }
  }

  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      // Simple MVP auth
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      (req.session as any).userId = user.id;
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "User already exists", field: "email" });
      }

      const user = await storage.createUser(input);
      (req.session as any).userId = user.id;
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json(user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // User Routes
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  // Course Routes
  app.get(api.courses.list.path, async (req, res) => {
    const courses = await storage.getCourses();
    res.json(courses);
  });

  app.post(api.courses.create.path, async (req, res) => {
    try {
      const input = api.courses.create.input.parse(req.body);
      // Ensure createdBy is set correctly by parsing it as a number
      const course = await storage.createCourse({ ...input, createdBy: input.createdBy ? Number(input.createdBy) : null });
      res.status(201).json(course);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.courses.get.path, async (req, res) => {
    const course = await storage.getCourse(Number(req.params.id));
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  });

  app.get(api.courses.getModules.path, async (req, res) => {
    const modules = await storage.getCourseModules(Number(req.params.id));
    res.json(modules);
  });

  app.post(api.courses.createModule.path, async (req, res) => {
    try {
      const input = api.courses.createModule.input.parse(req.body);
      const module = await storage.createCourseModule({
        ...input,
        courseId: Number(req.params.id)
      });
      res.status(201).json(module);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  // Enrollment Routes
  app.get(api.enrollments.list.path, async (req, res) => {
    // If regular employee, only show their enrollments
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const enrollments = await storage.getEnrollments(userId);
    res.json(enrollments);
  });

  app.post(api.enrollments.create.path, async (req, res) => {
    try {
      const input = api.enrollments.create.input.parse(req.body);
      const enrollment = await storage.createEnrollment({
        ...input,
        userId: Number(input.userId),
        courseId: Number(input.courseId)
      });
      res.status(201).json(enrollment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch(api.enrollments.updateProgress.path, async (req, res) => {
    try {
      const input = api.enrollments.updateProgress.input.parse(req.body);
      const enrollment = await storage.updateEnrollmentProgress(Number(req.params.id), input);
      res.json(enrollment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(404).json({ message: "Enrollment not found" });
    }
  });

  // Notification Routes
  app.get(api.notifications.list.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  });

  app.patch(api.notifications.markRead.path, async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(Number(req.params.id));
      res.json(notification);
    } catch (err) {
      res.status(404).json({ message: "Notification not found" });
    }
  });

  // Speaking Practice Routes
  app.get("/api/speaking", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const practices = await storage.getSpeakingPractices(userId);
    res.json(practices);
  });

  app.post("/api/speaking", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const data = insertSpeakingPracticeSchema.parse({ ...req.body, userId });
      const practice = await storage.createSpeakingPractice(data);
      res.status(201).json(practice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  // Call seed DB
  seedDatabase();

  return httpServer;
}
