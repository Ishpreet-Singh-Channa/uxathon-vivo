// "use client";
// import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
// import { ApolloProvider } from "@apollo/client/react";
// import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
// import { createClient } from "graphql-ws";
// import { getMainDefinition } from "@apollo/client/utilities";

// // Normal Query, mutation link
// const httpLink = new HttpLink({
//     // uri: "http://localhost:8100/v1/graphql",
//     uri: "https://hasura.ubuntudevt65535.dpdns.org/v1/graphql", 
//     fetch: async (uri, options) => {
//         const token = localStorage.getItem("jwt-token");
//         console.log("Token in fetch:", token);
//         const headers = { ...(options?.headers || {}), Authorization: token ? `Bearer ${token}` : "" };
//         return fetch(uri, { ...options, headers });
//     },
// });

// // WebSocket link for subscriptions
// const wsLink = new GraphQLWsLink(
//     createClient({
//         url: "wss://hasura.ubuntudevt65535.dpdns.org/v1/graphql",
//         connectionParams: async () => {
//             const token = localStorage.getItem("jwt-token");
//             if (!token) window.location.href = "/login";
//             return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
//         },
//     }),
// );

// const link = ApolloLink.split(
//     ({ query }) => {
//         const definition = getMainDefinition(query);
//         return definition.kind === "OperationDefinition" && definition.operation === "subscription";
//     },
//     wsLink,
//     httpLink,
// );

// export const client = new ApolloClient({
//     link,
//     cache: new InMemoryCache(),
// });

// export function ApolloWrapper({ children }: { children: React.ReactNode }) {
//     return <ApolloProvider client={client}>{children}</ApolloProvider>;
// }

"use client";

import React from "react";
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

const httpUri =
  process.env.NEXT_PUBLIC_HASURA_HTTP_URL ||
  "https://hasura.ubuntudevt65535.dpdns.org/v1/graphql";

const wsUri =
  process.env.NEXT_PUBLIC_HASURA_WS_URL ||
  "wss://hasura.ubuntudevt65535.dpdns.org/v1/graphql";

// Normal query/mutation link
const httpLink = new HttpLink({
  uri: httpUri,
  fetch: async (uri, options) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("jwt-token") : null;

    const headers = {
      ...(options?.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
    };

    return fetch(uri, {
      ...options,
      headers,
    });
  },
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUri,
    connectionParams: async () => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("jwt-token") : null;

      if (!token && typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      };
    },
  })
);

const link = ApolloLink.split(
  ({ query }) => {
    const definition = getMainDefinition(query);

    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
