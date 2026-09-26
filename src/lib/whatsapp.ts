export const WHATSAPP_DISPLAY_NUMBER = "01865161244";
export const WHATSAPP_INTL_NUMBER = "8801865161244";

/**
 * Generates an official wa.me link with dynamically inserted course name.
 * Safe and privacy-conscious: does not expose private student information.
 */
export function getWhatsAppEnrollmentUrl(
  courseTitle: string,
  locale: "en" | "bn" = "en",
  priceBdt?: number | string | null
): string {
  const cleanTitle = courseTitle.trim();
  const priceSuffixBn = priceBdt ? ` (কোর্স ফি: ${priceBdt} ৳)` : " (কোর্স ফি: ১,০০০ ৳)";
  const priceSuffixEn = priceBdt ? ` (Course Fee: ${priceBdt} BDT)` : " (Course Fee: 1,000 BDT)";
  const text =
    locale === "bn"
      ? `হ্যালো, আমি InsideJibon-এ "${cleanTitle}" কোর্সে ভর্তি হতে চাই${priceSuffixBn}।`
      : `Hi, I would like to enroll in "${cleanTitle}" on InsideJibon${priceSuffixEn}.`;

  return `https://wa.me/${WHATSAPP_INTL_NUMBER}?text=${encodeURIComponent(text)}`;
}
