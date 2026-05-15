// "use client";
// import { gql } from "@apollo/client";
// import { useMutation, useSubscription } from "@apollo/client/react";
// import { useState } from "react";

// const CHAT_SUBSCRIPTION = gql`
//     subscription MySubscription($sessionId: uuid!) {
//         live_chat(order_by: { created_at: desc }, where: { session_id: { _eq: $sessionId } }) {
//             user {
//                 name
//                 profile_picture
//             }
//             message
//         }
//     }
// `;

// const GET_ACTIVE_SESSION = gql`
//     subscription GetActiveSession {
//         live_sessions(order_by: { started_at: desc }, where: { active: { _eq: true } }) {
//             id
//             started_at
//         }
//     }
// `;

// const MUTATION_ADD_MESSAGE = gql`
//     mutation AddMessage($sessionId: uuid!, $message: String!) {
//         insert_live_chat_one(object: { session_id: $sessionId, message: $message }) {
//             message
//         }
//     }
// `;

// export default function LivePage() {
//     const { data: sessionData, loading: sessionLoading, error: sessionError } = useSubscription<{ live_sessions: { id: string; started_at: string }[] }>(GET_ACTIVE_SESSION);
//     const { data, loading, error } = useSubscription<{ live_chat: { user: { name: string; profile_picture: string }; message: string }[] }>(CHAT_SUBSCRIPTION, { skip: !sessionData || sessionData.live_sessions.length === 0, variables: { sessionId: sessionData?.live_sessions[0]?.id } });
//     const [addMessage, { loading: addMessageLoading, error: addMessageError }] = useMutation(MUTATION_ADD_MESSAGE);

//     return (
//         <div>
//             <h1>Live page</h1>
//             <div>
//                 {sessionLoading && <p>Loading session...</p>}
//                 {sessionError && <p>Error: {sessionError.message}</p>}
//                 {sessionData && sessionData.live_sessions.length === 0 && <p>No active sessions</p>}
//                 {sessionData && sessionData.live_sessions.length > 0 && <p>Active session: {sessionData.live_sessions[0].id}</p>}
//                 {sessionData && sessionData.live_sessions.length > 0 && loading && <p>Loading Messages...</p>}
//                 {sessionData && sessionData.live_sessions.length > 0 && error && <p>Error: {error.message}</p>}
//                 {sessionData && sessionData.live_sessions.length > 0 && data && (
//                     <div>
//                         {data.live_chat
//                             .slice()
//                             .reverse()
//                             .map((chat: { user: { name: string; profile_picture: string }; message: string }, index: number) => (
//                                 <div key={index}>
//                                     <p>
//                                         <strong>{chat.user.name}:</strong> {chat.message}
//                                     </p>
//                                 </div>
//                             ))}
//                         <input id="messageInput" type="text" placeholder="Type your message..." className="border p-2 w-full" />
//                         <button
//                             className="bg-blue-500 text-white px-4 py-2 mt-2"
//                             onClick={() => {
//                                 const messageInput = document.getElementById("messageInput") as HTMLInputElement;
//                                 if (!messageInput) return;
//                                 const message = messageInput.value.trim();
//                                 if (message === "") return;
//                                 addMessage({ variables: { sessionId: sessionData?.live_sessions[0].id, message } })
//                                     .then(() => (messageInput.value = ""))
//                                     .catch((err) => console.error("Error adding message:", err));
//                             }}
//                         >
//                             Send
//                         </button>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }


'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useSubscription } from '@apollo/client/react';
import { ArrowLeft, ArrowUp, Plus, Send, Users } from 'lucide-react';

