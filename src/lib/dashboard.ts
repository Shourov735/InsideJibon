export type AppRole = "student" | "teacher" | "admin" | "parent";

/**
 * Landing path for each application role. Used by post-auth redirects
 * and navigation so every role lands on its own workspace.
 */
export function dashboardPathForRole(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
    default:
      return "/student";
  }
}
