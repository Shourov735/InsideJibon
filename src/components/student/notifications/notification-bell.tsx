import Link from "next/link";

import { getUnreadNotificationCount } from "@/services/notifications";

export async function NotificationBell({ userId }: { userId: string }) {
  const count = await getUnreadNotificationCount(userId);
  const displayCount = count > 9 ? "9+" : count.toString();

  return (
    <Link href="/student/notifications" className="relative p-2 text-gray-400 hover:text-gray-500">
      <span className="sr-only">View notifications</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
      {count > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
          {displayCount}
        </span>
      )}
    </Link>
  );
}
