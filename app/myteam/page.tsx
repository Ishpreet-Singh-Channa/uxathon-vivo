

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Crown } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/context/token-context";

const GET_MY_TEAM = gql`
  query GetMyTeam($userId: uuid!) {
    team_members(where: { user_id: { _eq: $userId } }) {
      id
      member_type
      team {
        id
        name
        created_at
        created_by
        team_members {
          id
          member_type
          user {
            id
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
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function getImageUrl(imagePath?: string | null) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  return `${backendUrl}/uploads/${imagePath}`;
}

type TeamMember = {
  id: string;
  member_type: string;
  user?: {
    id: string;
    name: string;
    profile_picture: string;
  };
};

type Team = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  team_members: TeamMember[];
};

export default function MyTeamPage() {
  const auth = useAuth();
  const authData = auth?.getData() as { id?: string };
  const userId = authData?.id;

  const { data, loading, error } = useQuery<{
    team_members: { id: string; member_type: string; team: Team }[];
  }>(GET_MY_TEAM, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: "network-only", // <-- always fetch fresh, don't use cache
  });

  console.log("data",data)

  // const myRecord = data?.team_members?.[0];
  // const team = myRecord?.team;
  // const members: TeamMember[] = team?.team_members ?? [];
  const myRecord = data?.team_members?.[0];
// Hasura is returning team as an array (misconfigured as array relationship)
// so we handle both cases defensively
// const team: Team | null = Array.isArray(myRecord?.team)
//   ? myRecord.team[0] ?? null
//   : myRecord?.team ?? null;


  const rawTeam = Array.isArray(myRecord?.team)
  ? myRecord.team[0] ?? null
  : myRecord?.team ?? null;

  const team: Team | null = rawTeam
  ? {
      ...rawTeam,
      team_members: Array.isArray(rawTeam.team_members)
        ? rawTeam.team_members
        : rawTeam.team_members
        ? [rawTeam.team_members]  // fallback if still object
        : [],
    }
  : null;

  console.log("team object:", JSON.stringify(team, null, 2));
// const members: TeamMember[] = Array.isArray(team?.team_members)
//   ? team.team_members
//   : [];

const members: TeamMember[] = team?.team_members ?? [];
  console.log("myRecord",myRecord)
  console.log("team",team)
  console.log("members",members)
  

  // Loading state
  if (loading || !userId) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
          Loading team data…
        </p>
      </main>
    );
  }

  // Error state — show full error message to help debug
  if (error) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">
            GraphQL Error
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#929292]">
            {error.message}
          </p>
        </div>
      </main>
    );
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
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
          My Team
        </p>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
        {!team ? (
          <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8 text-center">
            <p className="font-sans text-[20px] uppercase tracking-[0.04em] text-white">
              No Team Found
            </p>
            <p className="mt-2 text-[13px] text-[#929292]">
              You are not currently assigned to any team.
            </p>
            {/* Debug info — remove once working */}
            <p className="mt-4 font-mono text-[10px] text-[#5b5b5b]">
              user_id: {userId} | team_members returned:{" "}
              {data?.team_members?.length ?? 0}
            </p>
          </div>
        ) : (
          <>
            {/* Team Header */}
            <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                TEAM PROFILE
              </p>
              <h1 className="mt-2 font-sans text-[32px] uppercase tracking-[0.04em] text-white">
                {team.name}
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Created{" "}
                {new Date(team.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Members List */}
            <div className="border border-[#2e2e2e] bg-[#171717]">
              <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
                  Team Members
                </h2>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                  <Users size={14} />
                  <span>{members.length} Members</span>
                </div>
              </div>

              <div className="divide-y divide-[#2e2e2e]">
                {members.map((member) => {
                  const isLeader = member.user?.id === team.created_by;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-5"
                    >
                      <div className="flex items-center gap-4">
                        {member.user?.profile_picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getImageUrl(member.user.profile_picture)}
                            alt=""
                            className="h-12 w-12 border border-[#2e2e2e] object-cover"
                          />
                        ) : (
                          <div className="grid h-12 w-12 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[14px] uppercase tracking-[0.08em] text-[#ff6a6a]">
                            {getInitials(member.user?.name)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-sans text-[18px] uppercase tracking-[0.04em] text-white">
                              {member.user?.name || "Unknown User"}
                            </p>
                            {isLeader && (
                              <Crown
                                size={14}
                                className="text-[#DEF767]"
                                aria-label="Team Leader"
                              />
                            )}
                          </div>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                            {isLeader ? "LEADER" : member.member_type || "MEMBER"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
