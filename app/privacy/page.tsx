import type { Metadata } from "next";
import PublicInfoChrome from "@/components/smarttools/PublicInfoChrome";

export const metadata: Metadata = {
  title: "Privacy Policy | SmartTools",
  description: "How SmartTools handles documents, account information, cookies, and your data controls.",
};

const sections = [
  { title: "Information we collect", body: "The content you process with public SmartTools is handled in your browser unless a tool clearly says otherwise. If you create an account, we store your name and email to provide account features and sync supported history." },
  { title: "What we don’t do", body: "We don’t sell your data, run third-party ad trackers, or ask for more information than we need to operate SmartTools." },
  { title: "Cookies", body: "We use a small number of essential cookies for sessions, security, and preferences. We do not use advertising cookies." },
  { title: "Your rights", body: "You can export or delete your account and its associated data at any time from your profile settings." },
] as const;

export default function PrivacyPage() {
  return (
    <PublicInfoChrome>
      <article className="mx-auto w-full max-w-[760px] px-6 py-16 lg:py-[72px]">
        <header>
          <p className="font-caption text-xs font-semibold tracking-[0.05em] text-primary uppercase">Legal · Updated May 2025</p>
          <h1 className="mt-2 font-heading text-[40px] leading-tight font-semibold tracking-[-0.04rem]">Privacy Policy</h1>
          <p className="mt-3 text-sm leading-[1.5] text-muted-foreground">A plain-language summary of how SmartTools handles your information across Paperwork, DevTools, Media, and account features.</p>
        </header>
        <div className="mt-8 flex flex-col gap-8">
          {sections.map((section) => (
            <section className="flex flex-col gap-2" key={section.title}>
              <h2 className="font-heading text-[19px] font-semibold">{section.title}</h2>
              <p className="text-[15px] leading-[1.6] text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </PublicInfoChrome>
  );
}
