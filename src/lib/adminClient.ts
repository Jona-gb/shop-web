import { useQuery } from "@tanstack/react-query";

export type StoredUser = { name: string; email: string; role: "admin" | "customer"; password?: string };
const USERS_KEY = "shopease.auth.users";

export async function fetchUsers(): Promise<StoredUser[]> {
  if (import.meta.env.SSR) return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

export async function saveUsers(users: StoredUser[]) {
  if (import.meta.env.SSR) return;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}

export async function promoteUser(email: string, role: "admin" | "customer") {
  const users = await fetchUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) throw new Error("User not found");
  users[idx] = { ...users[idx], role };
  await saveUsers(users);
  return users[idx];
}

export async function removeUser(email: string) {
  const users = await fetchUsers();
  const next = users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
  await saveUsers(next);
  return next;
}

export function useApiUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 2,
    initialData: [] as StoredUser[],
    enabled: true,
  });
}
