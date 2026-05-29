import { randomUUID } from 'crypto'
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { hasuraAdminRequest } from './hasura'

async function upsertUser(email: string, name?: string | null, avatarUrl?: string | null) {
  const generatedId = randomUUID()
  const now = new Date().toISOString()
  const data = await hasuraAdminRequest<{
    insert_users_one: { id: string }
  }>(
    `mutation UpsertUser(
      $id: uuid!, 
      $email: String!, 
      $name: String, 
      $avatarUrl: String, 
      $createdAt: timestamptz!, 
      $updatedAt: timestamptz!
    ) {
      insert_users_one(
        object: { 
          id: $id, 
          email: $email, 
          name: $name, 
          profile_picture: $profile_picture, 
          created_at: $createdAt, 
          updated_at: $updatedAt 
        }
        on_conflict: {
          constraint: users_email_key
          update_columns: [name, profile_picture, updated_at]
        }
      ) { id }
    }`,
    { id: generatedId, email, name, avatarUrl, createdAt: now, updatedAt: now }
  )
  return data.insert_users_one
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
    }),
    CredentialsProvider({
      name: 'Test Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test1@example.com" },
        name: { label: "Name", type: "text", placeholder: "Gamer Pro" },
        avatar: { label: "Avatar URL (Optional)", type: "text", placeholder: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gamer" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        
        try {
          // Synchronize user with the Postgres DB immediately during authorization
          const dbUser = await upsertUser(
            credentials.email,
            credentials.name,
            credentials.avatar
          )
          return {
            id: dbUser.id, // Return the real database UUID
            email: credentials.email,
            name: credentials.name || 'Anonymous Gamer',
            image: credentials.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${credentials.name || 'Gamer'}`
          }
        } catch (err) {
          console.error('[NextAuth Credentials Auth Error]:', err)
          // Fallback to email as ID so dev login doesn't crash completely if DB is offline
          return {
            id: credentials.email,
            email: credentials.email,
            name: credentials.name || 'Anonymous Gamer',
            image: credentials.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${credentials.name || 'Gamer'}`
          }
        }
      }
    })
  ],

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'local-secret-key-32-chars-long-for-testing',

  callbacks: {
    // Runs when JWT is created or refreshed
    async jwt({ token, user, account }) {
      if (user) {
        // If user.id is already a valid UUID (which is true for our Credentials provider), use it directly.
        // Otherwise (e.g. Google OAuth), upsert the user to get their PostgreSQL UUID.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
        if (isUuid) {
          token.dbUserId = user.id
        } else if (user.email) {
          try {
            const dbUser = await upsertUser(
              user.email,
              user.name,
              user.image
            )
            token.dbUserId = dbUser.id
          } catch (err) {
            console.error('[NextAuth JWT Sync Error]:', err)
          }
        }
      }
      return token
    },

    // Runs when session is accessed (getServerSession / useSession)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.dbUserId ?? token.sub!
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
  },
}
