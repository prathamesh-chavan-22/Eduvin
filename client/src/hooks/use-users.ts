import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type UserList = z.infer<typeof api.users.list.responses[200]>;

export function useUsers() {
  return useQuery<UserList>({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}
