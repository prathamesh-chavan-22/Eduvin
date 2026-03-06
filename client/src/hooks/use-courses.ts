import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Course = z.infer<typeof api.courses.list.responses[200]>[0];
type CourseList = Course[];
type CourseDetails = z.infer<typeof api.courses.get.responses[200]>;
type InsertCourse = z.infer<typeof api.courses.create.input>;
type Module = z.infer<typeof api.courses.getModules.responses[200]>[0];
type InsertModule = z.infer<typeof api.courses.createModule.input>;

export function useCourses() {
  return useQuery<CourseList>({
    queryKey: [api.courses.list.path],
    queryFn: async () => {
      const res = await fetch(api.courses.list.path);
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });
}

export function useCourse(id: number) {
  return useQuery<CourseDetails>({
    queryKey: [api.courses.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.courses.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch course details");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCourseModules(courseId: number) {
  return useQuery<Module[]>({
    queryKey: [api.courses.getModules.path, courseId],
    queryFn: async () => {
      const url = buildUrl(api.courses.getModules.path, { id: courseId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch course modules");
      return res.json();
    },
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCourse) => {
      const res = await fetch(api.courses.create.path, {
        method: api.courses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.courses.list.path] });
    },
  });
}

export function useCreateModule(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertModule) => {
      const url = buildUrl(api.courses.createModule.path, { id: courseId });
      const res = await fetch(url, {
        method: api.courses.createModule.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create module");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.courses.getModules.path, courseId] });
      queryClient.invalidateQueries({ queryKey: [api.courses.get.path, courseId] });
    },
  });
}
