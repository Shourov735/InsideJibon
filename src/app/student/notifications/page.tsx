import { requireStudent } from "@/lib/permissions";
import { getUserNotifications } from "@/services/notifications";
import { getTranslator } from "@/i18n/server";
import { markReadAction, markAllReadAction, deleteNotificationAction } from "@/app/student/actions";
import Link from "next/link";

export default async function NotificationsPage() {
  const user = await requireStudent();
  const notifications = await getUserNotifications(user.id);
  const t = await getTranslator();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("student.notifications.title")}
          </h1>
          <p className="text-xs text-secondary mt-1">
            {notifications.filter((n) => !n.isRead).length} unread notifications
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <form action={markAllReadAction}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container-low transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t("student.notifications.markAllRead")}
            </button>
          </form>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bento-card-static p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high text-secondary mb-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="font-display text-base font-bold text-on-surface">{t("student.notifications.empty")}</h2>
            <p className="mt-1 text-xs text-secondary max-w-sm mx-auto">
              {t("student.notifications.emptyDesc")}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bento-card-static p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                notification.isRead
                  ? "bg-surface-container-lowest"
                  : "bg-primary-container/5 border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    notification.isRead
                      ? "bg-surface-container-high text-secondary"
                      : "bg-primary text-on-primary"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${notification.isRead ? "text-on-surface" : "text-primary"}`}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                  <span className="text-[10px] text-secondary mt-1 block">
                    {new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {notification.link && (
                  <Link
                    href={notification.link}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary shadow-2xs hover:bg-primary-container transition-colors"
                  >
                    View
                  </Link>
                )}

                {!notification.isRead && (
                  <form action={markReadAction.bind(null, notification.id)}>
                    <button
                      title={t("student.notifications.markRead")}
                      className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </form>
                )}

                <form action={deleteNotificationAction.bind(null, notification.id)}>
                  <button
                    title={t("student.notifications.delete")}
                    className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
