import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string        // our DB UUID, not the provider's ID
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    dbUserId?: string   // stored in the encrypted session cookie
  }
}
