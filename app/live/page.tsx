"use client";
import { gql } from "@apollo/client";
import { useMutation, useSubscription } from "@apollo/client/react";
import { useState } from "react";

const CHAT_SUBSCRIPTION = gql`
    subscription MySubscription($sessionId: uuid!) {
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
        live_sessions(order_by: { started_at: desc }, where: { active: { _eq: true } }) {
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

export default function LivePage() {
    const { data: sessionData, loading: sessionLoading, error: sessionError } = useSubscription<{ live_sessions: { id: string; started_at: string }[] }>(GET_ACTIVE_SESSION);
    const { data, loading, error } = useSubscription<{ live_chat: { user: { name: string; profile_picture: string }; message: string }[] }>(CHAT_SUBSCRIPTION, { skip: !sessionData || sessionData.live_sessions.length === 0, variables: { sessionId: sessionData?.live_sessions[0]?.id } });
    const [addMessage, { loading: addMessageLoading, error: addMessageError }] = useMutation(MUTATION_ADD_MESSAGE);

    return (
        <div>
            <h1>Live page</h1>
            <div>
                {sessionLoading && <p>Loading session...</p>}
                {sessionError && <p>Error: {sessionError.message}</p>}
                {sessionData && sessionData.live_sessions.length === 0 && <p>No active sessions</p>}
                {sessionData && sessionData.live_sessions.length > 0 && <p>Active session: {sessionData.live_sessions[0].id}</p>}
                {sessionData && sessionData.live_sessions.length > 0 && loading && <p>Loading Messages...</p>}
                {sessionData && sessionData.live_sessions.length > 0 && error && <p>Error: {error.message}</p>}
                {sessionData && sessionData.live_sessions.length > 0 && data && (
                    <div>
                        {data.live_chat
                            .slice()
                            .reverse()
                            .map((chat: { user: { name: string; profile_picture: string }; message: string }, index: number) => (
                                <div key={index}>
                                    <p>
                                        <strong>{chat.user.name}:</strong> {chat.message}
                                    </p>
                                </div>
                            ))}
                        <input id="messageInput" type="text" placeholder="Type your message..." className="border p-2 w-full" />
                        <button
                            className="bg-blue-500 text-white px-4 py-2 mt-2"
                            onClick={() => {
                                const messageInput = document.getElementById("messageInput") as HTMLInputElement;
                                if (!messageInput) return;
                                const message = messageInput.value.trim();
                                if (message === "") return;
                                addMessage({ variables: { sessionId: sessionData?.live_sessions[0].id, message } })
                                    .then(() => (messageInput.value = ""))
                                    .catch((err) => console.error("Error adding message:", err));
                            }}
                        >
                            Send
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
