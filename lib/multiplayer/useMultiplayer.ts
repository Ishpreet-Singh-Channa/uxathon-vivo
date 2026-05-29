// 'use client'

// import { useEffect, useState } from 'react'
// import { useSubscription } from '@apollo/client/react'
// import { MULTIPLAYER_GAME_STATE_SUBSCRIPTION } from './graphql'
// import { MultiplayerRoom } from './types'

// // Pure JS JWT decoder to avoid client-side dependencies on heavy libraries
// function getUserIdFromLocalStorage(): string | null {
//   if (typeof window === 'undefined') return null
//   const token = localStorage.getItem('jwt-token')
//   if (!token) return null
//   try {
//     const base64Url = token.split('.')[1]
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
//     const jsonPayload = decodeURIComponent(
//       window.atob(base64)
//         .split('')
//         .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
//         .join('')
//     )
//     const decoded = JSON.parse(jsonPayload)
//     const claims = decoded?.['https://hasura.io/jwt/claims']
//     return claims?.['x-hasura-user-id'] || decoded?.sub || null
//   } catch (e) {
//     console.warn('[JWT Client Decode Warning]:', e)
//     return null
//   }
// }

// // Fetch auth token headers
// function getAuthHeaders(): Record<string, string> {
//   if (typeof window === 'undefined') return {}
//   const token = localStorage.getItem('jwt-token')
//   return token ? { Authorization: `Bearer ${token}` } : {}
// }

// export function useMultiplayer(roomCode: string) {
//   const code = roomCode.toUpperCase().trim()
//   const [userId, setUserId] = useState<string | null>(null)
  
//   // Offline fallback polling states
//   const [pollingActive, setPollingActive] = useState(false)
//   const [pollingData, setPollingData] = useState<any>(null)
//   const [pollingError, setPollingError] = useState<string | null>(null)
//   const [updating, setUpdating] = useState(false)

//   // Resolve client user ID on mount
//   useEffect(() => {
//     setUserId(getUserIdFromLocalStorage())
//   }, [])

//   // 1. GraphQL Real-time Subscription Setup
//   const { data: subData, loading: subLoading, error: subError } = useSubscription<any>(
//     MULTIPLAYER_GAME_STATE_SUBSCRIPTION,
//     {
//       variables: { code },
//       skip: pollingActive || !code,
//     }
//   )

//   // Trigger HTTP fallback polling if Hasura WS fails (offline development/fallback)
//   useEffect(() => {
//     if (subError) {
//       console.warn('[Multiplayer Sub] WS offline. Triggering HTTP fallback polling...', subError)
//       setPollingActive(true)
//     }
//   }, [subError])

//   // 2. HTTP Polling Fallback Implementation
//   useEffect(() => {
//     if (!pollingActive || !code) return

//     const fetchStatus = async () => {
//       try {
//         const res = await fetch(`/api/multiplayer/game-state?code=${code}`, {
//           headers: getAuthHeaders(),
//         })
//         if (res.ok) {
//           const data = await res.json()
//           setPollingData(data)
//           setPollingError(null)
//         } else {
//           const errData = await res.json()
//           setPollingError(errData.error || 'Failed to sync game state')
//         }
//       } catch (err) {
//         setPollingError('Database offline')
//         console.error('HTTP Polling error:', err)
//       }
//     }

//     fetchStatus()
//     const interval = setInterval(fetchStatus, 1500)
//     return () => clearInterval(interval)
//   }, [pollingActive, code])

//   // Resolve room details and game state from active source
//   const room: MultiplayerRoom | undefined = pollingActive
//     ? pollingData?.rooms?.[0]
//     : subData?.rooms?.[0]

//   const loading = pollingActive ? !pollingData && !pollingError : subLoading
//   const error = pollingError || (subError && pollingActive === false ? subError.message : null)

//   const isHost = room?.host_user_id === userId
//   const isWS = !pollingActive

