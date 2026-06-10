"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Crown } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/context/token-context";
import { BottomNav } from "@/components/BottomNav";

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
        leader_id
        room_id
        domain_id
        domain_name
        domain_description
        persona_id
        persona_name
        persona_hex
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

type TeamMember = {
  id: string;
  member_type: string;
  user?: {
    id: string;
    name: string | null;
    profile_picture: string | null;
  } | null;
};

type Team = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  leader_id?: string | null;
  room_id?: string | null;
  domain_id?: string | null;
  domain_name?: string | null;
  domain_description?: string | null;
  persona_id?: string | null;
  persona_name?: string | null;
  persona_hex?: string | null;
  team_members?: TeamMember[] | TeamMember | null;
};

type TeamRecord = {
  id: string;
  member_type: string;
  team: Team | Team[] | null;
};

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

function normalizeTeam(rawTeam?: Team | Team[] | null): Team | null {
  if (!rawTeam) return null;

  const team = Array.isArray(rawTeam) ? rawTeam[0] ?? null : rawTeam;
  if (!team) return null;

  return {
    ...team,
    team_members: Array.isArray(team.team_members)
      ? team.team_members
      : team.team_members
      ? [team.team_members]
      : [],
  };
}

function getUserIdFromJwt(token: string | null) {
  if (!token) return null;

  try {
    const payload = JSON.parse(window.atob(token.split(".")[1]));

    return (
      payload.sub ||
      payload["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"] ||
      null
    );
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return null;
  }
}

export default function MyTeamPage() {
  const auth = useAuth();
  const userId = useMemo(() => {
    const authData = auth?.getData?.() as { id?: string } | null;
    const idFromAuthData = authData?.id ?? null;
    const idFromJwt = getUserIdFromJwt(auth?.getJwt?.() ?? null);

    return idFromAuthData || idFromJwt;
  }, [auth]);

  const hasUserId = Boolean(userId);

  const { data, loading, error } = useQuery<{
    team_members: TeamRecord[];
  }>(GET_MY_TEAM, {
    variables: hasUserId ? { userId } : undefined,
    skip: !hasUserId,
    fetchPolicy: "network-only",
  });

  const team = useMemo(() => {
    const records = data?.team_members ?? [];

    const personaRecord = records.find((record) => {
      const normalizedTeam = normalizeTeam(record.team);
      return Boolean(normalizedTeam?.room_id && normalizedTeam?.persona_id);
    });

    const selectedRecord = personaRecord ?? records[0];
    return normalizeTeam(selectedRecord?.team ?? null);
  }, [data]);

  const members: TeamMember[] = Array.isArray(team?.team_members)
    ? team.team_members
    : [];

  if (!hasUserId) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
          Loading user identity…
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
          Syncing team assignment…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center px-5">
        <div className="max-w-xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">
            GraphQL Error
          </p>
          <p className="mt-2 break-words font-mono text-[11px] text-[#929292]">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#181818] pb-20 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
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
            <p className="mt-4 font-mono text-[10px] text-[#5b5b5b]">
              user_id: {userId} | team_members returned: {data?.team_members?.length ?? 0}
            </p>
          </div>
        ) : (
          <>
            <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8">
              <div className="flex items-start justify-between gap-4">
                <div>
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

              </div>

              {team.room_id && team.persona_id && (
                <div className="mt-5 border-t border-[#2e2e2e] pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ff6a6a]">
                    Persona Assignment
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="font-sans text-xl uppercase tracking-[0.04em] text-white">
                      {team.persona_name || team.name}
                    </p>

                    {team.persona_hex && (
                      <span
                        className="h-3 w-3 rounded-full border border-white/20"
                        style={{ backgroundColor: team.persona_hex }}
                      />
                    )}
                  </div>

                  {team.domain_name && (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]">
                      Domain: {team.domain_name}
                    </p>
                  )}

                </div>
              )}
            </div>

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
                {members.length === 0 ? (
                  <div className="px-6 py-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                    No members found for this team.
                  </div>
                ) : (
                  members.map((member) => {
                    const isLeader =
                      member.user?.id === team.created_by ||
                      member.user?.id === team.leader_id;

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
                  })
                )}
              </div>
            </div>
          </>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
