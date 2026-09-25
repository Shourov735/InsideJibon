/**
 * R10 — Cookie Policy (Bangla).
 */

export const LEGAL_VERSION = "2026-09-25.1";
export const LAST_UPDATED = "2026-09-25";

export function CookiePolicyBn(): React.ReactNode {
  return (
    <article className="prose prose-slate max-w-none">
      <section className="space-y-3">
        <h2>১. কুকি কী</h2>
        <p>
          কুকি হলো ছোট টেক্সট ফাইল যা আপনার ব্রাউজার ডিভাইসে রাখে।
          আমরা খুবই কম কুকি ব্যবহার করি এবং বিজ্ঞাপনের জন্য কখনো ব্যবহার
          করি না।
        </p>
        <h2>২. আমরা যেসব কুকি সেট করি</h2>
        <ul>
          <li>
            <strong>__session</strong> — আপনার Clerk অথেন্টিকেশন টোকেন।
            পরিষেবা চালাতে অপরিহার্য।
          </li>
          <li>
            <strong>ij_lang</strong> — আপনার পছন্দের ভাষা (en / bn)।
            সঠিক কপি দেখানোর জন্য অপরিহার্য।
          </li>
        </ul>
        <h2>৩. আমরা যেসব কুকি সেট করি না</h2>
        <ul>
          <li>তৃতীয়-পক্ষের বিজ্ঞাপনমূলক কুকি।</li>
          <li>ক্রস-সাইট অ্যানালিটিক্স কুকি।</li>
          <li>সোশ্যাল মিডিয়া ট্র্যাকিং পিক্সেল।</li>
        </ul>
        <h2>৪. আপনার পছন্দ</h2>
        <p>
          ব্রাউজার সেটিংস থেকে কুকি ব্লক করতে পারবেন, তবে উপরের দুটি
          কুকি ব্লক করলে পরিষেবা কাজ করবে না।
        </p>
      </section>
    </article>
  );
}
