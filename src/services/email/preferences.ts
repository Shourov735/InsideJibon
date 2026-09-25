"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import {
  addUnsubscribe,
  removeUnsubscribe,
} from "@/services/email/unsubscribe";
import {
  UNSUBSCRIBEABLE_CATEGORIES,
  type UnsubscribeableCategory,
} from "@/db/schema";

/**
 * R10 — Server actions for /account/emails.
 *
 * Toggles a single category of email opt-in for the current user. The
 * action is idempotent — calling addUnsubscribe on an already-
 * unsubscribed row is a DELETE+INSERT that still resolves to one row
 * (UNIQUE on (email, category)).
 *
 * Transactional emails cannot be toggled: the schema throws
 * `NotUnsubscribableError`. We surface that as `ok: false` for the UI.
 */

const toggleSchema = z.object({
  category: z.enum([
    UNSUBSCRIBEABLE_CATEGORIES[0],
    ...UNSUBSCRIBEABLE_CATEGORIES.slice(1),
  ] as [UnsubscribeableCategory, ...UnsubscribeableCategory[]]),
  enabled: z.coerce.boolean(),
});

export type ToggleResult = {
  ok: boolean;
  error?: string;
};

export async function toggleEmailCategoryAction(
  formData: FormData
): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const parsed = toggleSchema.safeParse({
    category: formData.get("category"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid preferences payload." };
  }
  const { category, enabled } = parsed.data;
  try {
    if (enabled) {
      await removeUnsubscribe({ email: user.email, category });
    } else {
      await addUnsubscribe({
        email: user.email,
        category,
        userId: user.id,
      });
    }
    revalidatePath("/account/emails");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error)?.message ?? "Could not save preferences.",
    };
  }
}

export async function setAllEmailCategoriesAction(
  formData: FormData
): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const enabled = formData.get("enabled") === "true";
  try {
    for (const category of UNSUBSCRIBEABLE_CATEGORIES) {
      if (enabled) {
        await removeUnsubscribe({ email: user.email, category });
      } else {
        await addUnsubscribe({
          email: user.email,
          category,
          userId: user.id,
        });
      }
    }
    revalidatePath("/account/emails");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error)?.message ?? "Could not save preferences.",
    };
  }
}
