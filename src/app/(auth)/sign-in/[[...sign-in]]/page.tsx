import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

import { getCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";

export const metadata = {
  title: "Sign In",
};

export default async function SignInPage() {
  // Already signed in? Skip the form and go straight to the workspace.
  const user = await getCurrentUser();
  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      {/* Explicit routing props remove any path-inference ambiguity on
          Workers deployments (a misinferred path crashes clerk-js). */}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/continue"
      />
    </div>
  );
}
