export const PENDING_ROOM_CODE_KEY = 'uxathon-pending-room-code'

export function normalizeRoomCode(code: string) {
  return code.toUpperCase().trim()
}

export function getRoomCodeFromPath(path: string) {
  const match = path.match(/^\/room\/([A-Z0-9]{6})/i)
  return match?.[1]?.toUpperCase() || null
}

export function rememberPendingRoom(code: string) {
  if (typeof window === 'undefined') return

  const normalizedCode = normalizeRoomCode(code)
  localStorage.setItem(PENDING_ROOM_CODE_KEY, normalizedCode)
}

export function clearPendingRoom() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_ROOM_CODE_KEY)
}

export function getSafeRedirectFromUrl(defaultPath = '/dashboard') {
  if (typeof window === 'undefined') return defaultPath

  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')

  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }

  const pendingRoomCode = localStorage.getItem(PENDING_ROOM_CODE_KEY)
  if (pendingRoomCode) {
    return `/room/${pendingRoomCode}`
  }

  return defaultPath
}

export async function autoJoinRoomFromRedirect(redirectPath: string) {
  if (typeof window === 'undefined') return null

  const code = getRoomCodeFromPath(redirectPath)
  if (!code) return null

  const token = localStorage.getItem('jwt-token')
  if (!token) return null

  const res = await fetch('/api/multiplayer/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Could not join room from invite link.')
  }

  localStorage.setItem('active-room-code', code)
  clearPendingRoom()

  return code
}

export function getRoomInviteUrl(code: string) {
  if (typeof window === 'undefined') return `/room/${normalizeRoomCode(code)}`
  return `${window.location.origin}/room/${normalizeRoomCode(code)}`
}

export function getWhatsAppInviteMessage(code: string) {
  const inviteUrl = getRoomInviteUrl(code)

  return [
    `Join my UXathon room.`,
    ``,
    `Room code: ${normalizeRoomCode(code)}`,
    `Link: ${inviteUrl}`,
    ``,
    `Open the link, login or register if needed, and you will be added to the room automatically.`,
  ].join('\n')
}
