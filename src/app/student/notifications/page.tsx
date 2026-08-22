import { StudentNav } from "@/components/student/student-nav";
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
    <div className="min-h-screen bg-surface-container-lowest">
      <StudentNav user={user} />
      
      <main className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-on-surface">Notifications</h1>
          <form action={markAllReadAction}>
            <button className="text-sm text-primary hover:underline">
              Mark all as read
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-low rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-secondary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <h3 className="text-lg font-medium text-on-surface">No notifications</h3>
              <p className="text-secondary">You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border ${
                  notification.isRead
                    ? "bg-surface-container-lowest border-outline-variant"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className={`text-base font-semibold ${notification.isRead ? "text-on-surface" : "text-primary"}`}>
                    {notification.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                    {notification.body}
                  </p>
                  <div className="text-xs text-secondary mt-2">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="text-sm font-medium text-primary hover:underline px-3 py-1.5"
                    >
                      View
                    </Link>
                  )}
                  
                  {!notification.isRead && (
                    <form action={markReadAction.bind(null, notification.id)}>
                      <button
                        title="Mark as read"
                        className="p-1.5 text-secondary hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </button>
                    </form>
                  )}
                  
                  <form action={deleteNotificationAction.bind(null, notification.id)}>
                    <button
                      title="Delete"
                      className="p-1.5 text-error hover:bg-error/10 rounded-full transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
