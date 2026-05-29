# Project Code Dump

### File: `apis/hasura/AppoloClient.tsx`

```tsx
"use client";
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// Normal Query, mutation link
const httpLink = new HttpLink({
    uri: "http://localhost:8100/v1/graphql",
    fetch: async (uri, options) => {
        const token = localStorage.getItem("jwt-token");
        console.log("Token in fetch:", token);
        const headers = { ...(options?.headers || {}), Authorization: token ? `Bearer ${token}` : "" };
        return fetch(uri, { ...options, headers });
    },
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
    createClient({
        url: "ws://localhost:8100/v1/graphql",
        connectionParams: async () => {
            const token = localStorage.getItem("jwt-token");
            if (!token) window.location.href = "/login";
            return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
        },
    }),
);

const link = ApolloLink.split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === "OperationDefinition" && definition.operation === "subscription";
    },
    wsLink,
    httpLink,
);

export const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

```

---

### File: `app/dashboard/page.tsx`

```tsx
// // "use client";

// // import Link from "next/link";
// // import { usePathname } from "next/navigation";
// // import { Gavel, Gamepad2, MessageCircle, User, Users } from "lucide-react";

// // const bottomNavItems = [
// //     { label: "My Team", href: "/myteam", icon: Users, enabled: true },
// //     { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
// //     { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
// // ];

// // export default function DashboardPage() {
// //     const pathname = usePathname();

// //     return (
// //         <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
// //             <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

// //             <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
// //                 <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
// //                     UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
// //                 </p>

// //                 <Link
// //                     href="/profile"
// //                     aria-label="Open profile"
// //                     className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
// //                 >
// //                     <User size={18} aria-hidden />
// //                 </Link>
// //             </header>

// //             <section className="relative z-10 flex flex-1 items-center justify-center px-5 pb-28 pt-8">
// //                 <p className="max-w-[22ch] text-center font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[#5b5b5b] sm:text-[12px]">
// //                     UXATHON'26
// //                 </p>
// //             </section>

// //             <nav
// //                 aria-label="Dashboard navigation"
// //                 className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
// //             >
// //                 <ul className="grid grid-cols-3">
// //                     {bottomNavItems.map((item) => {
// //                         const Icon = item.icon;
// //                         const isActive = item.href && pathname === item.href;

// //                         if (!item.enabled) {
// //                             return (
// //                                 <li key={item.label}>
// //                                     <span
// //                                         className="flex flex-col items-center gap-1.5 px-1 py-3 text-[#5b5b5b]"
// //                                         aria-disabled="true"
// //                                     >
// //                                         <Icon size={18} aria-hidden />
// //                                         <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
// //                                             {item.label}
// //                                         </span>
// //                                     </span>
// //                                 </li>
// //                             );
// //                         }

// //                         return (
// //                             <li key={item.label}>
// //                                 <Link
// //                                     href={item.href}
// //                                     className={`flex flex-col items-center gap-1.5 px-1 py-3 transition-colors ${isActive
// //                                         ? "text-[#ff6a6a]"
// //                                         : "text-[#929292] active:text-[#DEF767]"
// //                                         }`}
// //                                     aria-current={isActive ? "page" : undefined}
// //                                 >
// //                                     <Icon size={18} aria-hidden />
// //                                     <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
// //                                         {item.label}
// //                                     </span>
// //                                 </Link>
// //                             </li>
// //                         );
// //                     })}
// //                 </ul>
// //             </nav>
// //         </main>
// //     );
// // }

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { Gavel, Gamepad2, MessageCircle, User, Users, Activity } from "lucide-react";
// import { gql } from "@apollo/client";
// import { useSubscription } from "@apollo/client/react";
// import { AnimatedBanner } from "@/components/AnimatedBanner"; // Ensure this matches your path

// // Convert your query to a subscription for real-time updates
// const BANNER_SUBSCRIPTION = gql`
//     subscription GetLiveBanner {
//         banner_by_pk(id: 1) {
//             data
//         }
//     }
// `;

// const bottomNavItems = [
//     { label: "My Team", href: "/myteam", icon: Users, enabled: true },
//     { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
//     { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
// ];

// export default function DashboardPage() {
//     const pathname = usePathname();

//     // Listen to Hasura
//     const { data } = useSubscription<{ banner_by_pk: { data: any } }>(BANNER_SUBSCRIPTION);

//     // Extract the JSONB payload
//     const bannerConfig = data?.banner_by_pk?.data;

//     return (
//         <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
//             <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

//             <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
//                 <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
//                     UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
//                 </p>

//                 <Link
//                     href="/profile"
//                     aria-label="Open profile"
//                     className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
//                 >
//                     <User size={18} aria-hidden />
//                 </Link>
//             </header>

//             {/* LIVE BANNER INTEGRATION */}
//             <section className="relative z-10 w-full max-w-5xl mx-auto px-5 pt-8">
//                 {bannerConfig && bannerConfig.text ? (
//                     <div className="border border-[#2e2e2e] bg-[#171717]/80 backdrop-blur-sm p-6 sm:p-10 flex flex-col items-center">
//                         <div
//                             style={{
//                                 fontFamily: "var(--font-mono)",
//                                 fontSize: bannerConfig.subHeaderFontSize ? `${bannerConfig.subHeaderFontSize}px` : "11px",
//                                 color: "var(--accent-lime)",
//                                 letterSpacing: "0.25em",
//                                 marginBottom: "16px",
//                                 fontWeight: "bold",
//                             }}
//                         >
//                             [ {bannerConfig.subHeader || "LIVE BROADCAST"} ]
//                         </div>

//                         <div className="w-full">
//                             <AnimatedBanner
//                                 text={bannerConfig.text}
//                                 effect={bannerConfig.effect}
//                                 speed={bannerConfig.speed}
//                                 blurStrength={bannerConfig.blurStrength}
//                                 font={bannerConfig.font}
//                                 fontSize={bannerConfig.mainFontSize}
//                                 repeat={bannerConfig.repeat}
//                             />
//                         </div>

//                         <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-6 font-mono text-[10px] sm:text-[11px] text-[#929292] uppercase">
//                             <div className="flex items-center gap-2">
//                                 <Activity size={12} className="text-[#DEF767]" />
//                                 {bannerConfig.footer1Label || "STATUS"}: <span className="text-[#DEF767] font-bold">{bannerConfig.footer1Value || "ACTIVE"}</span>
//                             </div>
//                             <div className="hidden sm:block">•</div>
//                             <div>
//                                 {bannerConfig.footer2Label || "NODE"}: <span className="text-[#DEF767] font-bold">{bannerConfig.footer2Value || "SYNCED"}</span>
//                             </div>
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="flex flex-col items-center justify-center py-20">
//                         <p className="max-w-[22ch] text-center font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[#5b5b5b] sm:text-[12px]">
//                             UXATHON'26
//                         </p>
//                     </div>
//                 )}
//             </section>

//             <nav
//                 aria-label="Dashboard navigation"
//                 className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
//             >
//                 <ul className="grid grid-cols-3">
//                     {bottomNavItems.map((item) => {
//                         const Icon = item.icon;
//                         const isActive = item.href && pathname === item.href;

//                         if (!item.enabled) {
//                             return (
//                                 <li key={item.label}>
//                                     <span
//                                         className="flex flex-col items-center gap-1.5 px-1 py-3 text-[#5b5b5b]"
//                                         aria-disabled="true"
//                                     >
//                                         <Icon size={18} aria-hidden />
//                                         <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
//                                             {item.label}
//                                         </span>
//                                     </span>
//                                 </li>
//                             );
//                         }

//                         return (
//                             <li key={item.label}>
//                                 <Link
//                                     href={item.href}
//                                     className={`flex flex-col items-center gap-1.5 px-1 py-3 transition-colors ${isActive
//                                         ? "text-[#ff6a6a]"
//                                         : "text-[#929292] active:text-[#DEF767]"
//                                         }`}
//                                     aria-current={isActive ? "page" : undefined}
//                                 >
//                                     <Icon size={18} aria-hidden />
//                                     <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
//                                         {item.label}
//                                     </span>
//                                 </Link>
//                             </li>
//                         );
//                     })}
//                 </ul>
//             </nav>
//         </main>
//     );
// }

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gavel, Gamepad2, MessageCircle, User, Users, Activity } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery, useSubscription } from "@apollo/client/react";
import { AnimatedBanner } from "@/components/AnimatedBanner";
import { useAuth } from "@/context/token-context";
import { useEffect } from "react";

// 1. Subscription to listen for the live banner config
const BANNER_SUBSCRIPTION = gql`
    query GetLiveBanner {
        banner_by_pk(id: 1) {
            data
        }
    }
`;

