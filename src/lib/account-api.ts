export interface AccountRoomHistory {
  id: number;
  roomCode: string;
  companyName: string;
  displayName: string;
  avatarColor: string;
  avatarEmoji: string | null;
  role: 'admin' | 'coadmin' | 'manager' | 'employee';
  joinedAt: string;
  lastVisitedAt: string;
  leftAt: string | null;
}

export async function loadAccountProfile(): Promise<{ account: { id: string; name: string | null; email: string }; rooms: AccountRoomHistory[] }> {
  const response = await fetch('/api/account', { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load account profile');
  return response.json();
}

export async function saveRoomMembership(input: { roomCode: string; companyName: string; displayName: string; avatarColor: string; avatarEmoji?: string; role: string }) {
  const response = await fetch('/api/account', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'upsert-membership', ...input }),
  });
  if (!response.ok) throw new Error('Unable to save room membership');
}

export async function leaveRoomMembership(roomCode: string) {
  const response = await fetch('/api/account', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'leave-room', roomCode }),
  });
  if (!response.ok) throw new Error('Unable to leave room');
}
