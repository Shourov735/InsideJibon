export type AppRole = "student" | "teacher" | "admin";

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
    default:
      return "/student";
  }
}
