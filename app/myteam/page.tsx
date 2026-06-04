

// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { ArrowLeft, Users, Crown } from "lucide-react";
// import { gql } from "@apollo/client";
// import { useQuery } from "@apollo/client/react";
// import { useAuth } from "@/context/token-context";

// // const GET_MY_TEAM = gql`
// //   query GetMyTeam($userId: uuid!) {
// //     team_members(where: { user_id: { _eq: $userId } }) {
// //       id
// //       member_type
// //       team {
// //         id
// //         name
// //         created_at
// //         created_by
// //         team_members {
// //           id
// //           member_type
// //           user {
// //             id
// //             name
// //             profile_picture
// //           }
// //         }
// //       }
// //     }
// //   }
// // `;

// const GET_MY_TEAM = gql`
//   query GetMyTeam($userId: uuid!) {
//       team (where: { user_id: { _eq: $userId } }){
//         id
//         name
//         created_at
//         created_by
//         leader_id
//         room_id
//         domain_id
//         domain_name
//         domain_description
//         persona_id
//         persona_name
//         persona_hex
//         team_members {
//           id
//           member_type
//           user {
//             id
//             name
//             profile_picture
//           }
//         }
//       }
//   }
// `;

// function getInitials(name?: string | null) {
//   if (!name || !name.trim()) return "UX";
//   return name
//     .trim()
//     .split(" ")
//     .filter(Boolean)
//     .slice(0, 2)
//     .map((p) => p[0])
//     .join("")
//     .toUpperCase();
// }

// function getImageUrl(imagePath?: string | null) {
//   if (!imagePath) return "";
//   if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
//     return imagePath;
//   }
//   const backendUrl =
//     process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
//   return `${backendUrl}/uploads/${imagePath}`;
// }

// type TeamMember = {
//   id: string;
//   member_type: string;
//   user?: {
//     id: string;
//     name: string;
//     profile_picture: string;
//   };
// };

// type Team = {
//   id: string;
//   name: string;
//   created_at: string;
//   created_by: string;
//   leader_id?: string | null;
//   room_id?: string | null;
//   domain_id?: string | null;
//   domain_name?: string | null;
//   domain_description?: string | null;
//   persona_id?: string | null;
//   persona_name?: string | null;
//   persona_hex?: string | null;
//   team_members: TeamMember[];
// };

// export default function MyTeamPage() {
//   const auth = useAuth();
//   const authData = auth?.getData() as { id?: string };
//   const userId = authData?.id;

//   const [isDropping, setIsDropping] = useState(false);
//   const [dropError, setDropError] = useState("");
//   const hasUserId = Boolean(userId);
//   const { data, loading, error, refetch } = useQuery<{
//     team_members: { id: string; member_type: string; team: Team }[];
//   }>(GET_MY_TEAM, {
//     variables: { userId },
//     skip: !userId,
//     fetchPolicy: "network-only", // <-- always fetch fresh, don't use cache
//   });

//   console.log("data",data)

//   async function dropPersona() {
//     if (!team?.id) return;

//     const confirmed = window.confirm(
//       `Drop ${team.persona_name || team.name}? This will make the persona available again.`
//     );

//     if (!confirmed) return;

//     setIsDropping(true);
//     setDropError("");

//     try {
//       const token = auth.getJwt();

//       const res = await fetch("/api/persona-flow/drop", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: token ? `Bearer ${token}` : "",
//         },
//         body: JSON.stringify({
//           teamId: team.id,
//         }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.error || "Failed to drop persona");
//       }

//       await refetch();
//     } catch (err: any) {
//       console.error("Drop persona failed:", err);
//       setDropError(err.message || "Failed to drop persona");
//     } finally {
//       setIsDropping(false);
//     }
//   }

  

//   // const myRecord = data?.team_members?.[0];
//   // const team = myRecord?.team;
//   // const members: TeamMember[] = team?.team_members ?? [];
//   const myRecord = data?.team_members?.[0];
// // Hasura is returning team as an array (misconfigured as array relationship)
// // so we handle both cases defensively
// // const team: Team | null = Array.isArray(myRecord?.team)
// //   ? myRecord.team[0] ?? null
// //   : myRecord?.team ?? null;


//   const rawTeam = Array.isArray(myRecord?.team)
//   ? myRecord.team[0] ?? null
//   : myRecord?.team ?? null;

//   const team: Team | null = rawTeam
//   ? {
//       ...rawTeam,
//       team_members: Array.isArray(rawTeam.team_members)
//         ? rawTeam.team_members
//         : rawTeam.team_members
//         ? [rawTeam.team_members]  // fallback if still object
//         : [],
//     }
//   : null;

//   console.log("team object:", JSON.stringify(team, null, 2));
// // const members: TeamMember[] = Array.isArray(team?.team_members)
// //   ? team.team_members
// //   : [];

// const members: TeamMember[] = team?.team_members ?? [];
//   console.log("myRecord",myRecord)
//   console.log("team",team)
//   console.log("members",members)
  

//   // Loading state
//   if (loading || !userId) {
//     return (
//       <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
//         <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//           Loading team data…
//         </p>
//       </main>
//     );
//   }

//   // Error state — show full error message to help debug
//   if (error) {
//     return (
//       <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
//         <div className="text-center">
//           <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">
//             GraphQL Error
//           </p>
//           <p className="mt-2 font-mono text-[11px] text-[#929292]">
//             {error.message}
//           </p>
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
//       <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

//       <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
//         <Link
//           href="/dashboard"
//           className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
//         >
//           <ArrowLeft size={14} aria-hidden />
//           Dashboard
//         </Link>
//         <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//           My Team
//         </p>
//       </header>

