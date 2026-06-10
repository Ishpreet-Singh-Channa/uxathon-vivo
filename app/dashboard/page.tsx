"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Gamepad2, MessageCircle, Users } from "lucide-react";
import { useEffect } from "react";
import { AnimatedBanner } from "@/components/AnimatedBanner";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/context/token-context";

type BannerConfig = {
  text?: string;
  subHeader?: string;
  effect?: "blur-reveal" | "masked-slide" | "highlight" | "marquee" | "scramble";
  speed?: number;
  blurStrength?: number;
  font?: "sans" | "mono" | "display";
  mainFontSize?: number;
  repeat?: boolean;
  color?: string;
};

const GET_LIVE_BANNER = gql`
  query GetLiveBanner {
    banner_by_pk(id: 1) {
      data
    }
  }
`;

const actionItems = [
  {
    title: "Team",
    href: "/myteam",
    meta: "team / assignment",
    body: "View your current team, members, and persona assignment.",
    icon: Users,
  },
  {
    title: "Human Benchmarking",
    href: "/games",
    meta: "games / benchmark",
    body: "Run the local cognitive and reaction challenges.",
    icon: Gamepad2,
  },
  {
    title: "Live Chat",
    href: "/live",
    meta: "live / chat + polls",
    body: "Open the Hasura-backed event chat and active polls.",
    icon: MessageCircle,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined" && !auth.getJwt()) {
      router.replace("/login");
    }
  }, [auth, router]);

  const { data } = useQuery<{ banner_by_pk: { data: BannerConfig | null } }>(GET_LIVE_BANNER);
  const bannerConfig = data?.banner_by_pk?.data;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] pb-20 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
          UXISM<span className="text-[#5b5b5b]">/</span>DASHBOARD
        </p>
        <button
          type="button"
          onClick={() => {
            auth.logout();
            router.replace("/login");
          }}
          className="h-10 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
        >
          Logout
        </button>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-5 pt-8">
        {bannerConfig?.text ? (
          <div className="flex w-full flex-col items-center border border-[#2e2e2e] bg-[#171717]/80 p-6">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[#DEF767]">
              [ {bannerConfig.subHeader || "LIVE RUNNING BROADCAST"} ]
            </div>
            <AnimatedBanner
              text={bannerConfig.text}
              effect={bannerConfig.effect || "blur-reveal"}
              speed={bannerConfig.speed}
              blurStrength={bannerConfig.blurStrength}
              font={bannerConfig.font}
              fontSize={bannerConfig.mainFontSize}
              repeat={bannerConfig.repeat}
              color={bannerConfig.color}
            />
          </div>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
            Syncing system engine data...
          </p>
        )}
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-5 py-8 md:grid-cols-3">
        {actionItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group border border-[#2e2e2e] bg-[#171717]/70 p-5 active:border-[rgba(222,247,103,0.5)]"
            >
              <div className="mb-5 grid h-11 w-11 place-items-center border border-[#2e2e2e] text-[#929292] group-active:border-[rgba(222,247,103,0.5)] group-active:text-[#DEF767]">
                <Icon size={19} aria-hidden />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                {item.meta}
              </p>
              <h2 className="mt-2 font-sans text-lg uppercase tracking-[0.04em] text-white">
                {item.title}
              </h2>
              <p className="mt-3 text-[12px] leading-5 text-[#929292]">{item.body}</p>
            </Link>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