const CHAT_SUBSCRIPTION = gql`
  subscription MySubscription($sessionId: uuid!) {
    live_chat(
      order_by: { created_at: desc }
      where: { session_id: { _eq: $sessionId } }
    ) {
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
    live_sessions(
      order_by: { started_at: desc }
      where: { active: { _eq: true } }
      limit: 1
    ) {
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

type AddMessageVariables = {
  sessionId: string;
  message: string;
};

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return 'UX';

  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function normalizeMessages(items?: ChatItem[]) {
  return items?.slice().reverse() ?? [];
}

export default function LivePage() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    data: sessionData,
    loading: sessionLoading,
    error: sessionError,
  } = useSubscription<ActiveSessionData>(GET_ACTIVE_SESSION);

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

  const [addMessage, { loading: addMessageLoading, error: addMessageError }] = useMutation<unknown, AddMessageVariables>(MUTATION_ADD_MESSAGE);

  const messages = useMemo(() => normalizeMessages(data?.live_chat), [data?.live_chat]);
  const visibleUserCount = useMemo(() => Math.max(1, messages.length), [messages.length]);

  const errorMessage = sessionError?.message || messagesError?.message || addMessageError?.message || null;

  const statusText = sessionLoading
    ? 'loading session'
    : errorMessage
      ? 'error'
      : !activeSessionId
        ? 'no active session'
        : messagesLoading
          ? 'loading messages'
          : 'live';

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message || !activeSessionId || addMessageLoading) return;

    await addMessage({ variables: { sessionId: activeSessionId, message } });
    setInput('');
  }

  function scrollToLatest() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  return (
    <main className="h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="pointer-events-none fixed left-4 top-4 z-30 h-5 w-5 border-l border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed right-4 top-4 z-30 h-5 w-5 border-r border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-4 left-4 z-30 h-5 w-5 border-b border-l border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-4 right-4 z-30 h-5 w-5 border-b border-r border-[#5b5b5b]" />

      <div className="pointer-events-none fixed left-1/2 top-[-140px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-25 blur-3xl" />

      <section className="relative z-10 mx-auto grid h-screen w-full max-w-5xl grid-rows-[1fr] px-5 py-5 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
        <div className="grid min-h-0 grid-rows-[auto_1fr_auto] lg:max-w-[75%]">
          <header className="relative z-20 border-b border-[#2e2e2e] bg-[#181818]/95 pb-4 pt-2">
            <nav className="flex items-center justify-between gap-4">
              <a
                href="/dashboard"
                className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
              >
                <ArrowLeft size={15} />
                Dashboard
              </a>

              <div className="flex items-center gap-3">
                <div className="hidden h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:flex">
                  <Users size={15} />
                  {visibleUserCount} Users
                </div>

                <button
                  type="button"
                  onClick={scrollToLatest}
                  className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]"
                  aria-label="Scroll to latest message"
                >
                  <ArrowUp className="rotate-180" size={17} />
                </button>
              </div>
            </nav>

            <div className="mt-7 flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LIVE CHAT / EVENT ROOM</p>
                <h1 className="mt-3 font-serif text-[36px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[48px]">
                  Signal Room
                </h1>
              </div>

              <div className="hidden text-right font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:block">
                <p>feed / public</p>
                <p>state / {statusText}</p>
              </div>
            </div>

            {activeSessionId && (
              <div className="mt-4 truncate border border-[#2e2e2e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Active session → {activeSessionId}
              </div>
            )}
          </header>

          <div className="relative min-h-0 overflow-hidden border-x border-[#2e2e2e] bg-[#171717]/70">
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-20 bg-gradient-to-b from-[#181818] via-[#181818]/75 to-transparent backdrop-blur-[2px]" />

            <div ref={scrollRef} className="h-full overflow-y-auto px-0 pb-6 pt-10 scrollbar-thin scrollbar-track-[#171717] scrollbar-thumb-[#2e2e2e]">
              {sessionLoading && <SystemMessage title="Loading session" body="Checking for the latest active live session." />}
              {errorMessage && <SystemMessage title="Connection error" body={errorMessage} tone="error" />}
              {!sessionLoading && !errorMessage && !activeSessionId && <SystemMessage title="No active session" body="Create or activate a live session before messages can appear." />}
              {activeSessionId && messagesLoading && <SystemMessage title="Loading messages" body="Reading live chat feed." />}
              {activeSessionId && !messagesLoading && messages.length === 0 && <SystemMessage title="No messages yet" body="Send the first message to start the room signal." />}

              {messages.map((chat, index) => {
                const name = chat.user?.name || 'Unknown User';
                const profilePicture = chat.user?.profile_picture || '';

                return (
                  <article
                    key={`${index}-${name}-${chat.message}`}
                    className="grid animate-[fadeInUp_260ms_ease-out] grid-cols-[48px_1fr] gap-3 border-b border-[#2e2e2e] px-4 py-4 sm:grid-cols-[56px_1fr] sm:px-5"
                  >
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt={`${name} avatar`}
                        className="h-10 w-10 border border-[#2e2e2e] object-cover sm:h-11 sm:w-11"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.08em] text-[#ff6a6a] sm:h-11 sm:w-11">
                        {getInitials(name)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-serif text-[16px] uppercase tracking-[0.04em] text-white">{name}</h2>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">participant</p>
                        </div>

                        {index === messages.length - 1 && (
                          <span className="shrink-0 border border-[rgba(222,247,103,0.5)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">
                            Latest
                          </span>
                        )}
                      </div>

                      <p className="mt-3 break-words text-[13px] leading-6 text-[#929292]">{chat.message}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <form onSubmit={sendMessage} className="relative z-20 border-t border-[#2e2e2e] bg-[#181818] pt-4">
            <div className="flex min-h-[58px] border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={activeSessionId ? 'Type message to everyone' : 'No active session'}
                disabled={!activeSessionId || addMessageLoading}
                className="h-[58px] min-w-0 flex-1 bg-transparent px-4 text-[13px] leading-6 text-white outline-none placeholder:text-[#5b5b5b] disabled:cursor-not-allowed disabled:text-[#5b5b5b]"
                maxLength={500}
              />

              <button
                type="submit"
                disabled={!activeSessionId || addMessageLoading || input.trim().length === 0}
                className="grid w-14 place-items-center border-l border-[#2e2e2e] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              <span>{addMessageLoading ? 'sending' : 'public channel'}</span>
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
      `}</style>
    </main>
  );
}

function SystemMessage({ title, body, tone = 'muted' }: { title: string; body: string; tone?: 'muted' | 'error' }) {
  return (
    <div className="border-b border-[#2e2e2e] px-4 py-5 sm:px-5">
      <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone === 'error' ? 'text-[#ff6a6a]' : 'text-[#5b5b5b]'}`}>{title}</p>
      <p className="mt-2 text-[13px] leading-6 text-[#929292]">{body}</p>
    </div>
  );
}