//   // 3. API Action Functions
//   const startGame = async (gameId: string, initialState?: any) => {
//     try {
//       const res = await fetch('/api/multiplayer/start', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           ...getAuthHeaders(),
//         },
//         body: JSON.stringify({ code, gameId, initialState }),
//       })
//       if (!res.ok) {
//         const d = await res.json()
//         throw new Error(d.error || 'Failed to start game')
//       }
//       return true
//     } catch (err: any) {
//       console.error(err)
//       alert(err.message || 'Error starting game')
//       return false
//     }
//   }

//   const updateGameState = async (stateUpdate: any) => {
//     if (updating) return
//     setUpdating(true)
//     try {
//       const res = await fetch('/api/multiplayer/game-state', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           ...getAuthHeaders(),
//         },
//         body: JSON.stringify({ code, state: stateUpdate }),
//       })
//       if (!res.ok) {
//         const d = await res.json()
//         console.error('[State Update Sync Fail]:', d.error)
//       }
//     } catch (err) {
//       console.error('[State Update Error]:', err)
//     } finally {
//       setUpdating(false)
//     }
//   }

//   const leaveRoom = () => {
//     if (typeof window !== 'undefined') {
//       localStorage.removeItem('active-room-code')
//       window.location.href = '/'
//     }
//   }

//   return {
//     userId,
//     room,
//     gameState: room?.game_state?.state ?? null,
//     loading,
//     error,
//     isHost,
//     isWS,
//     updating,
//     startGame,
//     updateGameState,
//     leaveRoom,
//   }
// }




'use client'

import { useEffect, useState } from 'react'
import { useSubscription } from '@apollo/client/react'
import { MULTIPLAYER_GAME_STATE_SUBSCRIPTION } from './graphql'
import { MultiplayerRoom } from './types'

function getUserIdFromLocalStorage(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('jwt-token')
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)
    const claims = decoded?.['https://hasura.io/jwt/claims']
    return claims?.['x-hasura-user-id'] || decoded?.sub || null
  } catch (e) {
    return null
  }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('jwt-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function useMultiplayer(roomCodeFromUrl?: string) {
  // Read code from parameter or fallback gracefully to active tracking string
  const [activeCode, setActiveCode] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [pollingData, setPollingData] = useState<any>(null)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setUserId(getUserIdFromLocalStorage())
    const standardCode = roomCodeFromUrl || localStorage.getItem('active-room-code') || ''
    setActiveCode(standardCode.toUpperCase().trim())
  }, [roomCodeFromUrl])

  const { data: subData, loading: subLoading, error: subError } = useSubscription<any>(
    MULTIPLAYER_GAME_STATE_SUBSCRIPTION,
    {
      variables: { code: activeCode },
      skip: pollingActive || !activeCode,
    }
  )

  useEffect(() => {
    if (subError && activeCode) {
      setPollingActive(true)
    }
  }, [subError, activeCode])

  useEffect(() => {
    if (!pollingActive || !activeCode) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/multiplayer/game-state?code=${activeCode}`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setPollingData(data)
          setPollingError(null)
        }
      } catch (err) {
        setPollingError('Database pipeline disconnected')
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 1500)
    return () => clearInterval(interval)
  }, [pollingActive, activeCode])

  const room: MultiplayerRoom | undefined = pollingActive
    ? pollingData?.rooms?.[0]
    : subData?.rooms?.[0]

  const isHost = room?.host_user_id === userId

  const startGame = async (gameId: string, initialState?: any) => {
    if (!activeCode) return false
    try {
      const res = await fetch('/api/multiplayer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: activeCode, gameId, initialState }),
      })
      return res.ok
    } catch (err) {
      return false
    }
  }

  const updateGameState = async (stateUpdate: any) => {
    if (updating || !activeCode) return
    setUpdating(true)
    try {
      await fetch('/api/multiplayer/game-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: activeCode, state: stateUpdate }),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const leaveRoom = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active-room-code')
      window.location.href = '/dashboard'
    }
  }

  return {
    userId,
    room,
    gameState: room?.game_state?.state ?? null,
    loading: pollingActive ? !pollingData && !pollingError : subLoading,
    error: pollingError || (subError && !pollingActive ? subError.message : null),
    isHost,
    isWS: !pollingActive,
    activeRoomCode: activeCode,
    startGame,
    updateGameState,
    leaveRoom,
  }
}
