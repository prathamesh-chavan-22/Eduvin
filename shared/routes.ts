import { z } from "zod";
import {
  insertUserSchema,
  insertCourseSchema,
  insertCourseModuleSchema,
  insertEnrollmentSchema,
  users,
  courses,
  courseModules,
  enrollments,
  notifications,
  workflowAnalyses,
  analysisResults,
} from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: z.object({ email: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me" as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  users: {
    list: {
      method: "GET" as const,
      path: "/api/users" as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      }
    }
  },
  courses: {
    list: {
      method: "GET" as const,
      path: "/api/courses" as const,
      responses: {
        200: z.array(z.custom<typeof courses.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/courses/:id" as const,
      responses: {
        200: z.custom<typeof courses.$inferSelect>(), // Represents CourseResponse practically
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/courses" as const,
      input: insertCourseSchema,
      responses: {
        201: z.custom<typeof courses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getModules: {
      method: "GET" as const,
      path: "/api/courses/:id/modules" as const,
      responses: {
        200: z.array(z.custom<typeof courseModules.$inferSelect>()),
      },
    },
    getConceptGraph: {
      method: "GET" as const,
      path: "/api/courses/:id/concept-graph" as const,
      responses: {
        200: z.object({
          courseId: z.number(),
          mermaid: z.string(),
          status: z.string(),
          nodes: z.array(z.record(z.any())).optional(),
          edges: z.array(z.record(z.any())).optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional(),
        }),
        404: errorSchemas.notFound,
      },
    },
    regenerateConceptGraph: {
      method: "POST" as const,
      path: "/api/courses/:id/concept-graph/regenerate" as const,
      responses: {
        202: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    createModule: {
      method: "POST" as const,
      path: "/api/courses/:id/modules" as const,
      input: insertCourseModuleSchema.omit({ courseId: true }),
      responses: {
        201: z.custom<typeof courseModules.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    generate: {
      method: "POST" as const,
      path: "/api/courses/generate" as const,
      input: z.object({ title: z.string(), audience: z.string().optional(), depth: z.string().optional() }),
      responses: {
        201: z.custom<typeof courses.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  enrollments: {
    list: {
      method: "GET" as const,
      path: "/api/enrollments" as const,
      responses: {
        200: z.array(z.custom<typeof enrollments.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/enrollments" as const,
      input: insertEnrollmentSchema,
      responses: {
        201: z.custom<typeof enrollments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateProgress: {
      method: "PATCH" as const,
      path: "/api/enrollments/:id/progress" as const,
      input: z.object({ progressPct: z.number().min(0).max(100), status: z.string().optional() }),
      responses: {
        200: z.custom<typeof enrollments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  notifications: {
    list: {
      method: "GET" as const,
      path: "/api/notifications" as const,
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    markRead: {
      method: "PATCH" as const,
      path: "/api/notifications/:id/read" as const,
      responses: {
        200: z.custom<typeof notifications.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  analysis: {
    upload: {
      method: "POST" as const,
      path: "/api/analysis/upload" as const,
      responses: {
        201: z.custom<typeof workflowAnalyses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/analysis" as const,
      responses: {
        200: z.array(z.custom<typeof workflowAnalyses.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/analysis/:id" as const,
      responses: {
        200: z.custom<typeof workflowAnalyses.$inferSelect & { results: (typeof analysisResults.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