const bottomNavItems = [
    { label: "My Team", href: "/myteam", icon: Users, enabled: true },
    { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
    { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

export default function DashboardPage() {
    const pathname = usePathname();
    const router = useRouter();
    const auth = useAuth();


    useEffect(() => {
        if (typeof window !== "undefined" && !auth.getJwt()) {
            router.push("/login");
        }
    }, [auth, router]);


    

    // 2. Fetch the live data via WebSocket

    const { data, loading, error } = useQuery<{ banner_by_pk: { data: any } }>(BANNER_SUBSCRIPTION);
    // 3. Extract the JSONB payload
    const bannerConfig = data?.banner_by_pk?.data;
    console.log(data, loading, error);
    console.log(bannerConfig);

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
                    UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
                </p>

                <Link href="/profile" aria-label="Open profile" className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                    <User size={18} aria-hidden />
                </Link>
            </header>

            {/* 4. REPLACED SECTION: Dynamic Banner or Fallback */}
            <section className="relative z-10 flex flex-1 items-center justify-center px-5 pb-28 pt-8 w-full max-w-5xl mx-auto">
                {bannerConfig && bannerConfig.text ? (
                    <div className="w-full border border-[#2e2e2e] bg-[#171717]/80 backdrop-blur-sm p-6 sm:p-10 flex flex-col items-center">
                        <div
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: bannerConfig.subHeaderFontSize ? `${bannerConfig.subHeaderFontSize}px` : "11px",
                                color: "#DEF767",
                                letterSpacing: "0.25em",
                                marginBottom: "16px",
                                fontWeight: "bold",
                            }}
                        >
                            [ {bannerConfig.subHeader || "LIVE BROADCAST"} ]
                        </div>

                        <div className="w-full">
                            {/* <AnimatedBanner
                                text={bannerConfig.text}
                                effect={bannerConfig.effect}
                                speed={bannerConfig.speed}
                                blurStrength={bannerConfig.blurStrength}
                                font={bannerConfig.font}
                                fontSize={bannerConfig.mainFontSize}
                                repeat={bannerConfig.repeat}
                            /> */}
                            <AnimatedBanner
                                text={bannerConfig.text}
                                effect={bannerConfig.effect}
                                speed={bannerConfig.speed}
                                blurStrength={bannerConfig.blurStrength}
                                font={bannerConfig.font}
                                fontSize={bannerConfig.mainFontSize}
                                repeat={bannerConfig.repeat}
                                color={bannerConfig.color} // <-- ADD THIS LINE
                            />
                        </div>

                        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-6 font-mono text-[10px] sm:text-[11px] text-[#929292] uppercase">
                            <div className="flex items-center gap-2">
                                <Activity size={12} className="text-[#DEF767]" />
                                {bannerConfig.footer1Label || "STATUS"}: <span className="text-[#DEF767] font-bold">{bannerConfig.footer1Value || "ACTIVE"}</span>
                            </div>
                            <div className="hidden sm:block">•</div>
                            <div>
                                {bannerConfig.footer2Label || "NODE"}: <span className="text-[#DEF767] font-bold">{bannerConfig.footer2Value || "SYNCED"}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="max-w-[22ch] text-center font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[#5b5b5b] sm:text-[12px]">{loading ? "SYNCING TELEMETRY..." : "UXATHON'26"}</p>
                )}
            </section>

            <nav aria-label="Dashboard navigation" className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <ul className="grid grid-cols-3">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href && pathname === item.href;

                        if (!item.enabled) {
                            return (
                                <li key={item.label}>
                                    <span className="flex flex-col items-center gap-1.5 px-1 py-3 text-[#5b5b5b]" aria-disabled="true">
                                        <Icon size={18} aria-hidden />
                                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">{item.label}</span>
                                    </span>
                                </li>
                            );
                        }

                        return (
                            <li key={item.label}>
                                <Link href={item.href} className={`flex flex-col items-center gap-1.5 px-1 py-3 transition-colors ${isActive ? "text-[#ff6a6a]" : "text-[#929292] active:text-[#DEF767]"}`} aria-current={isActive ? "page" : undefined}>
                                    <Icon size={18} aria-hidden />
                                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </main>
    );
}

```

---

### File: `app/games/_components/GameShell.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Gavel, Gamepad2, MessageCircle, User, Users } from "lucide-react";

const bottomNavItems = [
  { label: "My Team", href: "/myteam", icon: Users, enabled: true },
  { label: "Bidding", href: null, icon: Gavel, enabled: false },
  { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
  { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

type GameShellProps = {
  meta: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function GameShell({ meta, title, description, children }: GameShellProps) {
  const pathname = usePathname();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <PageDecor />

      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:text-[12px]">
          UXISM<span className="text-[#5b5b5b]">/</span>UXATHON
        </p>

        <Link
          href="/profile"
          aria-label="Open profile"
          className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
        >
          <User size={18} aria-hidden />
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-28 pt-6">
        <Link
          href="/games"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:text-[#DEF767]"
        >
          <ArrowLeft size={14} aria-hidden />
          Games lounge
        </Link>

        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">{meta}</p>
          <h1 className="mt-3 font-sans text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-4 max-w-[34ch] text-[13px] leading-6 text-[#929292]">{description}</p>
        </div>

        {children}
      </section>

      <nav
        aria-label="Dashboard navigation"
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <ul className="grid grid-cols-4">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href && pathname === item.href;

            if (!item.enabled) {
              return (
                <li key={item.label}>
                  <span
                    className="flex flex-col items-center gap-1.5 px-1 py-3 text-[#5b5b5b]"
                    aria-disabled="true"
                  >
                    <Icon size={18} aria-hidden />
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
                      {item.label}
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <Link
                  href={item.href!}
                  className={`flex flex-col items-center gap-1.5 px-1 py-3 transition-colors ${
                    isActive ? "text-[#ff6a6a]" : "text-[#929292] active:text-[#DEF767]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={18} aria-hidden />
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}

export function GameStats({
  levelLabel = "level",
  levelValue,
  bestLabel = "best",
  bestValue,
}: {
  levelLabel?: string;
  levelValue: string | number;
  bestLabel?: string;
  bestValue: string | number;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-px border border-[#2e2e2e] bg-[#2e2e2e]">
      <div className="bg-[#171717]/70 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{levelLabel}</p>
        <p className="mt-1 font-sans text-2xl tabular-nums uppercase tracking-[0.04em] text-white">{levelValue}</p>
      </div>
      <div className="bg-[#171717]/70 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{bestLabel}</p>
        <p className="mt-1 font-sans text-2xl tabular-nums uppercase tracking-[0.04em] text-white">{bestValue}</p>
      </div>
    </div>
  );
}

export function GamePanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#2e2e2e] bg-[#171717]/70 px-4 py-6 sm:px-5 ${className}`}>{children}</div>
  );
}

export const gameButtonPrimary =
  "px-6 py-3 border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717]";

export const gameButtonSecondary =
  "px-4 py-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]";

function PageDecor() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-24 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-24 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />
      <div className="pointer-events-none fixed left-1/2 top-[-120px] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-20 blur-3xl" />
    </>
  );
}

```

---

### File: `app/games/chimp/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const chimpConfig = {
  id: "chimp",
  name: "Chimp Test",
  description: "Memorize the numbered tiles and click them in ascending order.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initChimp() {
  registerGame(chimpConfig);
}

```

---

### File: `app/games/chimp/page.tsx`

```tsx
"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

type Phase = "idle" | "memorize" | "input" | "success" | "fail";

const START_COUNT = 4;
const MAX_COUNT = 25;
const MEMORIZE_MS = 1400;
const MIN_MEMORIZE_MS = 650;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createBoard(count: number) {
  const positions = shuffle(Array.from({ length: count }, (_, index) => index));
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    position: positions[index],
  }));
}

function ChimpGame() {
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [board, setBoard] = React.useState<Array<{ number: number; position: number }>>([]);
  const [boardCount, setBoardCount] = React.useState(START_COUNT);
  const [expected, setExpected] = React.useState(1);
  const [revealed, setRevealed] = React.useState<number[]>([]);
  const [bestLevel, setBestLevel] = React.useState(0);

  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const memorizeDuration = React.useCallback((count: number) => {
    return Math.max(MIN_MEMORIZE_MS, MEMORIZE_MS - (count - START_COUNT) * 45);
  }, []);

  const startRound = React.useCallback(
    (nextLevel = level) => {
      clearTimer();

      const count = Math.min(MAX_COUNT, START_COUNT + nextLevel - 1);
      const nextBoard = createBoard(count);

      setLevel(nextLevel);
      setBoardCount(count);
      setBoard(nextBoard);
      setExpected(1);
      setRevealed([]);
      setPhase("memorize");

      timerRef.current = window.setTimeout(() => {
        setPhase("input");
      }, memorizeDuration(count));
    },
    [clearTimer, level, memorizeDuration],
  );

  const handleStart = React.useCallback(() => {
    startRound(1);
  }, [startRound]);

  const handleCellClick = React.useCallback(
    (position: number) => {
      if (phase !== "input") {
        return;
      }

      const targetCell = board.find((entry) => entry.number === expected);
      if (!targetCell || targetCell.position !== position) {
        setPhase("fail");
        setBestLevel((current) => Math.max(current, level));
        return;
      }

      const nextExpected = expected + 1;
      setRevealed((current) => [...current, position]);

      if (nextExpected > board.length) {
        setPhase("success");
        setBestLevel((current) => Math.max(current, level));

        timerRef.current = window.setTimeout(() => {
          startRound(level + 1);
        }, 650);
        return;
      }

      setExpected(nextExpected);
    },
    [board, expected, level, phase, startRound],
  );

  const handleReset = React.useCallback(() => {
    clearTimer();
    setLevel(1);
    setPhase("idle");
    setBoard([]);
    setBoardCount(START_COUNT);
    setExpected(1);
    setRevealed([]);
  }, [clearTimer]);

  const gridSize = Math.ceil(Math.sqrt(boardCount));

  const cellByPosition = React.useMemo(() => {
    const map = new Map<number, { number: number; position: number }>();
    board.forEach((entry) => {
      map.set(entry.position, entry);
    });
    return map;
  }, [board]);

  const phaseLabel =
    phase === "memorize"
      ? "memorize"
      : phase === "input"
        ? `click ${expected}`
        : phase === "success"
          ? "good"
          : phase === "fail"
            ? "wrong"
            : "";

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[300px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              numbers will disappear
            </p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        )}

        {phase !== "idle" && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between px-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{phaseLabel}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{boardCount} cells</span>
            </div>
            <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {Array.from({ length: gridSize * gridSize }).map((_, position) => {
                const entry = cellByPosition.get(position);
                const isActive = phase === "memorize" && Boolean(entry);
                const isRevealed = revealed.includes(position) || (phase === "memorize" && Boolean(entry));
                const cellNumber = entry?.number;
                return (
                  <button
                    key={position}
                    type="button"
                    onClick={() => handleCellClick(position)}
                    disabled={phase !== "input"}
                    className={[
                      "flex aspect-square items-center justify-center border border-[#2e2e2e] bg-[#181818] transition-colors duration-150",
                      phase === "input" ? "active:border-[rgba(222,247,103,0.5)] active:bg-[#171717]" : "cursor-default",
                      isRevealed ? "text-white" : "text-[#5b5b5b]",
                      isActive ? "bg-[#171717]" : "",
                    ].join(" ")}
                    aria-label={`chimp-cell-${position}`}
                  >
                    <span className="font-sans text-xl tabular-nums uppercase tracking-[0.04em] sm:text-2xl">
                      {isRevealed && cellNumber ? cellNumber : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GamePanel>

      <div className="mt-4 flex items-center justify-center gap-3">
        {phase !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            {phase === "fail" ? "try again" : "reset"}
          </button>
        )}
      </div>
    </>
  );
}

export default function ChimpPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / CHIMP"
      title="Chimp Test"
      description="Memorize the numbered tiles, then click them in ascending order."
    >
      <ChimpGame />
    </GameShell>
  );
}

```

---

### File: `app/games/number-memory/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const numberMemoryConfig = {
  id: "number-memory",
  name: "Number Memory",
  description: "Remember the longest number you can. Each level adds a digit.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initNumberMemory() {
  registerGame(numberMemoryConfig);
}

```

---

### File: `app/games/number-memory/page.tsx`

```tsx
"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

type Phase = "idle" | "showing" | "input" | "success" | "fail";

const BASE_SHOW_MS = 1400;
const MIN_SHOW_MS = 700;

function makeNumber(length: number) {
  const firstDigit = String(Math.floor(Math.random() * 9) + 1);
  let result = firstDigit;

  for (let index = 1; index < length; index += 1) {
    result += String(Math.floor(Math.random() * 10));
  }

  return result;
}

function NumberMemoryGame() {
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [target, setTarget] = React.useState("");
  const [visibleNumber, setVisibleNumber] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [bestLevel, setBestLevel] = React.useState(0);

  const timersRef = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  React.useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [phase]);

  const showDurationForLevel = React.useCallback((currentLevel: number) => {
    return Math.max(MIN_SHOW_MS, BASE_SHOW_MS - (currentLevel - 1) * 65);
  }, []);

  const startRound = React.useCallback(
    (nextLevel = level) => {
      clearTimers();

      const nextTarget = makeNumber(nextLevel);
      setLevel(nextLevel);
      setTarget(nextTarget);
      setVisibleNumber(nextTarget);
      setInputValue("");
      setPhase("showing");

      const hideTimer = window.setTimeout(() => {
        setVisibleNumber("");
        setPhase("input");
      }, showDurationForLevel(nextLevel));

      timersRef.current.push(hideTimer);
    },
    [clearTimers, level, showDurationForLevel],
  );

  const handleStart = React.useCallback(() => {
    startRound(1);
  }, [startRound]);

  const handleSubmit = React.useCallback(() => {
    if (phase !== "input") {
      return;
    }

    if (inputValue.trim() === target) {
      setBestLevel((current) => Math.max(current, level));
      setPhase("success");

      const nextLevelTimer = window.setTimeout(() => {
        startRound(level + 1);
      }, 700);

      timersRef.current.push(nextLevelTimer);
      return;
    }

    setBestLevel((current) => Math.max(current, level - 1));
    setPhase("fail");
  }, [inputValue, level, phase, startRound, target]);

  const handleRetry = React.useCallback(() => {
    startRound(level);
  }, [level, startRound]);

  const handleReset = React.useCallback(() => {
    clearTimers();
    setLevel(1);
    setTarget("");
    setVisibleNumber("");
    setInputValue("");
    setPhase("idle");
  }, [clearTimers]);

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[260px] flex flex-col items-center justify-center text-center">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">one number at a time</p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        )}

        {phase === "showing" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">memorize</p>
            <p className="font-sans text-5xl tabular-nums uppercase tracking-[0.04em] text-white sm:text-6xl">
              {visibleNumber}
            </p>
          </div>
        )}

        {phase === "input" && (
          <div className="flex w-full max-w-md flex-col items-center gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">enter the number</p>
            <form
              className="flex w-full flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full border border-[#2e2e2e] bg-transparent px-4 py-4 text-center font-sans text-4xl tabular-nums uppercase tracking-[0.04em] text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]"
                placeholder=""
                aria-label="Enter remembered number"
              />
              <button type="submit" className={gameButtonSecondary}>
                submit
              </button>
            </form>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-sans text-4xl uppercase tracking-[0.04em] text-[#DEF767]">correct</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">next number incoming</p>
          </div>
        )}

        {phase === "fail" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-sans text-4xl uppercase tracking-[0.04em] text-[#ff6a6a]">wrong</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">answer was {target}</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleRetry} className={gameButtonPrimary}>
                retry
              </button>
              <button type="button" onClick={handleReset} className={gameButtonSecondary}>
                reset
              </button>
            </div>
          </div>
        )}
      </GamePanel>

      {phase !== "idle" && phase !== "fail" && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        </div>
      )}
    </>
  );
}

export default function NumberMemoryPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / NUMBER"
      title="Number Memory"
      description="Remember the number before it disappears."
    >
      <NumberMemoryGame />
    </GameShell>
  );
}

```

---

### File: `app/games/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    ArrowLeft,
    Brain,
    Gavel,
    Gamepad2,
    MessageCircle,
    Plus,
    Shapes,
    Sparkles,
    User,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";

type Game = {
    id: string;
    title: string;
    description: string;
    meta: string;
    href: string | null;
    icon: LucideIcon;
};

const GAMES: Game[] = [
    {
        id: "signal-match",
        title: "chimp",
        description: "Pair live signals before the feed resets.",
        meta: "mode / memory",
        href: "/games/chimp",
        icon: Brain,
    },
    {
        id: "rapid-sketch",
        title: "number-memory",
        description: "Draw the prompt before the room times out.",
        meta: "mode / creative",
        href: "/games/number-memory",
        icon: Shapes,
    },
    {
        id: "pulse-poll",
        title: "sequence-memory",
        description: "Vote with the crowd on the fastest path.",
        meta: "mode / social",
        href: "/games/sequence-memory",
        icon: Zap,
    },
    {
        id: "spark-trivia",
        title: "reaction-time",
        description: "Answer streak questions from the event deck.",
        meta: "mode / quiz",
        href: "/games/reaction-time",
        icon: Sparkles,
    },
];

