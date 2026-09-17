export const WHATSAPP_DISPLAY_NUMBER = "01865161244";
export const WHATSAPP_INTL_NUMBER = "8801865161244";

/**
 * Generates an official wa.me link with dynamically inserted course name.
 * Safe and privacy-conscious: does not expose private student information.
 */
export function getWhatsAppEnrollmentUrl(courseTitle: string, locale: "en" | "bn" = "en"): string {
  const cleanTitle = courseTitle.trim();
  const text =
    locale === "bn"
      ? `হ্যালো, আমি InsideJibon-এ "${cleanTitle}" কোর্সে ভর্তি হতে চাই।`
      : `Hi, I would like to enroll in "${cleanTitle}" on InsideJibon.`;

  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(text)}`;
}
