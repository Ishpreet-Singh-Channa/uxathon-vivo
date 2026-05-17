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
                        <p className="font-serif text-[20px] uppercase tracking-[0.04em] text-white">No Team Found</p>
                        <p className="mt-2 text-[13px] text-[#929292]">You are not currently assigned to any team.</p>
                    </div>
                ) : (
                    <>
                        <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">TEAM PROFILE</p>
                            <h1 className="mt-2 font-serif text-[32px] uppercase tracking-[0.04em] text-white">{team.name}</h1>

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
                                                <img src={member.user.profile_picture} alt="" className="h-12 w-12 border border-[#2e2e2e] object-cover" />
                                            ) : (
                                                <div className="grid h-12 w-12 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[14px] uppercase tracking-[0.08em] text-[#ff6a6a]">
                                                    {getInitials(member.user?.name)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-serif text-[18px] uppercase tracking-[0.04em] text-white">
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