const bottomNavItems = [
    { label: "My Team", href: "/myteam", icon: Users, enabled: true },
    { label: "Bidding", href: null, icon: Gavel, enabled: false },
    { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
    { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

export default function GamesPage() {
    const pathname = usePathname();
    const [selectedId, setSelectedId] = useState(GAMES[0].id);

    const selectedGame = GAMES.find((game) => game.id === selectedId) ?? GAMES[0];
    const canPlay = Boolean(selectedGame.href);

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <PageDecor />

            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <Link
                    href="/dashboard"
                    className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                >
                    <ArrowLeft size={14} aria-hidden />
                    Dashboard
                </Link>

                <Link
                    href="/profile"
                    aria-label="Open profile"
                    className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                >
                    <User size={18} aria-hidden />
                </Link>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-36 pt-8">
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                        UXATHON / GAMES / PLAY LOUNGE
                    </p>
                    <h1 className="mt-3 font-sans text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-[40px]">
                        Choose a Game
                    </h1>
                    <p className="mt-4 max-w-[34ch] text-[13px] leading-6 text-[#929292]">
                        Select one of four room games. Routes will connect here when each game is ready.
                    </p>
                </div>

                <ul className="border border-[#2e2e2e]" role="listbox" aria-label="Available games">
                    {GAMES.map((game, index) => {
                        const Icon = game.icon;
                        const isSelected = game.id === selectedId;

                        return (
                            <li key={game.id} className={index > 0 ? "-mt-px" : undefined}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedId(game.id)}
                                    className={`grid w-full min-h-[90px] grid-cols-[auto_1fr_auto] items-center gap-4 border border-[#2e2e2e] px-4 py-4 text-left transition-colors sm:px-5 ${isSelected
                                            ? "relative z-10 bg-[#ff6a6a] text-[#171717]"
                                            : "bg-[#181818] text-white active:bg-[#171717]"
                                        }`}
                                >
                                    <span
                                        className={`grid h-11 w-11 place-items-center border ${isSelected ? "border-[#171717]/30" : "border-[#2e2e2e]"
                                            }`}
                                    >
                                        <Icon
                                            size={20}
                                            className={isSelected ? "text-[#171717]" : "text-[#929292]"}
                                            aria-hidden
                                        />
                                    </span>

                                    <span className="min-w-0">
                                        <span className="block font-sans text-[16px] uppercase tracking-[0.04em]">
                                            {game.title}
                                        </span>
                                        <span
                                            className={`mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.14em] ${isSelected ? "text-[#171717]/70" : "text-[#5b5b5b]"
                                                }`}
                                        >
                                            {game.meta}
                                        </span>
                                    </span>

                                    <Plus
                                        size={18}
                                        className={`shrink-0 transition-transform duration-200 ${isSelected ? "rotate-45 text-[#171717]" : "text-[#5b5b5b]"
                                            }`}
                                        aria-hidden
                                    />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-6 border border-[#2e2e2e] bg-[#171717]/70 px-4 py-4 sm:px-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">selected</p>
                    <p className="mt-2 font-sans text-[18px] uppercase tracking-[0.04em] text-white">
                        {selectedGame.title}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[#929292]">{selectedGame.description}</p>
                </div>
            </section>

            <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 px-5">
                <div className="mx-auto max-w-lg">
                    {canPlay ? (
                        <Link
                            href={selectedGame.href!}
                            className="flex min-h-[58px] w-full items-center justify-center border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717]"
                        >
                            Play {selectedGame.title}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="flex min-h-[58px] w-full cursor-not-allowed items-center justify-center border border-[#2e2e2e] bg-[#171717] font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]"
                            aria-disabled="true"
                        >
                            Play — route pending
                        </button>
                    )}
                </div>
            </div>

            <nav
                aria-label="Dashboard navigation"
                className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-[2px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
            </nav>
        </main>
    );
}

function PageDecor() {
    return (
        <>
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-24 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-24 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />
            <div className="pointer-events-none fixed left-1/2 top-[-120px] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-20 blur-3xl" />
        </>
    );
}

```

---

### File: `app/games/reaction-time/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const reactionTimeConfig = {
  id: "reaction-time",
  name: "Reaction Time",
  description: "Click when the signal turns live. Lower milliseconds wins.",
  category: "reflex" as const,
  scoring: { strategy: "lowest" as const, unit: "ms" },
  realtime: false,
  leaderboard: true,
  rounds: 5,
  component: lazy(() => import("./page")),
};

export function initReactionTime() {
  registerGame(reactionTimeConfig);
}

```

---

### File: `app/games/reaction-time/page.tsx`

```tsx
"use client";

import React from "react";
import { GameShell, GameStats, gameButtonPrimary, gameButtonSecondary } from "../_components/GameShell";

type Phase = "idle" | "waiting" | "ready" | "false_start" | "round_result" | "complete";

const ROUNDS = 5;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 4000;

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
}

function averageMs(times: number[]) {
  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
}

function ReactionTimeGame() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [attempt, setAttempt] = React.useState(0);
  const [times, setTimes] = React.useState<number[]>([]);
  const [lastMs, setLastMs] = React.useState<number | null>(null);
  const [bestAverage, setBestAverage] = React.useState<number | null>(null);

  const readyAtRef = React.useRef<number>(0);
  const delayTimerRef = React.useRef<number | null>(null);

  const clearDelayTimer = React.useCallback(() => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearDelayTimer();
  }, [clearDelayTimer]);

  const beginWaiting = React.useCallback(() => {
    clearDelayTimer();
    setPhase("waiting");

    delayTimerRef.current = window.setTimeout(() => {
      readyAtRef.current = performance.now();
      setPhase("ready");
      delayTimerRef.current = null;
    }, randomDelay());
  }, [clearDelayTimer]);

  const handleStart = React.useCallback(() => {
    setAttempt(1);
    setTimes([]);
    setLastMs(null);
    beginWaiting();
  }, [beginWaiting]);

  const handleReset = React.useCallback(() => {
    clearDelayTimer();
    setPhase("idle");
    setAttempt(0);
    setTimes([]);
    setLastMs(null);
  }, [clearDelayTimer]);

  const handlePanelClick = React.useCallback(() => {
    if (phase === "idle") {
      handleStart();
      return;
    }

    if (phase === "waiting") {
      clearDelayTimer();
      setPhase("false_start");
      return;
    }

    if (phase === "ready") {
      const ms = Math.round(performance.now() - readyAtRef.current);
      setLastMs(ms);
      setTimes((current) => [...current, ms]);
      setPhase("round_result");
      return;
    }

    if (phase === "false_start") {
      beginWaiting();
      return;
    }

    if (phase === "round_result") {
      if (attempt >= ROUNDS) {
        setTimes((current) => {
          const avg = averageMs(current);
          setBestAverage((best) => (best === null ? avg : Math.min(best, avg)));
          return current;
        });
        setPhase("complete");
        return;
      }

      setAttempt((value) => value + 1);
      beginWaiting();
      return;
    }

    if (phase === "complete") {
      handleStart();
    }
  }, [attempt, beginWaiting, clearDelayTimer, handleStart, phase]);

  const currentAverage = averageMs(times);

  const panelLabel = (() => {
    switch (phase) {
      case "idle":
        return { kicker: "signal / idle", title: "Click to begin", hint: `${ROUNDS} attempts — wait for live` };
      case "waiting":
        return { kicker: "signal / hold", title: "Wait for live", hint: "do not click yet" };
      case "ready":
        return { kicker: "signal / live", title: "Click now", hint: "capture your reaction" };
      case "false_start":
        return { kicker: "signal / fault", title: "Too soon", hint: "click to retry this attempt" };
      case "round_result":
        return {
          kicker: `attempt / ${attempt} of ${ROUNDS}`,
          title: lastMs !== null ? `${lastMs} ms` : "—",
          hint: attempt >= ROUNDS ? "click for average" : "click for next signal",
        };
      case "complete":
        return {
          kicker: "session / complete",
          title: `${currentAverage} ms`,
          hint: "average reaction — click to run again",
        };
      default:
        return { kicker: "", title: "", hint: "" };
    }
  })();

  const panelTone =
    phase === "ready"
      ? "border-[rgba(222,247,103,0.5)] bg-[#171717]"
      : phase === "waiting"
        ? "border-[#ff6a6a] bg-[#171717]"
        : phase === "false_start"
          ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]"
          : "border-[#2e2e2e] bg-[#181818]";

  const titleTone =
    phase === "false_start"
      ? "text-[#171717]"
      : phase === "ready"
        ? "text-[#DEF767]"
        : phase === "waiting"
          ? "text-[#ff6a6a]"
          : "text-white";

  const metaTone = phase === "false_start" ? "text-[#171717]/70" : "text-[#5b5b5b]";
  const hintTone = phase === "false_start" ? "text-[#171717]/80" : "text-[#929292]";

  return (
    <>
      <GameStats
        levelLabel="attempt"
        levelValue={phase === "idle" || phase === "complete" ? "—" : `${Math.min(attempt, ROUNDS)}/${ROUNDS}`}
        bestLabel="best avg"
        bestValue={bestAverage !== null ? `${bestAverage} ms` : "—"}
      />

      <button
        type="button"
        onClick={handlePanelClick}
        aria-label={panelLabel.title}
        className={`flex min-h-[min(48vh,380px)] w-full flex-col items-center justify-center gap-4 border px-6 py-10 text-center transition-colors ${panelTone} cursor-pointer active:border-[rgba(222,247,103,0.5)]`}
      >
        <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${metaTone}`}>{panelLabel.kicker}</p>
        <p className={`font-sans text-5xl uppercase leading-[0.95] tracking-[0.02em] sm:text-6xl ${titleTone}`}>
          {panelLabel.title}
        </p>
        <p className={`max-w-[28ch] text-[13px] leading-6 ${hintTone}`}>{panelLabel.hint}</p>
      </button>

      {times.length > 0 && phase !== "idle" && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {times.map((ms, index) => (
            <span
              key={`${index}-${ms}`}
              className="border border-[#2e2e2e] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]"
            >
              {index + 1}: {ms} ms
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {phase === "idle" && (
          <button type="button" onClick={handleStart} className={gameButtonPrimary}>
            start
          </button>
        )}
        {phase !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        )}
      </div>
    </>
  );
}

export default function ReactionTimePage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / REACTION"
      title="Reaction Time"
      description="Wait for the live signal, then click as fast as you can."
    >
      <ReactionTimeGame />
    </GameShell>
  );
}

```

---

### File: `app/games/registry.ts`

```typescript
import { GameDefinition } from "./types";

const gameRegistry = new Map<string, GameDefinition>();

export function registerGame(definition: GameDefinition): void {
  gameRegistry.set(definition.id, definition);
}

export function getGame(id: string): GameDefinition | undefined {
  return gameRegistry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameRegistry.values());
}

```

---

### File: `app/games/sequence-memory/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const sequenceMemoryConfig = {
  id: "sequence-memory",
  name: "Sequence Memory",
  description: "Watch the pattern and reproduce it. Levels get progressively longer.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initSequenceMemory() {
  registerGame(sequenceMemoryConfig);
}

```

---

### File: `app/games/sequence-memory/page.tsx`

```tsx
"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

const GRID_SIZE = 3;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BASE_INTERVAL = 700;
const MIN_INTERVAL = 300;

type Mode = "idle" | "showing" | "input" | "success" | "fail";

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function SequenceMemoryGame() {
  const [level, setLevel] = React.useState(1);
  const [mode, setMode] = React.useState<Mode>("idle");
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [highlightIndex, setHighlightIndex] = React.useState<number | null>(null);
  const [bestLevel, setBestLevel] = React.useState(0);

  const timersRef = React.useRef<number[]>([]);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const intervalForLevel = React.useCallback((lvl: number) => {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - (lvl - 1) * 60);
  }, []);

  const generateSequence = React.useCallback((lvl: number) => {
    const seq: number[] = [];
    for (let i = 0; i < lvl; i++) seq.push(randInt(CELL_COUNT));
    return seq;
  }, []);

  const beginRound = React.useCallback(
    (startLevel = level) => {
      clearTimers();
      const lvl = startLevel;
      const seq = generateSequence(lvl);
      setSequence(seq);
      setProgress(0);
      setMode("showing");

      const interval = intervalForLevel(lvl);
      seq.forEach((cell, idx) => {
        const show = window.setTimeout(() => {
          setHighlightIndex(cell);
        }, idx * (interval + 220));

        const hide = window.setTimeout(() => {
          setHighlightIndex(null);
          if (idx === seq.length - 1) {
            setMode("input");
          }
        }, idx * (interval + 220) + interval);

        timersRef.current.push(show, hide);
      });
    },
    [clearTimers, generateSequence, intervalForLevel, level],
  );

  const handleCellClick = React.useCallback(
    (index: number) => {
      if (mode !== "input") return;
      const expected = sequence[progress];
      if (index === expected) {
        const nextProg = progress + 1;
        setProgress(nextProg);
        if (nextProg >= sequence.length) {
          setMode("success");
          setBestLevel((b) => Math.max(b, level));
          const t = window.setTimeout(() => {
            setLevel((l) => l + 1);
            beginRound(level + 1);
          }, 700);
          timersRef.current.push(t);
        }
      } else {
        setMode("fail");
        setBestLevel((b) => Math.max(b, level));
      }
    },
    [mode, sequence, progress, level, beginRound],
  );

  const handleStart = React.useCallback(() => {
    setLevel(1);
    setBestLevel((b) => Math.max(b, 1));
    beginRound(1);
  }, [beginRound]);

  const handleReset = React.useCallback(() => {
    clearTimers();
    setMode("idle");
    setSequence([]);
    setProgress(0);
    setHighlightIndex(null);
  }, [clearTimers]);

  const cellClass = (idx: number) => {
    const base =
      "flex h-20 w-20 items-center justify-center border border-[#2e2e2e] bg-[#181818] text-[#5b5b5b] select-none sm:h-24 sm:w-24";
    if (highlightIndex === idx) {
      return `${base} border-[rgba(222,247,103,0.5)] bg-[#DEF767] text-[#171717]`;
    }
    return base;
  };

  const statusText =
    mode === "showing"
      ? "watch the pattern"
      : mode === "input"
        ? "your turn"
        : mode === "success"
          ? "good — next level"
          : mode === "fail"
            ? "wrong"
            : "";

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel>
        {mode === "idle" ? (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">reproduce the pattern</p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{statusText}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: CELL_COUNT }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCellClick(idx)}
                  className={cellClass(idx)}
                  aria-label={`cell-${idx}`}
                />
              ))}
            </div>
          </div>
        )}
      </GamePanel>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {mode === "fail" && (
          <button type="button" onClick={() => beginRound(level)} className={gameButtonPrimary}>
            retry
          </button>
        )}
        {mode !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        )}
      </div>
    </>
  );
}

export default function SequenceMemoryPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / SEQUENCE"
      title="Sequence Memory"
      description="Reproduce the pattern. Difficulty increases each level."
    >
      <SequenceMemoryGame />
    </GameShell>
  );
}

```

---

### File: `app/games/types.ts`

```typescript
export type ScoringStrategy = 'lowest' | 'highest' | 'accumulated';

export interface GameScoring {
  strategy: ScoringStrategy;
  unit: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'cognitive' | 'reflex' | 'design' | 'accessibility';
  scoring: GameScoring;
  realtime: boolean;
  leaderboard: boolean;
  rounds: number;
  component: React.ComponentType<any>;
}

export type GameLifecycleStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'completed' | 'reviewing';

export interface GameState {
  status: GameLifecycleStatus;
  currentRound: number;
  totalRounds: number;
  score: number;
  startTime?: number;
  endTime?: number;
}

```

---

### File: `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-sans;
}

```

---

### File: `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/token-context";
import { ApolloWrapper } from "@/apis/hasura/AppoloClient";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "UXathon - Uxism",
    description: "Uxism is a platform that connects UX designers with companies.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
            <ApolloWrapper>
                <AuthProvider>
                    <body className="min-h-full flex flex-col">{children}</body>
                </AuthProvider>
            </ApolloWrapper>
        </html>
    );
}

```

---

### File: `app/live/page.tsx`

```tsx
"use client";
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { gql } from "@apollo/client";
import { useMutation, useSubscription } from "@apollo/client/react";
import { ArrowLeft, ArrowUp, MessageCircle, Plus, Send, Smile, Users, X } from "lucide-react";

const REACTIONS = [
    { id: "heart", emoji: "❤️", label: "Heart" },
    { id: "thumbs", emoji: "👍", label: "Thumbs up" },
    { id: "raise", emoji: "🙋", label: "Hand raise" },
] as const;

type FloatingReaction = {
    id: string;
    emoji: string;
};

type PollOption = {
    id: string;
    option: string;
};

type LivePoll = {
    id: string;
    title: string;
    created_at: string;
    ends_at: string;
    poll_options: PollOption[];
};

const MUTATION_CREATE_QUESTION = gql`
    mutation CreateQuestion($sessionId: uuid!, $question: String!) {
        insert_live_questions_one(object: { session_id: $sessionId, question: $question }) {
            question
        }
    }
`;

const POLL_SUBSCRIPTION = gql`
    subscription PollSubscription($sessionId: uuid!) {
        live_polls(where: { session_id: { _eq: $sessionId } }, order_by: { created_at: asc }) {
            id
            title
            created_at
            ends_at
            poll_options {
                id
                option
            }
        }
    }
`;

const VOTE_MUTATION = gql`
    mutation Vote($pollOptionId: uuid!, $pollId: uuid!) {
        insert_live_user_votes_one(object: { option_id: $pollOptionId, poll_id: $pollId }) {
            id
        }
    }
`;

const CHAT_SUBSCRIPTION = gql`
    subscription ChatSubsScription($sessionId: uuid!) {
        live_chat(order_by: { created_at: desc }, where: { session_id: { _eq: $sessionId } }) {
            user {
                name
                profile_picture
            }
            message
        }
    }
`;

const GET_ACTIVE_SESSION = gql`
    subscription GetActiveSession {
        live_sessions(order_by: { started_at: desc }, where: { active: { _eq: true } }, limit: 1) {
            id
            started_at
        }
    }
`;

const MUTATION_ADD_MESSAGE = gql`
    mutation AddMessage($sessionId: uuid!, $message: String!) {
        insert_live_chat_one(object: { session_id: $sessionId, message: $message }) {
            message
        }
    }
`;

