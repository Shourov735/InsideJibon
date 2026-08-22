import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

import { getCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";

export const metadata = {
  title: "Sign Up",
};

export default async function SignUpPage() {
  // Already signed in? No need for another account.
  const user = await getCurrentUser();
  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/continue"
      />
    </div>
  );
}
