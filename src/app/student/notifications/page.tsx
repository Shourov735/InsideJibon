import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getUserNotifications } from "@/services/notifications";
import { getTranslator } from "@/i18n/server";
import { markReadAction, markAllReadAction, deleteNotificationAction } from "@/app/student/actions";
import { cn, formatNumber } from "@/lib/utils";

import { PageHeader } from "@/components/shared/ui/page-header";
import { Container } from "@/components/shared/ui/container";
import { Button } from "@/components/shared/ui/button";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { Badge } from "@/components/shared/ui/badge";
import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  XIcon,
} from "@/components/shared/ui/icons";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireStudent();
  const notifications = await getUserNotifications(user.id);
  const t = await getTranslator();

  const unread = notifications.filter((n) => !n.isRead);
  const dateFormatter = new Intl.DateTimeFormat(
    t.locale === "bn" ? "bn-BD" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <BellIcon size={14} />
            {t("student.notifications.title")}
          </span>
        }
        title={t("student.notifications.title")}
        description={
          unread.length > 0
            ? t("student.notifications.unreadSummary", {
                count: formatNumber(unread.length, { locale: t.locale }),
              })
            : t("student.notifications.allCaughtUp")
        }
        actions={
          unread.length > 0 ? (
            <form action={markAllReadAction}>
              <Button
                type="submit"
                variant="outline"
                size="md"
                leadingIcon={<CheckIcon size={14} />}
              >
                {t("student.notifications.markAllRead")}
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<BellIcon size={20} />}
            title={t("student.notifications.empty")}
            description={t("student.notifications.emptyDesc")}
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-outline-variant overflow-hidden rounded-3xl border border-outline-variant bg-surface-0">
          {notifications.map((notification) => {
            const unreadNow = !notification.isRead;
            return (
              <li
                key={notification.id}
                className={cn(
                  "relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5",
                  unreadNow ? "bg-primary-container/8" : "bg-surface-0",
                )}
              >
                {unreadNow ? (
                  <span
                    aria-hidden
                    className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary sm:bottom-3 sm:top-3"
                  />
                ) : null}

                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      unreadNow
                        ? "bg-primary text-on-primary"
                        : "bg-surface-1 text-ink-700",
                    )}
                  >
                    <BellIcon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          "text-sm font-semibold",
                          unreadNow ? "text-ink-900" : "text-ink-700",
                        )}
                      >
                        {notification.title}
                      </h3>
                      {unreadNow ? (
                        <Badge tone="primary" size="xs">
                          {t("student.notifications.newBadge")}
                        </Badge>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-1 line-clamp-2 text-sm",
                        unreadNow ? "text-ink-900" : "text-ink-500",
                      )}
                    >
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-500">
                      {dateFormatter.format(new Date(notification.createdAt))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 sm:shrink-0">
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="inline-flex h-9 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary/90"
                    >
                      {t("student.notifications.view")}
                      <ArrowRightIcon size={12} />
                    </Link>
                  ) : null}

                  {unreadNow ? (
                    <form action={markReadAction.bind(null, notification.id)}>
                      <button
                        type="submit"
                        title={t("student.notifications.markRead")}
                        aria-label={t("student.notifications.markRead")}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 text-ink-700 hover:bg-surface-1"
                      >
                        <CheckIcon size={14} />
                      </button>
                    </form>
                  ) : null}

                  <form action={deleteNotificationAction.bind(null, notification.id)}>
                    <button
                      type="submit"
                      title={t("student.notifications.delete")}
                      aria-label={t("student.notifications.delete")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 text-ink-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <XIcon size={14} />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
