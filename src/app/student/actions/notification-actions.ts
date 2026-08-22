"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/permissions";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/services/notifications";

export async function markReadAction(notificationId: string) {
  const user = await requireStudent();
  await markNotificationRead(user.id, notificationId);
  revalidatePath("/student/notifications");
}

export async function markAllReadAction() {
  const user = await requireStudent();
  await markAllNotificationsRead(user.id);
  revalidatePath("/student/notifications");
}

export async function deleteNotificationAction(notificationId: string) {
  const user = await requireStudent();
  await deleteNotification(user.id, notificationId);
  revalidatePath("/student/notifications");
}