type LiveSession = {
    id: string;
    started_at: string;
};

type ChatItem = {
    user: {
        name: string | null;
        profile_picture: string | null;
    } | null;
    message: string;
};

type ActiveSessionData = {
    live_sessions: LiveSession[];
};

type ChatSubscriptionData = {
    live_chat: ChatItem[];
};

type PollSubscriptionData = {
    live_polls: LivePoll[];
};

type AddMessageVariables = {
    sessionId: string;
    message: string;
};

type VoteVariables = {
    pollOptionId: string;
    pollId: string;
};

type VotedOptionByPoll = Record<string, string>;

function getInitials(name?: string | null) {
    if (!name || !name.trim()) return "UX";

    return name
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function normalizeMessages(items?: ChatItem[]) {
    return items?.slice().reverse() ?? [];
}

function getVoteStorageKey(sessionId: string) {
    return `uxism-live-votes:${sessionId}`;
}

function subscribeVoteStorage(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);

    return () => window.removeEventListener("storage", onStoreChange);
}

function readStoredVotes(sessionId?: string) {
    if (!sessionId || typeof window === "undefined") return "{}";

    return window.localStorage.getItem(getVoteStorageKey(sessionId)) ?? "{}";
}

function parseStoredVotes(value: string): VotedOptionByPoll {
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function getPollProgress(poll: LivePoll, currentTime: number) {
    const startTime = new Date(poll.created_at).getTime();
    const endTime = new Date(poll.ends_at).getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return 100;

    return Math.min(100, Math.max(0, ((currentTime - startTime) / (endTime - startTime)) * 100));
}

function getSecondsRemaining(endsAt: string, currentTime: number) {
    const endTime = new Date(endsAt).getTime();

    if (!Number.isFinite(endTime)) return 0;

    return Math.max(0, Math.ceil((endTime - currentTime) / 1000));
}

export default function LivePage() {
    const [input, setInput] = useState("");
    const [reactionsOpen, setReactionsOpen] = useState(false);
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [voteLocksBySession, setVoteLocksBySession] = useState<Record<string, VotedOptionByPoll>>({});
    const [pendingPollIds, setPendingPollIds] = useState<Set<string>>(() => new Set());
    const [questionOpen, setQuestionOpen] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [questionSent, setQuestionSent] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const reactionsRef = useRef<HTMLDivElement | null>(null);
    const reactionIdRef = useRef(0);
    const questionResetRef = useRef<number | null>(null);

    const { data: sessionData, loading: sessionLoading, error: sessionError } = useSubscription<ActiveSessionData>(GET_ACTIVE_SESSION);
    const [createQuestion] = useMutation(MUTATION_CREATE_QUESTION);

    const activeSession = sessionData?.live_sessions?.[0] ?? null;
    const activeSessionId = activeSession?.id;

    const {
        data,
        loading: messagesLoading,
        error: messagesError,
    } = useSubscription<ChatSubscriptionData>(CHAT_SUBSCRIPTION, {
        skip: !activeSessionId,
        variables: activeSessionId ? { sessionId: activeSessionId } : undefined,
    });

    const {
        data: pollData,
        loading: pollsLoading,
        error: pollsError,
    } = useSubscription<PollSubscriptionData>(POLL_SUBSCRIPTION, {
        skip: !activeSessionId,
        variables: activeSessionId ? { sessionId: activeSessionId } : undefined,
    });

    const [addMessage, { loading: addMessageLoading, error: addMessageError }] = useMutation<unknown, AddMessageVariables>(MUTATION_ADD_MESSAGE);
    const [vote, { error: voteError }] = useMutation<unknown, VoteVariables>(VOTE_MUTATION);

    const storedVoteSnapshot = useSyncExternalStore(
        subscribeVoteStorage,
        () => readStoredVotes(activeSessionId),
        () => "{}",
    );
    const storedVotedOptionByPoll = useMemo(() => parseStoredVotes(storedVoteSnapshot), [storedVoteSnapshot]);
    const votedOptionByPoll = useMemo(() => {
        return { ...storedVotedOptionByPoll, ...(activeSessionId ? voteLocksBySession[activeSessionId] : undefined) };
    }, [activeSessionId, storedVotedOptionByPoll, voteLocksBySession]);
    const messages = useMemo(() => normalizeMessages(data?.live_chat), [data?.live_chat]);
    const activePolls = useMemo(() => {
        return (
            pollData?.live_polls?.filter((poll) => {
                const endTime = new Date(poll.ends_at).getTime();

                return Number.isFinite(endTime) && currentTime < endTime;
            }) ?? []
        );
    }, [currentTime, pollData?.live_polls]);
    const hasStackedPolls = activePolls.length > 1;
    const visibleUserCount = useMemo(() => Math.max(1, messages.length), [messages.length]);

    const errorMessage = sessionError?.message || messagesError?.message || addMessageError?.message || null;
    const pollErrorMessage = pollsError?.message || voteError?.message || null;

    const statusText = sessionLoading ? "loading session" : errorMessage ? "error" : !activeSessionId ? "no active session" : messagesLoading ? "loading messages" : pollsLoading ? "loading polls" : "live";

    useEffect(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
    }, [messages.length]);

    useEffect(() => {
        const interval = window.setInterval(() => setCurrentTime(Date.now()), 250);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        return () => {
            if (questionResetRef.current) window.clearTimeout(questionResetRef.current);
        };
    }, []);

    useEffect(() => {
        if (!reactionsOpen) return;

        function handlePointerDown(event: MouseEvent | TouchEvent) {
            if (!reactionsRef.current?.contains(event.target as Node)) {
                setReactionsOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [reactionsOpen]);

    function triggerReaction(emoji: string) {
        reactionIdRef.current += 1;
        const id = `reaction-${reactionIdRef.current}`;
        setFloatingReactions((prev) => [...prev, { id, emoji }]);
        setReactionsOpen(false);
        window.setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
        }, 1800);
    }

    async function sendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const message = input.trim();
        if (!message || !activeSessionId || addMessageLoading) return;

        await addMessage({ variables: { sessionId: activeSessionId, message } });
        setInput("");
    }

    async function submitVote(poll: LivePoll, optionId: string) {
        if (!activeSessionId || votedOptionByPoll[poll.id] || pendingPollIds.has(poll.id)) return;

        const endTime = new Date(poll.ends_at).getTime();
        if (!Number.isFinite(endTime) || currentTime >= endTime) return;

        setPendingPollIds((prev) => new Set(prev).add(poll.id));

        try {
            await vote({ variables: { pollId: poll.id, pollOptionId: optionId } });

            setVoteLocksBySession((prev) => {
                const nextSessionVotes = { ...(prev[activeSessionId] ?? {}), [poll.id]: optionId };

                try {
                    window.localStorage.setItem(getVoteStorageKey(activeSessionId), JSON.stringify(nextSessionVotes));
                } catch {
                    // Local storage is only a UI lock; the backend vote mutation is the source of truth.
                }

                return { ...prev, [activeSessionId]: nextSessionVotes };
            });
        } finally {
            setPendingPollIds((prev) => {
                const next = new Set(prev);
                next.delete(poll.id);
                return next;
            });
        }
    }

    function scrollToLatest() {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }

    function closeQuestionBox() {
        if (questionResetRef.current) window.clearTimeout(questionResetRef.current);
        setQuestionOpen(false);
        setQuestionSent(false);
        setQuestionText("");
    }

    // function sendQuestion(event: FormEvent<HTMLFormElement>) {
    //     event.preventDefault();

    //     if (!questionText.trim() || questionSent) return;

    //     setQuestionText("");
    //     createQuestion({ variables: { sessionId: activeSessionId!, question: questionText.trim() } }).then(() => {
    //         setQuestionSent(true);
    //     });

    //     questionResetRef.current = window.setTimeout(() => {
    //         setQuestionOpen(false);
    //         setQuestionSent(false);
    //     }, 1400);
    // }


    function sendQuestion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Add the activeSessionId check here!
        if (!questionText.trim() || questionSent || !activeSessionId) return;

        setQuestionText("");
        createQuestion({ variables: { sessionId: activeSessionId, question: questionText.trim() } }).then(() => {
            setQuestionSent(true);
        });

        questionResetRef.current = window.setTimeout(() => {
            setQuestionOpen(false);
            setQuestionSent(false);
        }, 1400);
    }


    function getImageUrl(imagePath?: string | null) {
    if (!imagePath) return "";
    
    // If it's already a full URL (like Dicebear) or a base64 string, return it as is
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
        return imagePath;
    }

    // Otherwise, append the backend URL and the /uploads/ prefix
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    return `${backendUrl}/uploads/${imagePath}`;
}

    

    

    return (
        <main className="h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 z-30 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 z-30 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 left-4 z-30 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 right-4 z-30 h-5 w-5 border-b border-r border-[#5b5b5b]" />

            <div className="pointer-events-none fixed left-1/2 top-[-140px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-25 blur-3xl" />

            {(activePolls.length > 0 || pollErrorMessage) && (
                <div className={`fixed left-5 right-5 top-5 z-40 mx-auto flex max-w-3xl flex-col overflow-y-auto sm:left-8 sm:right-8 ${hasStackedPolls ? "max-h-[68vh] gap-2" : "max-h-[52vh] gap-3"}`}>
                    {pollErrorMessage && <div className="border border-[#2e2e2e] bg-[#171717] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#ff6a6a]">poll / {pollErrorMessage}</div>}

                    {activePolls.map((poll) => (
                        <LivePollPanel key={poll.id} poll={poll} currentTime={currentTime} selectedOptionId={votedOptionByPoll[poll.id]} isPending={pendingPollIds.has(poll.id)} compact={hasStackedPolls} onVote={submitVote} />
                    ))}
                </div>
            )}

            <section className="relative z-10 mx-auto grid h-screen w-full max-w-5xl grid-rows-[1fr] px-5 py-5 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
                <div className="grid min-h-0 grid-rows-[auto_1fr_auto] lg:max-w-[75%]">
                    <header className="relative z-20 border-b border-[#2e2e2e] bg-[#181818]/95 pb-4 pt-2">
                        <nav className="flex items-center justify-between gap-4">
                            <a href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                <ArrowLeft size={15} />
                                Dashboard
                            </a>

                            <div className="flex items-center gap-3">
                                <div className="hidden h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:flex">
                                    <Users size={15} />
                                    {visibleUserCount} Users
                                </div>

                                <button type="button" onClick={scrollToLatest} className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]" aria-label="Scroll to latest message">
                                    <ArrowUp className="rotate-180" size={17} />
                                </button>
                            </div>
                        </nav>

                        <div className="mt-7 flex items-end justify-between gap-6">
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LIVE CHAT / EVENT ROOM</p>
                                <h1 className="mt-3 font-sans text-[36px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[48px]">Signal Room</h1>
                            </div>

                            <div className="hidden text-right font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:block">
                                <p>feed / public</p>
                                <p>state / {statusText}</p>
                            </div>
                        </div>

                        {activeSessionId && <div className="mt-4 truncate border border-[#2e2e2e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">Session is Active</div>}
                    </header>

                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-x border-[#2e2e2e] bg-[#171717]/70">
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-20 bg-gradient-to-b from-[#181818] via-[#181818]/75 to-transparent backdrop-blur-[2px]" />

                        <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto overscroll-contain px-0 pb-4 pt-4">
                            <div className="mt-auto flex min-h-min flex-col">
                                {sessionLoading && <SystemMessage title="Loading session" body="Checking for the latest active live session." />}
                                {errorMessage && <SystemMessage title="Connection error" body={errorMessage} tone="error" />}
                                {!sessionLoading && !errorMessage && !activeSessionId && <SystemMessage title="No active session" body="Create or activate a live session before messages can appear." />}
                                {activeSessionId && messagesLoading && <SystemMessage title="Loading messages" body="Reading live chat feed." />}
                                {activeSessionId && !messagesLoading && messages.length === 0 && <SystemMessage title="No messages yet" body="Send the first message to start the room signal." />}

                                {messages.map((chat, index) => {
                                    const name = chat.user?.name || "Unknown User";
                                    const profilePicture = chat.user?.profile_picture || "";

                                    return (
                                        <article key={`${index}-${name}-${chat.message}`} className="grid animate-[fadeInUp_260ms_ease-out] grid-cols-[48px_1fr] gap-3 border-b border-[#2e2e2e] px-4 py-4 sm:grid-cols-[56px_1fr] sm:px-5">
                                            {profilePicture ? <img src={getImageUrl(profilePicture)} alt={`${name} avatar`} className="h-10 w-10 border border-[#2e2e2e] object-cover sm:h-11 sm:w-11" /> : <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.08em] text-[#ff6a6a] sm:h-11 sm:w-11">{getInitials(name)}</div>}

                                            <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h2 className="truncate font-sans text-[16px] uppercase tracking-[0.04em] text-white">{name}</h2>
                                                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">participant</p>
                                                    </div>

                                                    {index === messages.length - 1 && <span className="shrink-0 border border-[rgba(222,247,103,0.5)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">Latest</span>}
                                                </div>

                                                <p className="mt-3 break-words text-[13px] leading-6 text-[#929292]">{chat.message}</p>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={sendMessage} className="relative z-20 shrink-0 border-t border-[#2e2e2e] bg-[#181818] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4">
                        <div className="flex items-stretch gap-2">
                            <div ref={reactionsRef} className="relative shrink-0 self-end">
                                {floatingReactions.map((reaction, index) => (
                                    <span key={reaction.id} className="pointer-events-none absolute bottom-full left-1/2 z-30 -translate-x-1/2 animate-[reactionFloat_1.8s_ease-out_forwards] text-[22px]" style={{ marginBottom: 8 + index * 6 }} aria-hidden>
                                        {reaction.emoji}
                                    </span>
                                ))}

                                {reactionsOpen && (
                                    <div className="absolute bottom-full left-0 z-40 mb-2 flex flex-col-reverse gap-1.5 border border-[#2e2e2e] bg-[#171717] p-1.5" role="menu" aria-label="Reactions">
                                        {REACTIONS.map((reaction) => (
                                            <button key={reaction.id} type="button" role="menuitem" onClick={() => triggerReaction(reaction.emoji)} className="grid h-11 w-11 place-items-center text-[22px] active:bg-[#ff6a6a]" aria-label={reaction.label}>
                                                {reaction.emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button type="button" onClick={() => setReactionsOpen((open) => !open)} className={`grid h-[58px] w-12 place-items-center border bg-[#171717] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] ${reactionsOpen ? "border-[rgba(222,247,103,0.5)] text-[#DEF767]" : "border-[#2e2e2e]"}`} aria-label="Add reaction" aria-expanded={reactionsOpen} aria-haspopup="menu">
                                    <Smile size={20} aria-hidden />
                                </button>
                            </div>

                            <div className="flex min-h-[58px] min-w-0 flex-1 border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
                                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={activeSessionId ? "Type message to everyone" : "No active session"} disabled={!activeSessionId || addMessageLoading} className="h-[58px] min-w-0 flex-1 bg-transparent px-4 text-[13px] leading-6 text-white outline-none placeholder:text-[#5b5b5b] disabled:cursor-not-allowed disabled:text-[#5b5b5b]" maxLength={500} />

                                <button type="submit" disabled={!activeSessionId || addMessageLoading || input.trim().length === 0} className="grid w-14 shrink-0 place-items-center border-l border-[#2e2e2e] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]" aria-label="Send message">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                            <span>{addMessageLoading ? "sending" : "public channel"}</span>
                            <span>{input.length}/500</span>
                        </div>
                    </form>
                </div>

                <aside className="pointer-events-none fixed bottom-6 right-5 hidden flex-col gap-4 lg:flex">
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)]">
                        <Plus size={17} />
                    </button>

                    <button type="button" onClick={scrollToLatest} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]">
                        <ArrowUp className="rotate-180" size={17} />
                    </button>
                </aside>
            </section>

            <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end">
                {questionOpen && (
                    <div className="mb-3 w-[min(calc(100vw-40px),320px)] border border-[#2e2e2e] bg-[#181818]">
                        <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-3">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]">ask / live question</p>
                            <button type="button" onClick={closeQuestionBox} className="grid h-8 w-8 place-items-center text-[#929292] active:bg-[#ff6a6a] active:text-[#171717]" aria-label="Close question box">
                                <X size={15} />
                            </button>
                        </div>

                        {questionSent ? (
                            <div className="px-4 py-5">
                                <p className="font-sans text-[18px] uppercase leading-tight tracking-[0.04em] text-white">Question Sent</p>
                                <p className="mt-2 text-[13px] leading-5 text-[#929292]">Your question has been sent.</p>
                            </div>
                        ) : (
                            <form onSubmit={sendQuestion} className="p-3">
                                <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="Write your question" className="min-h-24 w-full resize-none border border-[#2e2e2e] bg-[#171717] px-3 py-3 text-[13px] leading-5 text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]" maxLength={240} />

                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{questionText.length}/240</span>
                                    <button type="submit" disabled={questionText.trim().length === 0} className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]">
                                        <Send size={14} />
                                        Send
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {!questionOpen && (
                    <button type="button" onClick={() => setQuestionOpen(true)} className="flex h-10 items-center gap-2 rounded-[24px] border border-[#5b5b5b] bg-[#181818] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]" aria-label="Ask a question">
                        <MessageCircle size={15} />
                        Ask me a question
                    </button>
                )}
            </div>

            <style jsx global>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(14px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes reactionFloat {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 12px) scale(0.85);
                    }
                    15% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -72px) scale(1.1);
                    }
                }
            `}</style>
        </main>
    );
}

function SystemMessage({ title, body, tone = "muted" }: { title: string; body: string; tone?: "muted" | "error" }) {
    return (
        <div className="border-b border-[#2e2e2e] px-4 py-5 sm:px-5">
            <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone === "error" ? "text-[#ff6a6a]" : "text-[#5b5b5b]"}`}>{title}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#929292]">{body}</p>
        </div>
    );
}

function LivePollPanel({ poll, currentTime, selectedOptionId, isPending, compact, onVote }: { poll: LivePoll; currentTime: number; selectedOptionId?: string; isPending: boolean; compact: boolean; onVote: (poll: LivePoll, optionId: string) => void }) {
    const progress = getPollProgress(poll, currentTime);
    const secondsRemaining = getSecondsRemaining(poll.ends_at, currentTime);
    const hasVoted = Boolean(selectedOptionId);

    return (
        <section className="relative overflow-hidden border border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-sm">
            <div className={`grid gap-3 px-4 sm:grid-cols-[1fr_auto] sm:items-start sm:px-5 ${compact ? "pb-3 pt-3" : "pb-5 pt-4"}`}>
                <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">poll / {hasVoted ? "vote locked" : isPending ? "sending vote" : `${secondsRemaining}s left`}</p>
                    <h2 className={`mt-2 break-words font-sans uppercase leading-[1.05] tracking-[0.04em] text-white ${compact ? "overflow-hidden text-[16px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-[18px]" : "text-[20px] sm:text-[24px]"}`}>{poll.title}</h2>
                </div>

                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:text-right">{poll.poll_options.length} options</p>
            </div>

            <div className={`grid gap-2 px-4 sm:grid-cols-2 sm:px-5 ${compact ? "pb-3" : "pb-5"}`}>
                {poll.poll_options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const disabled = hasVoted || isPending;

                    return (
                        <button key={option.id} type="button" onClick={() => onVote(poll, option.id)} disabled={disabled} className={`border px-3 text-left transition-colors disabled:cursor-not-allowed ${compact ? "min-h-9 truncate py-2 text-[12px] leading-4" : "min-h-12 py-3 text-[13px] leading-5"} ${isSelected ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]" : "border-[#2e2e2e] bg-[#171717] text-[#929292] active:bg-[#ff6a6a] active:text-[#171717] disabled:text-[#5b5b5b]"}`} aria-pressed={isSelected}>
                            {option.option}
                        </button>
                    );
                })}
            </div>

            <div className="absolute bottom-0 left-0 h-1 bg-[#2e2e2e] right-0" aria-hidden>
                <div className="h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </section>
    );
}

```

---

### File: `app/login/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Plus, Check } from "lucide-react";
import Field from "@/components/Field";
import { useAuth } from "@/context/token-context";

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

type LoginErrors = Partial<Record<keyof LoginForm, string> & { general?: string }>;

const initialLoginForm: LoginForm = {
    email: "",
    password: "",
    remember: false,
};

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLogin(form: LoginForm): LoginErrors {
    const errors: LoginErrors = {};

    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!validateEmail(form.email)) errors.email = "Enter a valid email address.";

    if (!form.password) errors.password = "Password is required.";
    else if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";

    return errors;
}

export default function UXISMLoginPage() {
    const [form, setForm] = useState<LoginForm>(initialLoginForm);
    const [errors, setErrors] = useState<LoginErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const auth = useAuth();

    function updateField<K extends keyof LoginForm>(key: K, value: LoginForm[K]) {
        const nextForm = { ...form, [key]: value };
        setForm(nextForm);
        setErrors((prevErrors) => ({ ...prevErrors, [key]: undefined }));
        // setErrors(validateLogin(nextForm));
    }

    function submitLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors = validateLogin(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        const payload = {
            email: form.email.trim() ? form.email : undefined,
            password: form.password.trim() ? form.password : undefined,
        };

        setLoading(true);
        auth?.login({ email: payload.email, password: payload.password! })
            .then(() => {
                window.location.href = "/dashboard";
            })
            .catch((error) => {
                setErrors({ general: error.message || "Login failed. Please try again." });
            })
            .finally(() => setLoading(false));
    }

    return (
        <main className="min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-5 w-5 border-b border-r border-[#5b5b5b]" />

            <div className="pointer-events-none fixed left-1/2 top-[-130px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-30 blur-3xl" />

            <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-5xl px-5 py-8 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
                <div className="flex min-h-[calc(100vh-64px)] flex-col justify-between lg:max-w-[75%]">
                    <header className="space-y-8">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LOGIN / 2026</p>
                                <h1 className="mt-3 max-w-[10ch] font-sans text-[42px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[56px]">Return to System</h1>
                            </div>

                            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] transition-colors active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] lg:hidden" aria-label="Open login map">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="h-px w-full bg-[#2e2e2e]" />
                            <div className="h-px w-1/2 bg-[#DEF767]" />
                            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                <span>01 / credential check</span>
                                <span>AUTH</span>
                            </div>
                        </div>
                    </header>

                    <div className="py-10 md:py-14">
                        <AnimatePresence mode="wait">
                            {!submitted ? (
                                <motion.form key="login-form" onSubmit={submitLogin} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="space-y-8">
                                    <div>
                                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">Access Slab</p>
                                        <h2 className="mt-2 font-sans text-2xl uppercase tracking-[0.04em] text-white">Login</h2>
                                        <p className="mt-3 max-w-md text-[13px] leading-6 text-[#929292]">Enter your registered credentials. The interface stays sparse; validation appears only when needed.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <Field label="Email" error={errors.email}>
                                            <input id="login-email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@domain.com" className="uxism-input" autoComplete="email" />
                                        </Field>

                                        <Field label="Password" error={errors.password}>
                                            <div className="flex border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
                                                <input id="login-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Minimum 8 characters" className="uxism-input border-0" type={showPassword ? "text" : "password"} autoComplete="current-password" />
                                                <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid w-14 place-items-center border-l border-[#2e2e2e] text-[#929292] active:bg-[#ff6a6a] active:text-[#171717]" aria-label={showPassword ? "Hide password" : "Show password"}>
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </Field>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border-y border-[#2e2e2e] py-4">
                                        <button type="button" onClick={() => updateField("remember", !form.remember)} className="flex items-center gap-3 text-left">
                                            <span className={`grid h-5 w-5 place-items-center border ${form.remember ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]" : "border-[#5b5b5b] text-transparent"}`}>
                                                <Check size={13} />
                                            </span>
                                            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">Remember access</span>
                                        </button>

                                        <button type="button" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] active:text-[#DEF767]">
                                            Forgot key?
                                        </button>
                                    </div>

                                    <footer className="flex items-center justify-between gap-3 border-t border-[#2e2e2e] pt-5">
                                        <button type="button" className="h-11 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                            Create account
                                        </button>

                                        <button type="submit" className={`flex h-11 items-center gap-2 ${loading ? "bg-[#c6bbbb]" : "bg-[#ff6a6a]"} px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717]`}>
                                            Login <ArrowRight size={15} />
                                        </button>
                                    </footer>
                                </motion.form>
                            ) : (
                                <motion.div key="success" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="border border-[#2e2e2e] bg-[#171717] p-6">
                                    <div className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] text-[#DEF767]">
                                        <Check size={18} />
                                    </div>
                                    <h2 className="mt-6 font-sans text-2xl uppercase tracking-[0.04em] text-white">Access Captured</h2>
                                    <p className="mt-3 max-w-md text-[13px] leading-6 text-[#929292]">Login payload is ready. Replace the console log with your backend authentication request.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">x:20 / rail:protected / state:dark-first</div>
                </div>

                <aside className="pointer-events-none fixed bottom-6 right-5 hidden flex-col gap-4 lg:flex">
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)]">
                        <Plus size={17} />
                    </button>
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]">
                        <ArrowRight size={17} />
                    </button>
                </aside>
            </section>

            <style jsx global>{`
                .uxism-input {
                    width: 100%;
                    height: 54px;
                    border: 1px solid #2e2e2e;
                    background: #171717;
                    padding: 0 16px;
                    color: #ffffff;
                    font-size: 13px;
                    line-height: 1.5;
                    outline: none;
                }

                .uxism-input::placeholder {
                    color: #5b5b5b;
                }

                .uxism-input:focus {
                    border-color: rgba(222, 247, 103, 0.5);
                }
            `}</style>
        </main>
    );
}

```

---

### File: `app/myteam/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/context/token-context";

const GET_MY_TEAM = gql`
    query GetMyTeam($userId: uuid!) {
        team_members(where: { user_id: { _eq: $userId } }) {
            team {
                id
                name
                created_at
                team_members {
                    id
                    member_type
                    user {
                        name
                        profile_picture
                    }
                }
            }
        }
    }
`;

function getInitials(name?: string | null) {
    if (!name || !name.trim()) return "UX";
    return name.trim().split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export default function MyTeamPage() {
    const auth = useAuth();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const data = auth?.getData() as {
            "https://hasura.io/jwt/claims": {
                "x-hasura-user-id": string;
            };
        };
        const uid = data?.["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"];
        if (uid) setUserId(uid);
    }, [auth]);

    const { data, loading, error } = useQuery<{ team_members: { team: { id: string, name: string, created_at: string, team_members: { id: string, member_type: string, user: { name: string, profile_picture: string } }[] } }[] }>(GET_MY_TEAM, {
        variables: { userId },
        skip: !userId,
    });

    const myTeamMemberRecord = data?.team_members?.[0];
    const team = myTeamMemberRecord?.team;
    const members = team?.team_members || [];


    function getImageUrl(imagePath?: string | null) {
    if (!imagePath) return "";
    
    // If it's already a full URL (like Dicebear) or a base64 string, return it as is
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
        return imagePath;
    }

    // Otherwise, append the backend URL and the /uploads/ prefix
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    return `${backendUrl}/uploads/${imagePath}`;
}

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <Link
                    href="/dashboard"
                    className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
                >
                    <ArrowLeft size={14} aria-hidden />
                    Dashboard
                </Link>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">My Team</p>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
                {loading || !userId ? (
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                        Loading team data…
                    </p>
                ) : error ? (
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">
                        Error: {error.message}
                    </p>
                ) : !team ? (
                    <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8 text-center">
                        <p className="font-sans text-[20px] uppercase tracking-[0.04em] text-white">No Team Found</p>
                        <p className="mt-2 text-[13px] text-[#929292]">You are not currently assigned to any team.</p>
                    </div>
                ) : (
                    <>
                        <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">TEAM PROFILE</p>
                            <h1 className="mt-2 font-sans text-[32px] uppercase tracking-[0.04em] text-white">{team.name}</h1>

                        </div>

                        <div className="border border-[#2e2e2e] bg-[#171717]">
                            <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
                                <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">Team Members</h2>
                                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                    <Users size={14} />
                                    <span>{members.length} Members</span>
                                </div>
                            </div>

                            <div className="divide-y divide-[#2e2e2e]">
                                {members.map((member: { id: string, member_type: string, user?: { name: string, profile_picture: string } }) => (
                                    <div key={member.id} className="flex items-center justify-between px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            {member.user?.profile_picture ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={getImageUrl(member.user.profile_picture)} alt="" className="h-12 w-12 border border-[#2e2e2e] object-cover" />
                                            ) : (
                                                <div className="grid h-12 w-12 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[14px] uppercase tracking-[0.08em] text-[#ff6a6a]">
                                                    {getInitials(member.user?.name)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-sans text-[18px] uppercase tracking-[0.04em] text-white">
                                                    {member.user?.name || "Unknown User"}
                                                </p>
                                                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                                    {member.member_type || "Member"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

```

---

### File: `app/page.tsx`

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 h-5 w-5 border-l border-t border-[#5b5b5b] sm:left-6 sm:top-6" />
            <div className="pointer-events-none fixed right-4 top-4 h-5 w-5 border-r border-t border-[#5b5b5b] sm:right-6 sm:top-6" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-5 w-5 border-b border-l border-[#5b5b5b] sm:bottom-6 sm:left-6" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-5 w-5 border-b border-r border-[#5b5b5b] sm:bottom-6 sm:right-6" />

            <div className="pointer-events-none fixed left-1/2 top-[-130px] h-[min(340px,80vw)] w-[min(340px,80vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-30 blur-3xl" />

            <section className="relative z-10 flex min-h-screen items-center justify-center px-5">
                <div className="flex w-full max-w-md flex-col items-center text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / SPLASH / 2026</p>

                    <h1 className="mt-4 font-sans text-[clamp(2.5rem,12vw,4.5rem)] uppercase leading-[0.92] tracking-[0.02em] text-white">
                        UXATHON&apos;26
                    </h1>

                    <p className="mt-4 max-w-[28ch] text-[13px] leading-[1.5] text-[#929292]">
                        Edge AI experience lab. Enter the dashboard to begin.
                    </p>

                    <Link
                        href="/dashboard"
                        className="mt-8 flex h-11 w-full max-w-[240px] items-center justify-center gap-2 bg-[#ff6a6a] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717] sm:w-auto sm:min-w-[200px]"
                    >
                        Go to Dashboard
                        <ArrowRight size={14} aria-hidden />
                    </Link>
                </div>
            </section>
        </main>
    );
}

```

---

### File: `app/profile/page.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { ArrowLeft, Download, Pencil, Save, X } from "lucide-react";
import Field from "@/components/Field";
import { useAuth } from "@/context/token-context";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

const PROFILE_STORAGE_KEY = "uxathon-player-profile";
const UPDATE_PROFILE_MUTATION = gql`
    mutation UpdateProfile($userId: uuid!, $name: String, $email: String, $company: String, $skills: [String!]) {
        update_users_by_pk(pk_columns: { id: $userId }, _set: { name: $name, email: $email, company: $company, skills: $skills }) {
            id
        }
    }
`;

type UpdateProfileMutationData = {
    update_users_by_pk: {
        id: string;
    } | null;
};

type UpdateProfileMutationVariables = {
    userId: string;
    name?: string;
    email?: string;
    company?: string;
    skills?: string[];
};

type PlayerProfile = {
    name: string;
    email: string;
    phone: string;
    company: string;
    skills: string;
    avatarUrl: string;
};

type DecodedUserData = {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    skills?: string[] | string;
    avatarUrl?: string;
    profile_picture?: string;
};

const emptyProfile: PlayerProfile = {
    name: "",
    email: "",
    phone: "",
    company: "",
    skills: "",
    avatarUrl: "",
};

function loadProfile(): PlayerProfile {
    if (typeof window === "undefined") return emptyProfile;
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return emptyProfile;
        return { ...emptyProfile, ...JSON.parse(raw) };
    } catch {
        return emptyProfile;
    }
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "UX";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function parseSkills(skills: string) {
    return skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
}

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function decodeToProfile(data: unknown): Partial<PlayerProfile> {
    const decoded = (data || {}) as DecodedUserData;
    const skills = Array.isArray(decoded.skills) ? decoded.skills.join(", ") : readString(decoded.skills);

    return {
        name: readString(decoded.name),
        email: readString(decoded.email),
        phone: readString(decoded.phone),
        company: readString(decoded.company),
        skills,
        avatarUrl: readString(decoded.avatarUrl) || readString(decoded.profile_picture),
    };
}

export default function ProfilePage() {
    const auth = useAuth();
    const [updateProfile] = useMutation<UpdateProfileMutationData, UpdateProfileMutationVariables>(UPDATE_PROFILE_MUTATION);
    const cardRef = useRef<HTMLDivElement>(null);
    const [profile, setProfile] = useState<PlayerProfile>(emptyProfile);
    const [draft, setDraft] = useState<PlayerProfile>(emptyProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const saved = loadProfile();
        const decoded = decodeToProfile(auth.getData());
        const hasDecodedData = Object.values(decoded).some(Boolean);

        const base = hasDecodedData
            ? {
                  ...saved,
                  ...Object.fromEntries(Object.entries(decoded).filter(([, value]) => Boolean(value))),
              }
            : saved;

        queueMicrotask(() => {
            setProfile(base);
            setDraft(base);
            setHydrated(true);
        });
    }, [auth]);

    function startEditing() {
        setDraft(profile);
        setIsEditing(true);
    }

    function cancelEditing() {
        setDraft(profile);
        setIsEditing(false);
    }

    function getUserId(): string {
        const data = auth.getData() as {
            "https://hasura.io/jwt/claims"?: {
                "x-hasura-user-id"?: string;
            };
        };

        return data?.["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"] || "";
    }


    function getImageUrl(imagePath?: string | null) {
    if (!imagePath) return "";
    
    // If it's already a full URL (like Dicebear) or a base64 string, return it as is
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
        return imagePath;
    }

    // Otherwise, append the backend URL and the /uploads/ prefix
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    return `${backendUrl}/uploads/${imagePath}`;
}

    async function saveProfile() {
        const next = {
            ...draft,
            name: draft.name.trim(),
            email: draft.email.trim(),
            phone: draft.phone.trim(),
            company: draft.company.trim(),
            skills: draft.skills.trim(),
            avatarUrl: draft.avatarUrl.trim(),
        };

        const userId = getUserId();
        if (userId) {
            await updateProfile({
                variables: {
                    userId,
                    name: next.name || undefined,
                    email: next.email || undefined,
                    company: next.company || undefined,
                    skills: parseSkills(next.skills),
                },
            });
        }

        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
        setProfile(next);
        setDraft(next);
        setIsEditing(false);
    }

    function updateDraft<K extends keyof PlayerProfile>(key: K, value: PlayerProfile[K]) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    async function downloadCard() {
        if (!cardRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#171717",
            });
            const link = document.createElement("a");
            link.download = "uxathon-player-card.png";
            link.href = dataUrl;
            link.click();
        } catch {
            console.error("Failed to export player card");
        } finally {
            setIsDownloading(false);
        }
    }

    const display = isEditing ? draft : profile;
    const skillTags = parseSkills(display.skills);
    const initials = getInitials(display.name);

    const inputClass = "w-full border border-[#2e2e2e] bg-[#181818] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]";

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <Link href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                    <ArrowLeft size={14} aria-hidden />
                    Dashboard
                </Link>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Profile</p>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
                {!hydrated ? (
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Loading profile…</p>
                ) : (
                    <>
                        <div ref={cardRef} className="border border-[#2e2e2e] bg-[#171717] px-6 py-8" aria-label="Player card">
                            <div className="flex flex-col items-center">
                                {display.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getImageUrl(display.avatarUrl)} alt="" className="h-24 w-24 rounded-full border border-[#2e2e2e] object-cover" />
                                ) : (
                                    <div className="grid h-24 w-24 place-items-center rounded-full border border-[#2e2e2e] bg-[#181818] font-sans text-[28px] uppercase tracking-[0.04em] text-[#ff6a6a]">{initials}</div>
                                )}

                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXATHON / PLAYER CARD</p>
                            </div>

                            <dl className="mt-8 space-y-5">
                                {isEditing ? (
                                    <>
                                        <Field label="Name">
                                            <input type="text" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="Your name" className={inputClass} />
                                        </Field>
                                        <Field label="Email">
                                            <input type="email" value={draft.email} onChange={(e) => updateDraft("email", e.target.value)} placeholder="you@company.com" className={inputClass} />
                                        </Field>
                                        <Field label="Company">
                                            <input type="text" value={draft.company} onChange={(e) => updateDraft("company", e.target.value)} placeholder="Company name" className={inputClass} />
                                        </Field>
                                        <Field label="Skills">
                                            <input type="text" value={draft.skills} onChange={(e) => updateDraft("skills", e.target.value)} placeholder="UX Research, Figma, Prototyping" className={inputClass} />
                                        </Field>
                                    </>
                                ) : (
                                    <>
                                        <ProfileRow label="Name" value={display.name} />
                                        <ProfileRow label="Email" value={display.email} />
                                        <ProfileRow label="Phone number (10-Digits)" value={display.phone} />
                                        <ProfileRow label="Company" value={display.company} />
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Skills</dt>
                                            <dd className="mt-2">
                                                {skillTags.length > 0 ? (
                                                    <ul className="flex flex-wrap gap-2">
                                                        {skillTags.map((skill) => (
                                                            <li key={skill} className="border border-[#2e2e2e] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#929292]">
                                                                {skill}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-[13px] text-[#5b5b5b]">—</p>
                                                )}
                                            </dd>
                                        </div>
                                    </>
                                )}
                            </dl>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {isEditing ? (
                                <>
                                    <button type="button" onClick={saveProfile} className="flex h-11 flex-1 items-center justify-center gap-2 bg-[#ff6a6a] font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717]">
                                        <Save size={14} aria-hidden />
                                        Save
                                    </button>
                                    <button type="button" onClick={cancelEditing} className="flex h-11 flex-1 items-center justify-center gap-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                        <X size={14} aria-hidden />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={startEditing} className="flex h-11 flex-1 items-center justify-center gap-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                    <Pencil size={14} aria-hidden />
                                    Edit
                                </button>
                            )}

                            <button type="button" onClick={downloadCard} disabled={isDownloading || isEditing} className="flex h-11 flex-1 items-center justify-center gap-2 border border-[rgba(222,247,103,0.5)] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:cursor-not-allowed disabled:opacity-40">
                                <Download size={14} aria-hidden />
                                {isDownloading ? "Exporting…" : "Download PNG"}
                            </button>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</dt>
            <dd className="mt-1.5 text-[13px] leading-[1.5] text-white">{value.trim() || "—"}</dd>
        </div>
    );
}

```

---

### File: `app/register/page.tsx`

```tsx
// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import { useAuth } from "@/context/token-context";
// import { UserPlus, ShieldCheck, Zap, Briefcase, Mail, Lock, Phone, Cpu } from "lucide-react";

// export default function RegisterPage() {
//     const { register } = useAuth();
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);

//         const formData = new FormData(e.currentTarget);
//         const name = formData.get("name") as string;
//         const email = formData.get("email") as string;
//         const password = formData.get("password") as string;
//         const phone = formData.get("phone") as string;
//         const company = formData.get("company") as string;
//         const skillsRaw = formData.get("skills") as string;

//         try {
//             await register({
//                 name,
//                 email,
//                 password,
//                 phone,
//                 company,
//                 skills: skillsRaw
//                     .split(",")
//                     .map((s) => s.trim())
//                     .filter(Boolean),
//             });

//             // Null check for local player profile. If not present, save a dummy player profile using the registered credentials
//             const PROFILE_STORAGE_KEY = "uxathon-player-profile";
//             if (typeof window !== "undefined") {
//                 const existingProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
//                 if (!existingProfile) {
//                     const dummyProfile = {
//                         name: name || "",
//                         email: email || "",
//                         phone: phone || "",
//                         company: company || "",
//                         skills: skillsRaw || "",
//                         avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "UX")}`,
//                     };
//                     localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(dummyProfile));
//                 }
//             }

//             window.location.href = "/dashboard";
//         } catch (err: Error | unknown) {
//             setError((err as Error).message || "Registration protocol failed.");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
//             {/* UXISM Background System */}
//             <div className="pointer-events-none fixed inset-0 z-0">
//                 <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />

//                 {/* Spectral Blob - Emotional Counterweight */}
//                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(222,247,103,0.05)_0%,rgba(255,106,106,0.03)_50%,transparent_100%)] blur-[100px]" />

//                 {/* Technical Drawing Markers */}
//                 <div className="absolute left-8 top-8 h-6 w-6 border-l border-t border-[#5b5b5b]/40" />
//                 <div className="absolute right-8 top-8 h-6 w-6 border-r border-t border-[#5b5b5b]/40" />
//                 <div className="absolute left-8 bottom-8 h-6 w-6 border-l border-b border-[#5b5b5b]/40" />
//                 <div className="absolute right-8 bottom-8 h-6 w-6 border-r border-b border-[#5b5b5b]/40" />

//                 {/* Center Crosshair */}
//                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 opacity-20">
//                     <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5b5b5b]" />
//                     <div className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5b5b5b]" />
//                 </div>
//             </div>

//             <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/80 px-6 py-5 backdrop-blur-md">
//                 <div className="flex flex-col">
//                     <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Identity Node</p>
//                     <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">SECURE CONNECTION</p>
//                 </div>
//                 <div className="hidden sm:flex flex-col items-end">
//                     <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Registration Node</p>
//                     <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">V1.0.4</p>
//                 </div>
//             </header>

//             <section className="relative z-10 flex min-h-[calc(100-80px)] flex-col items-center justify-center px-6 py-20">
//                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-lg">
//                     <div className="mb-10 text-center sm:text-left">
//                         <h1 className="font-sans text-4xl uppercase tracking-tight text-white mb-3">
//                             Join <span className="text-[#ff6a6a]">UXISM</span>
//                         </h1>
//                         <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#5b5b5b]">Establish your identity in the network.</p>
//                     </div>

//                     <form onSubmit={handleSubmit} className="group relative">
//                         {/* Unified Slab Construction */}
//                         <div className="border border-[#2e2e2e] bg-[#171717] divide-y divide-[#2e2e2e]">
//                             <RegisterInput label="Full Name" name="name" type="text" placeholder="J. DOE" icon={<UserPlus size={16} />} required />
//                             <RegisterInput label="Email Address" name="email" type="email" placeholder="YOU@DOMAIN.EXT" icon={<Mail size={16} />} required />
//                             <RegisterInput label="Password" name="password" type="password" placeholder="••••••••" icon={<Lock size={16} />} required />
//                             <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2e2e2e]">
//                                 <RegisterInput label="Phone Number" name="phone" type="tel" placeholder="987********" icon={<Phone size={16} />} required />
//                                 <RegisterInput label="Affiliation" name="company" type="text" placeholder="CORPORATION / ORG" icon={<Briefcase size={16} />} required />
//                             </div>
//                             <RegisterInput label="Skills" name="skills" type="text" placeholder="UI, UX...(COMMA SEPARATED)" icon={<Cpu size={16} />} required />
//                         </div>

//                         {error && (
//                             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-6 border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff6a6a]">
//                                 <span className="mr-2 opacity-50">ERROR:</span> {error}
//                             </motion.div>
//                         )}

//                         <div className="mt-8 flex flex-col gap-4">
//                             <button type="submit" disabled={isLoading} className="relative group flex h-14 w-full items-center justify-center overflow-hidden bg-[#ff6a6a] transition-all hover:bg-[#ff4d4d] disabled:opacity-50">
//                                 <span className="relative z-10 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#171717]">
//                                     {isLoading ? (
//                                         <div className="h-4 w-4 animate-spin border-2 border-[#171717] border-t-transparent rounded-full" />
//                                     ) : (
//                                         <>
//                                             Initialize Protocol
//                                             <ShieldCheck size={18} />
//                                         </>
//                                     )}
//                                 </span>
//                             </button>

//                             <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#5b5b5b]">
//                                 By initializing, you agree to the <span className="text-[#929292]">System Terms</span>
//                             </p>
//                         </div>
//                     </form>
//                 </motion.div>
//             </section>

//             {/* Right Rail - Reserved for FABs only as per UXISM Law */}
//             <div className="fixed right-0 top-0 bottom-0 w-[25%] pointer-events-none z-30 hidden lg:block">
//                 <div className="absolute right-8 bottom-8 flex flex-col gap-4 pointer-events-auto">
//                     <button className="h-10 w-10 border border-[#5b5b5b] bg-[#181818] text-[#5b5b5b] hover:border-[#DEF767] hover:text-[#DEF767] transition-all flex items-center justify-center">
//                         <Zap size={18} />
//                     </button>
//                 </div>
//             </div>

//             {/* Footer Status Bar */}
//             <footer className="fixed bottom-0 left-0 right-0 z-20 flex h-8 items-center justify-between border-t border-[#2e2e2e] bg-[#181818] px-6">
//                 <div className="flex items-center gap-4">
//                     <div className="flex items-center gap-2">
//                         <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#DEF767]" />
//                         <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#929292]">ENCRYPTION ACTIVE</span>
//                     </div>
//                 </div>
//                 <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5b5b5b]">COORD: REGISTER_FLOW_V1.0</div>
//             </footer>
//         </main>
//     );
// }

// function RegisterInput({ label, name, type, placeholder, icon, required }: { label: string; name: string; type: string; placeholder: string; icon: React.ReactNode; required?: boolean }) {
//     return (
//         <div className="relative group/field px-6 py-5 hover:bg-[#1a1a1a] transition-colors">
//             <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] mb-3 group-focus-within/field:text-[#DEF767] transition-colors">{label}</label>
//             <div className="relative flex items-center gap-4">
//                 <div className="text-[#5b5b5b] group-focus-within/field:text-[#DEF767] transition-colors">{icon}</div>
//                 <input name={name} type={type} required={required} placeholder={placeholder} className="w-full bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-[#2e2e2e]" />
//             </div>
//             {/* Focus Indicator Accent */}
//             <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-focus-within/field:scale-y-100 transition-transform duration-300 origin-top" />
//         </div>
//     );
// }






"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/token-context";
import {
    UserPlus, ShieldCheck, Zap, Briefcase,
    Mail, Lock, Phone, Cpu, Camera
} from "lucide-react";

export default function RegisterPage() {
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New state for media upload
    const [avatarBase64, setAvatarBase64] = useState<string>("");
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize random default avatar on mount
    useEffect(() => {
        const loadRandomAvatar = async () => {
            const randomNum = Math.floor(Math.random() * 5) + 1;
            const imagePath = `/profile_pic/profile_pic${randomNum}.png`;

            // Set preview immediately for UX
            setAvatarPreview(imagePath);

            try {
                // Fetch the default image and convert to base64
                const response = await fetch(imagePath);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAvatarBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Failed to load default avatar sequence:", err);
            }
        };

        loadRandomAvatar();
    }, []);

    // Handle user uploading their own image
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setAvatarBase64(base64String);
                setAvatarPreview(base64String); // Update preview to uploaded image
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const phone = formData.get("phone") as string;
        const company = formData.get("company") as string;
        const skillsRaw = formData.get("skills") as string;

        try {
            await register({
                name,
                email,
                password,
                phone,
                company,
                skills: skillsRaw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                image: avatarBase64, // Passed to backend
            });

            // Null check for local player profile.
            const PROFILE_STORAGE_KEY = "uxathon-player-profile";
            if (typeof window !== "undefined") {
                const existingProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
                if (!existingProfile) {
                    const dummyProfile = {
                        name: name || "",
                        email: email || "",
                        phone: phone || "",
                        company: company || "",
                        skills: skillsRaw || "",
                        // Use the base64 avatar for local storage as well
                        avatarUrl: avatarBase64 || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "UX")}`,
                    };
                    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(dummyProfile));
                }
            }

            window.location.href = "/dashboard";
        } catch (err: Error | unknown) {
            setError((err as Error).message || "Registration protocol failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            {/* UXISM Background System */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(222,247,103,0.05)_0%,rgba(255,106,106,0.03)_50%,transparent_100%)] blur-[100px]" />

                <div className="absolute left-8 top-8 h-6 w-6 border-l border-t border-[#5b5b5b]/40" />
                <div className="absolute right-8 top-8 h-6 w-6 border-r border-t border-[#5b5b5b]/40" />
                <div className="absolute left-8 bottom-8 h-6 w-6 border-l border-b border-[#5b5b5b]/40" />
                <div className="absolute right-8 bottom-8 h-6 w-6 border-r border-b border-[#5b5b5b]/40" />

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 opacity-20">
                    <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5b5b5b]" />
                    <div className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5b5b5b]" />
                </div>
            </div>

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/80 px-6 py-5 backdrop-blur-md">
                <div className="flex flex-col">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Identity Node</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">SECURE CONNECTION</p>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Registration Node</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">V1.0.4</p>
                </div>
            </header>

            <section className="relative z-10 flex min-h-[calc(100-80px)] flex-col items-center justify-center px-6 py-20">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-lg">
                    <div className="mb-10 text-center sm:text-left">
                        <h1 className="font-sans text-4xl uppercase tracking-tight text-white mb-3">
                            Join <span className="text-[#ff6a6a]">UXISM</span>
                        </h1>
                        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#5b5b5b]">Establish your identity in the network.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="group relative">
                        {/* Unified Slab Construction */}
                        <div className="border border-[#2e2e2e] bg-[#171717] divide-y divide-[#2e2e2e]">

                            {/* Avatar Upload Sector */}
                            <div
                                className="relative group/avatar flex flex-col items-center justify-center px-6 py-8 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />

                                <div className="relative h-20 w-20 overflow-hidden rounded-none border border-[#2e2e2e] bg-[#1a1a1a] transition-colors group-hover/avatar:border-[#DEF767]">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Identity Marker"
                                            className="h-full w-full object-cover grayscale opacity-80 group-hover/avatar:grayscale-0 group-hover/avatar:opacity-100 transition-all duration-500"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Camera className="text-[#5b5b5b] group-hover/avatar:text-[#DEF767]" />
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-sm">
                                        <Camera size={20} className="text-[#DEF767]" />
                                    </div>

                                    {/* Crosshair accents on avatar */}
                                    <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-[#DEF767] opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    <div className="absolute right-0 bottom-0 h-2 w-2 border-r border-b border-[#DEF767] opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                </div>

                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] group-hover/avatar:text-[#DEF767] transition-colors">
                                    [ Override Visual Identity ]
                                </p>
                            </div>

                            <RegisterInput label="Full Name" name="name" type="text" placeholder="J. DOE" icon={<UserPlus size={16} />} required />
                            <RegisterInput label="Email Address" name="email" type="email" placeholder="YOU@DOMAIN.EXT" icon={<Mail size={16} />} required />
                            <RegisterInput label="Password" name="password" type="password" placeholder="••••••••" icon={<Lock size={16} />} required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2e2e2e]">
                                <RegisterInput label="Phone Number" name="phone" type="tel" placeholder="987********" icon={<Phone size={16} />} required />
                                <RegisterInput label="Affiliation" name="company" type="text" placeholder="CORPORATION / ORG" icon={<Briefcase size={16} />} required />
                            </div>
                            <RegisterInput label="Skills" name="skills" type="text" placeholder="UI, UX...(COMMA SEPARATED)" icon={<Cpu size={16} />} required />
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-6 border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff6a6a]">
                                <span className="mr-2 opacity-50">ERROR:</span> {error}
                            </motion.div>
                        )}

                        <div className="mt-8 flex flex-col gap-4">
                            <button type="submit" disabled={isLoading} className="relative group flex h-14 w-full items-center justify-center overflow-hidden bg-[#ff6a6a] transition-all hover:bg-[#ff4d4d] disabled:opacity-50">
                                <span className="relative z-10 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#171717]">
                                    {isLoading ? (
                                        <div className="h-4 w-4 animate-spin border-2 border-[#171717] border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            Initialize Protocol
                                            <ShieldCheck size={18} />
                                        </>
                                    )}
                                </span>
                            </button>

                            <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#5b5b5b]">
                                By initializing, you agree to the <span className="text-[#929292]">System Terms</span>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </section>

            {/* Right Rail */}
            <div className="fixed right-0 top-0 bottom-0 w-[25%] pointer-events-none z-30 hidden lg:block">
                <div className="absolute right-8 bottom-8 flex flex-col gap-4 pointer-events-auto">
                    <button className="h-10 w-10 border border-[#5b5b5b] bg-[#181818] text-[#5b5b5b] hover:border-[#DEF767] hover:text-[#DEF767] transition-all flex items-center justify-center">
                        <Zap size={18} />
                    </button>
                </div>
            </div>

            {/* Footer Status Bar */}
            <footer className="fixed bottom-0 left-0 right-0 z-20 flex h-8 items-center justify-between border-t border-[#2e2e2e] bg-[#181818] px-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#DEF767]" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#929292]">ENCRYPTION ACTIVE</span>
                    </div>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5b5b5b]">COORD: REGISTER_FLOW_V1.0</div>
            </footer>
        </main>
    );
}

function RegisterInput({ label, name, type, placeholder, icon, required }: { label: string; name: string; type: string; placeholder: string; icon: React.ReactNode; required?: boolean }) {
    return (
        <div className="relative group/field px-6 py-5 hover:bg-[#1a1a1a] transition-colors">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] mb-3 group-focus-within/field:text-[#DEF767] transition-colors">{label}</label>
            <div className="relative flex items-center gap-4">
                <div className="text-[#5b5b5b] group-focus-within/field:text-[#DEF767] transition-colors">{icon}</div>
                <input name={name} type={type} required={required} placeholder={placeholder} className="w-full bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-[#2e2e2e]" />
            </div>
            {/* Focus Indicator Accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-focus-within/field:scale-y-100 transition-transform duration-300 origin-top" />
        </div>
    );
}

```

---

### File: `components/AnimatedBanner.tsx`

```tsx
// "use client";

// import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";

// export type TextEffect = "blur-reveal" | "masked-slide" | "highlight" | "marquee" | "scramble";
// export type FontType = "sans" | "sans" | "mono" | "display";

// interface AnimatedBannerProps {
//     text: string;
//     effect: TextEffect;
//     speed?: number; // Speed multiplier (e.g. 0.5x to 3x, default 1)
//     blurStrength?: number; // Blur strength in pixels (default 12)
//     font?: FontType; // Optional custom font family override
//     fontSize?: number; // Main heading font size override in pixels
//     repeat?: boolean; // Infinite repeat option for one-shot effects
// }

// const fontStyleMap: Record<FontType, string> = {
//     sans: "Georgia, sans",
//     sans: "system-ui, -apple-system, sans-sans",
//     mono: "var(--font-mono), Courier New, Courier, monospace",
//     display: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-sans'
// };

// export function AnimatedBanner({ text, effect, speed = 1, blurStrength = 12, font, fontSize, repeat = false }: AnimatedBannerProps) {
//     const animSpeed = Math.max(0.1, speed);
//     const animBlur = Math.max(0, blurStrength);

//     // Determine font family: use custom override if provided, otherwise default to effect preferences
//     const defaultFont: FontType = effect === "scramble" ? "mono" : effect === "blur-reveal" ? "sans" : "sans";
//     const selectedFont = fontStyleMap[font || defaultFont];

//     // Calculate Marquee Rotation Speed (duration in seconds)
//     const marqueeDuration = Math.max(1, 20 / animSpeed);

//     return (
//         <div 
//             className="w-full flex items-center justify-center overflow-hidden border border-[#2e2e2e] p-8 rounded min-h-[140px] relative"
//             style={{ backgroundColor: "var(--bg-inset)" }}
//         >
//             <AnimatePresence mode="wait">
//                 <motion.div
//                     key={`${text}-${effect}-${animSpeed}-${animBlur}-${selectedFont}`}
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     exit={{ opacity: 0 }}
//                     transition={{ duration: 0.3 / animSpeed }}
//                     className="w-full flex justify-center items-center"
//                 >
//                     {/* 1. Apple-Style Blur Reveal */}
//                     {effect === "blur-reveal" && (
//                         <motion.h1
//                             initial={{ filter: `blur(${animBlur}px)`, opacity: 0, scale: 0.95 }}
//                             animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
//                             transition={{ 
//                                 duration: 1.2 / animSpeed, 
//                                 ease: "easeOut",
//                                 repeat: repeat ? Infinity : 0,
//                                 repeatType: "reverse",
//                                 repeatDelay: 2
//                             }}
//                             className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white text-center"
//                             style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                         >
//                             {text}
//                         </motion.h1>
//                     )}

//                     {/* 2. Agency Masked Slide-Up */}
//                     {effect === "masked-slide" && (
//                         <div className="overflow-hidden py-2">
//                             <motion.h1
//                                 initial={{ y: "100%" }}
//                                 animate={{ y: "0%" }}
//                                 transition={{ 
//                                     duration: 0.9 / animSpeed, 
//                                     ease: [0.16, 1, 0.3, 1],
//                                     repeat: repeat ? Infinity : 0,
//                                     repeatType: "loop",
//                                     repeatDelay: 2
//                                 }}
//                                 className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-white text-center tracking-wide"
//                                 style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                             >
//                                 {text}
//                             </motion.h1>
//                         </div>
//                     )}

//                     {/* 3. SaaS Animated Highlight */}
//                     {effect === "highlight" && (
//                         <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white text-center" style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}>
//                             <span className="relative inline-block px-4 py-1 text-black">
//                                 <motion.span
//                                     className="absolute inset-0 bg-[#DEF767] rounded"
//                                     initial={{ scaleX: 0 }}
//                                     animate={{ scaleX: 1 }}
//                                     style={{ originX: 0 }}
//                                     transition={{ 
//                                         duration: 0.9 / animSpeed, 
//                                         delay: 0.2 / animSpeed, 
//                                         ease: "easeInOut",
//                                         repeat: repeat ? Infinity : 0,
//                                         repeatType: "reverse",
//                                         repeatDelay: 2
//                                     }}
//                                 />
//                                 <span className="relative z-10">{text}</span>
//                             </span>
//                         </h1>
//                     )}

//                     {/* 4. Trendy Infinite Marquee */}
//                     {effect === "marquee" && (
//                         <div className="relative w-full overflow-hidden whitespace-nowrap py-4">
//                             <style>{`
//                                 @keyframes customMarquee {
//                                     0% { transform: translateX(0%); }
//                                     100% { transform: translateX(-50%); }
//                                 }
//                                 .animate-custom-marquee {
//                                     display: inline-block;
//                                     white-space: nowrap;
//                                 }
//                             `}</style>
//                             <div 
//                                 className="animate-custom-marquee"
//                                 style={{
//                                     animation: `customMarquee ${marqueeDuration}s linear infinite`
//                                 }}
//                             >
//                                 <span 
//                                     className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
//                                     style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                                 >
//                                     {text} • {text} • {text} • {text} •
//                                 </span>
//                                 <span 
//                                     className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
//                                     style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                                 >
//                                     {text} • {text} • {text} • {text} •
//                                 </span>
//                             </div>
//                         </div>
//                     )}

//                     {/* 5. Hacker Text Scramble / Decode */}
//                     {effect === "scramble" && (
//                         <h1 
//                             className="text-xl md:text-3xl lg:text-4xl font-mono text-[#DEF767] text-center tracking-wider"
//                             style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined }}
//                         >
//                             <ScrambleText text={text} speed={animSpeed} repeat={repeat} />
//                         </h1>
//                     )}
//                 </motion.div>
//             </AnimatePresence>
//         </div>
//     );
// }

// function ScrambleText({ text, speed, repeat }: { text: string; speed: number; repeat?: boolean }) {
//     const [displayedText, setDisplayedText] = useState("");
//     const [triggerKey, setTriggerKey] = useState(0);
//     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%-=!?";

//     useEffect(() => {
//         let isMounted = true;
//         let iterations = 0;
//         const intervalTime = Math.max(8, Math.round(25 / speed));

//         const interval = setInterval(() => {
//             if (!isMounted) return;

//             const result = text
//                 .split("")
//                 .map((char, index) => {
//                     if (index < iterations) {
//                         return text[index];
//                     }
//                     if (char === " ") return " ";
//                     return chars[Math.floor(Math.random() * chars.length)];
//                 })
//                 .join("");

//             setDisplayedText(result);

//             if (iterations >= text.length) {
//                 clearInterval(interval);
//                 if (repeat) {
//                     setTimeout(() => {
//                         if (isMounted) {
//                             setTriggerKey((prev) => prev + 1);
//                         }
//                     }, 3000);
//                 }
//             }
//             iterations += speed / 3.5; // Decode pace proportional to speed setting
//         }, intervalTime);

//         return () => {
//             isMounted = false;
//             clearInterval(interval);
//         };
//     }, [text, speed, triggerKey, repeat]);

//     return <span>{displayedText}</span>;
// }




"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TextEffect = "blur-reveal" | "masked-slide" | "highlight" | "marquee" | "scramble";
export type FontType = "sans" | "sans" | "mono" | "display";

interface AnimatedBannerProps {
    text: string;
    effect: TextEffect;
    speed?: number; // Speed multiplier (e.g. 0.5x to 3x, default 1)
    blurStrength?: number; // Blur strength in pixels (default 12)
    font?: FontType; // Optional custom font family override
    fontSize?: number; // Main heading font size override in pixels
    repeat?: boolean; // Infinite repeat option for one-shot effects
    color?: string; // Custom text color hex code
}

const fontStyleMap: Record<FontType, string> = {
    sans: "Georgia, sans",
    sans: "system-ui, -apple-system, sans-sans",
    mono: "var(--font-mono), Courier New, Courier, monospace",
    display: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-sans'
};

export function AnimatedBanner({ text, effect, speed = 1, blurStrength = 12, font, fontSize, repeat = false, color = "#ffffff" }: AnimatedBannerProps) {
    const animSpeed = Math.max(0.1, speed);
    const animBlur = Math.max(0, blurStrength);
    console.log(color)
    // Determine font family: use custom override if provided, otherwise default to effect preferences
    const defaultFont: FontType = effect === "scramble" ? "mono" : effect === "blur-reveal" ? "sans" : "sans";
    const selectedFont = fontStyleMap[font || defaultFont];

    // Calculate Marquee Rotation Speed (duration in seconds)
    const marqueeDuration = Math.max(1, 20 / animSpeed);

    return (
        <div
            className="w-full flex items-center justify-center overflow-hidden border border-[#2e2e2e] p-8 rounded min-h-[140px] relative"
            style={{ backgroundColor: "var(--bg-inset)" }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${text}-${effect}-${animSpeed}-${animBlur}-${selectedFont}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 / animSpeed }}
                    className="w-full flex justify-center items-center"
                >
                    {/* 1. Apple-Style Blur Reveal */}
                    {effect === "blur-reveal" && (
                        <motion.h1
                            initial={{ filter: `blur(${animBlur}px)`, opacity: 0, scale: 0.95 }}
                            animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                            transition={{
                                duration: 1.2 / animSpeed,
                                ease: "easeOut",
                                repeat: repeat ? Infinity : 0,
                                repeatType: "reverse",
                                repeatDelay: 2
                            }}
                            className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white text-center"
                            style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                        >
                            {text}
                        </motion.h1>
                    )}

                    {/* 2. Agency Masked Slide-Up */}
                    {effect === "masked-slide" && (
                        <div className="overflow-hidden py-2">
                            <motion.h1
                                initial={{ y: "100%" }}
                                animate={{ y: "0%" }}
                                transition={{
                                    duration: 0.9 / animSpeed,
                                    ease: [0.16, 1, 0.3, 1],
                                    repeat: repeat ? Infinity : 0,
                                    repeatType: "loop",
                                    repeatDelay: 2
                                }}
                                className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-white text-center tracking-wide"
                                style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                            >
                                {text}
                            </motion.h1>
                        </div>
                    )}

                    {/* 3. SaaS Animated Highlight */}
                    {effect === "highlight" && (
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white text-center" style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}>
                            <span className="relative inline-block px-4 py-1 text-black">
                                <motion.span
                                    className="absolute inset-0 bg-[#DEF767] rounded"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    style={{ originX: 0 }}
                                    transition={{
                                        duration: 0.9 / animSpeed,
                                        delay: 0.2 / animSpeed,
                                        ease: "easeInOut",
                                        repeat: repeat ? Infinity : 0,
                                        repeatType: "reverse",
                                        repeatDelay: 2
                                    }}
                                />
                                <span className="relative z-10">{text}</span>
                            </span>
                        </h1>
                    )}

                    {/* 4. Trendy Infinite Marquee */}
                    {effect === "marquee" && (
                        <div className="relative w-full overflow-hidden whitespace-nowrap py-4">
                            <style>{`
                                @keyframes customMarquee {
                                    0% { transform: translateX(0%); }
                                    100% { transform: translateX(-50%); }
                                }
                                .animate-custom-marquee {
                                    display: inline-block;
                                    white-space: nowrap;
                                }
                            `}</style>
                            <div
                                className="animate-custom-marquee"
                                style={{
                                    animation: `customMarquee ${marqueeDuration}s linear infinite`
                                }}
                            >
                                <span
                                    className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
                                    style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                                >
                                    {text} • {text} • {text} • {text} •
                                </span>
                                <span
                                    className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
                                    style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                                >
                                    {text} • {text} • {text} • {text} •
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 5. Hacker Text Scramble / Decode */}
                    {effect === "scramble" && (
                        <h1
                            className="text-xl md:text-3xl lg:text-4xl font-mono text-[#DEF767] text-center tracking-wider"
                            style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                        >
                            <ScrambleText text={text} speed={animSpeed} repeat={repeat} />
                        </h1>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function ScrambleText({ text, speed, repeat }: { text: string; speed: number; repeat?: boolean }) {
    const [displayedText, setDisplayedText] = useState("");
    const [triggerKey, setTriggerKey] = useState(0);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%-=!?";

    useEffect(() => {
        let isMounted = true;
        let iterations = 0;
        const intervalTime = Math.max(8, Math.round(25 / speed));

        const interval = setInterval(() => {
            if (!isMounted) return;

            const result = text
                .split("")
                .map((char, index) => {
                    if (index < iterations) {
                        return text[index];
                    }
                    if (char === " ") return " ";
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            setDisplayedText(result);

            if (iterations >= text.length) {
                clearInterval(interval);
                if (repeat) {
                    setTimeout(() => {
                        if (isMounted) {
                            setTriggerKey((prev) => prev + 1);
                        }
                    }, 3000);
                }
            }
            iterations += speed / 3.5; // Decode pace proportional to speed setting
        }, intervalTime);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [text, speed, triggerKey, repeat]);

    return <span>{displayedText}</span>;
}

```

---

### File: `components/Field.tsx`

```tsx
export default function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</span>
            {children}
            {error && <span className="block text-[12px] leading-5 text-[#ff6a6a]">{error}</span>}
        </label>
    );
}

```

---

### File: `context/token-context.tsx`

```tsx
"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type LoginInput = {
    phone?: string;
    email?: string;
    password: string;
};

type RegisterInput = {
    name: string;
    email: string;
    password: string;
    phone: string;
    company: string;
    skills: string[];
    avatar: string;
};

type LoginResponse = {
    data: {
        "jwt-token": string;
        "refresh-token": string;
    };
};

type JwtPayload = {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
};

type AuthContextType = {
    login: (input: LoginInput) => Promise<void>;

    getJwt: () => string | null;
    getRefreshToken: () => string | null;
    getData: () => JwtPayload | null;

    logout: () => void;
    register: (input: RegisterInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const JWT_KEY = "jwt-token";
const REFRESH_KEY = "refresh-token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [, setRefresh] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    const _startRefreshInterval = (delay: number) => {
        if (refreshInterval) clearInterval(refreshInterval);
        const interval = setTimeout(() => refresh(), delay);
        setRefreshInterval(interval);
    };

    const login = async (input: LoginInput) => {
        const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error("Login failed");
        const data: LoginResponse = await response.json();
        console.log("Login successful, received tokens:", data);
        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
        setRefresh((v) => v + 1);
        _startRefreshInterval(1000 * 60); // every one minute
    };

    const register = async (input: RegisterInput) => {
        const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error("Registration failed");
        console.log("in token-context.tsx response:", response)
        const data = await response.json();
        console.log("in token-context.tsx data:", data)

        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
        setRefresh((v) => v + 1);
        _startRefreshInterval(1000 * 60); // every one minute
    };

    const getJwt = () => localStorage.getItem(JWT_KEY);
    const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
    const getData = (): JwtPayload | null => {
        const token = getJwt();
        if (!token) return null;
        try {
            const payload = token.split(".")[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    };


    // const refresh = async () => {
    //     const refreshToken = getRefreshToken();
    //     if (!refreshToken) return;
    //     const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/refresh-token", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ refresh_token: refreshToken }),
    //     });
    //     if (!response.ok) {
    //         logout();
    //         return;
    //     }
    //     const data: LoginResponse = await response.json();
    //     localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
    //     localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
    //     setRefresh((v) => v + 1);
    //     _startRefreshInterval(1000 * 60); // every one minute
    // };

    const refresh = async () => {
        // 1. Isolate the core logic
        const performRefresh = async () => {
            // IMPORTANT: We call getRefreshToken() INSIDE the lock.
            // This ensures that if another tab just finished refreshing the token, 
            // this tab will grab the newly updated token from localStorage, 
            // rather than using a stale one.
            const refreshToken = getRefreshToken();
            if (!refreshToken) return;

            const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/refresh-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                logout();
                return;
            }

            const data: LoginResponse = await response.json();

            localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
            localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
            setRefresh((v) => v + 1);
            _startRefreshInterval(1000 * 60); // every one minute
        };

        // 2. Wrap execution using the exact same lock name as your register/login functions
        if (navigator.locks) {
            await navigator.locks.request("auth-lock", async () => {
                await performRefresh();
            });
        } else {
            // Fallback for unsupported browsers
            console.warn("Web Locks API not supported. Running refresh without a lock.");
            await performRefresh();
        }
    };



    const logout = () => {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setRefresh((v) => v + 1);
    };

    useEffect(() => {
        console.log("AuthProvider mounted");
        if (getRefreshToken()) refresh();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                login,
                register,
                getJwt,
                getRefreshToken,
                getData,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}

```

---

### File: `dump_.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const EXCLUDED_DIRS: string[] = ['node_modules', '.next', '.git', 'out', 'build', 'public'];
const ALLOWED_EXTENSIONS: string[] = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
const EXCLUDED_FILES: string[] = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
const OUTPUT_FILE: string = 'project-code-dump.md'; // Updated to .md

// Helper to map file extensions to Markdown language tags for syntax highlighting
const getMarkdownLang = (ext: string): string => {
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json',
  };
  return langMap[ext] || '';
};

/**
 * Recursively walks through the directory and dumps code into a single Markdown file.
 */
function generateCodeDump(rootDir: string, outputFile: string): void {
  const outputPath = path.join(rootDir, outputFile);

  // Clear previous dump if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Write the initial document header
  fs.writeFileSync(outputPath, '# Project Code Dump\n\n', 'utf-8');

  function walk(currentDir: string): void {
    const files: string[] = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath: string = path.join(currentDir, file);
      const stats: fs.Stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(file)) {
          walk(filePath);
        }
      } else {
        const ext: string = path.extname(file);
        const fileName: string = path.basename(filePath);

        // Filter files to include
        const isAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
        const isExcludedFile = EXCLUDED_FILES.includes(fileName);
        const isOutputFile = fileName === OUTPUT_FILE;

        if (isAllowedExtension && !isExcludedFile && !isOutputFile) {
          try {
            const content: string = fs.readFileSync(filePath, 'utf-8');
            const relativePath: string = path.relative(rootDir, filePath);
            const langTag: string = getMarkdownLang(ext);
            
            // Format the output as proper Markdown with headers and syntax-highlighted code blocks
            const markdownBlock = `### File: \`${relativePath}\`\n\n\`\`\`${langTag}\n${content}\n\`\`\`\n\n---\n\n`;
            
            fs.appendFileSync(outputPath, markdownBlock, 'utf-8');
          } catch (err) {
            console.error(`⚠️ Skipped ${filePath} due to read error.`);
          }
        }
      }
    }
  }

  console.log('Generating Markdown code dump...');
  walk(rootDir);
  console.log(`✅ Markdown code dump successfully generated at: ./${outputFile}`);
}

// Execute the script
generateCodeDump(process.cwd(), OUTPUT_FILE);

```

---

### File: `next-env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.

```

---

### File: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ["http://localhost:3000", "http://192.168.200.108:3000"],
    /* config options here */
};

export default nextConfig;

```

---

### File: `package.json`

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@apollo/client": "^4.1.9",
    "@apollo/client-integration-nextjs": "^0.14.5",
    "framer-motion": "^12.38.0",
    "graphql": "^16.14.0",
    "graphql-ws": "^6.0.8",
    "html-to-image": "^1.11.13",
    "lucide-react": "^1.16.0",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}

```

---

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

---