//       <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
        
//         {team?.room_id && team?.persona_id && (
//           <div className="mt-6 border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 p-4">
//             <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ff6a6a]">
//               Persona Assignment
//             </p>

//             <p className="mt-2 font-sans text-xl uppercase tracking-[0.04em] text-white">
//               {team.persona_name || team.name}
//             </p>

//             {team.domain_name && (
//               <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]">
//                 Domain: {team.domain_name}
//               </p>
//             )}

//             {team.persona_hex && (
//               <div className="mt-3 flex items-center gap-2">
//                 <span
//                   className="h-3 w-3 rounded-full border border-white/20"
//                   style={{ backgroundColor: team.persona_hex }}
//                 />
//                 <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//                   {team.persona_hex}
//                 </span>
//               </div>
//             )}

//             <button
//               type="button"
//               onClick={dropPersona}
//               disabled={isDropping}
//               className="mt-4 w-full border border-[#ff6a6a]/60 bg-transparent px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a] disabled:opacity-40"
//             >
//               {isDropping ? "Dropping Persona..." : "Drop Persona"}
//             </button>

//             {dropError && (
//               <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#ff6a6a]">
//                 {dropError}
//               </p>
//             )}
//           </div>
//         )}
        
//         {!team ? (
//           <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8 text-center">
//             <p className="font-sans text-[20px] uppercase tracking-[0.04em] text-white">
//               No Team Found
//             </p>
//             <p className="mt-2 text-[13px] text-[#929292]">
//               You are not currently assigned to any team.
//             </p>
//             {/* Debug info — remove once working */}
//             <p className="mt-4 font-mono text-[10px] text-[#5b5b5b]">
//               user_id: {userId} | team_members returned:{" "}
//               {data?.team_members?.length ?? 0}
//             </p>
//           </div>
//         ) : (
//           <>
//             {/* Team Header */}
//             <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8">
//               <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
//                 TEAM PROFILE
//               </p>
//               <h1 className="mt-2 font-sans text-[32px] uppercase tracking-[0.04em] text-white">
//                 {team.name}
//               </h1>
//               <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//                 Created{" "}
//                 {new Date(team.created_at).toLocaleDateString("en-US", {
//                   month: "short",
//                   day: "numeric",
//                   year: "numeric",
//                 })}
//               </p>
//             </div>

//             {/* Members List */}
//             <div className="border border-[#2e2e2e] bg-[#171717]">
//               <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
//                 <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
//                   Team Members
//                 </h2>
//                 <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//                   <Users size={14} />
//                   <span>{members.length} Members</span>
//                 </div>
//               </div>

//               <div className="divide-y divide-[#2e2e2e]">
//                 {members.map((member) => {
//                   const isLeader = member.user?.id === team.created_by;
//                   return (
//                     <div
//                       key={member.id}
//                       className="flex items-center justify-between px-6 py-5"
//                     >
//                       <div className="flex items-center gap-4">
//                         {member.user?.profile_picture ? (
//                           // eslint-disable-next-line @next/next/no-img-element
//                           <img
//                             src={getImageUrl(member.user.profile_picture)}
//                             alt=""
//                             className="h-12 w-12 border border-[#2e2e2e] object-cover"
//                           />
//                         ) : (
//                           <div className="grid h-12 w-12 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[14px] uppercase tracking-[0.08em] text-[#ff6a6a]">
//                             {getInitials(member.user?.name)}
//                           </div>
//                         )}
//                         <div>
//                           <div className="flex items-center gap-2">
//                             <p className="font-sans text-[18px] uppercase tracking-[0.04em] text-white">
//                               {member.user?.name || "Unknown User"}
//                             </p>
//                             {isLeader && (
//                               <Crown
//                                 size={14}
//                                 className="text-[#DEF767]"
//                                 aria-label="Team Leader"
//                               />
//                             )}
//                           </div>
//                           <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//                             {isLeader ? "LEADER" : member.member_type || "MEMBER"}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </>
//         )}
//       </section>
//     </main>
//   );
// }


"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [dropError, setDropError] = useState("");

  useEffect(() => {
    const authData = auth?.getData?.() as { id?: string } | null;
    const idFromAuthData = authData?.id ?? null;
    const idFromJwt = getUserIdFromJwt(auth?.getJwt?.() ?? null);

    setUserId(idFromAuthData || idFromJwt);
  }, [auth]);

  const hasUserId = Boolean(userId);

  const { data, loading, error, refetch } = useQuery<{
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

  async function dropPersona() {
    if (!team?.id) return;

    const confirmed = window.confirm(
      `Drop ${team.persona_name || team.name}? This will make the persona available again.`
    );

    if (!confirmed) return;

    setIsDropping(true);
    setDropError("");

    try {
      const token = auth.getJwt();

      const res = await fetch("/api/persona-flow/drop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          teamId: team.id,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const responseData = contentType.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to drop persona");
      }

      await refetch();
    } catch (err: any) {
      console.error("Drop persona failed:", err);
      setDropError(err.message || "Failed to drop persona");
    } finally {
      setIsDropping(false);
    }
  }

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

                {team.room_id && team.persona_id && (
                  <button
                    type="button"
                    onClick={dropPersona}
                    disabled={isDropping}
                    className="shrink-0 border border-[#ff6a6a]/60 bg-[#181818] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#ff6a6a] transition-colors hover:bg-[#ff6a6a] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isDropping ? "Dropping..." : "Drop Persona"}
                  </button>
                )}
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

                  {dropError && (
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#ff6a6a]">
                      {dropError}
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
    </main>
  );
}
