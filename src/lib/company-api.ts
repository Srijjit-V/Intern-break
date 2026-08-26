export interface SharedMember {
  id: number;
  roomCode: string;
  name: string;
  color: string;
  role: 'admin' | 'coadmin' | 'manager' | 'employee';
  points: number;
  allTimePoints: number;
  carryoverPoints: number;
  accountId?: string | null;
  profile?: Record<string, unknown> | null;
}

export interface SharedRedemption {
  id: number;
  roomCode: string;
  memberName: string;
  rewardName: string;
  points: number;
  status: 'pending_fulfillment' | 'fulfilled';
  fulfilled: boolean;
  redeemedAt: string;
  fulfilledAt: string | null;
}

/** Shared headers for every authenticated company API call. */
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
} as const;

/** POST to /api/company with session cookie always included. */
async function companyPost(body: Record<string, unknown>): Promise<Response> {
  return fetch('/api/company', {
    method: 'POST',
    credentials: 'include',
    headers: AUTH_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function syncCompanyMember(input: {
  roomCode: string;
  companyName: string;
  memberName: string;
  color: string;
  role: string;
  points?: number;
  allTimePoints?: number;
  carryoverPoints?: number;
  profile?: Record<string, unknown>;
}) {
  const response = await companyPost({ action: 'sync-member', ...input });
  if (!response.ok) throw new Error('Unable to connect to company rewards');
}

export async function loadCompanyData(roomCode: string): Promise<{ members: SharedMember[]; redemptions: SharedRedemption[] }> {
  // GET requests also need credentials so the server can identify the caller.
  const response = await fetch(`/api/company?roomCode=${encodeURIComponent(roomCode)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to load company rewards');
  const data = await response.json();
  return { members: data.members, redemptions: data.redemptions };
}

export async function redeemCompanyReward(input: {
  roomCode: string;
  memberName: string;
  rewardName: string;
  points: number;
}) {
  const response = await companyPost({ action: 'redeem', ...input });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to redeem reward');
  return data;
}

export async function updateCompanyRole(input: {
  roomCode: string;
  actorName: string;
  memberName: string;
  accountId?: string;
  role: 'admin' | 'coadmin' | 'manager' | 'employee';
}) {
  const response = await companyPost({ action: 'set-role', ...input });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to update role');
  return data as { ok: true; member: SharedMember };
}

export async function fulfillCompanyRedemption(input: {
  roomCode: string;
  actorName: string;
  redemptionId: number;
}) {
  const response = await companyPost({ action: 'fulfill-redemption', ...input });
  if (!response.ok) throw new Error('Unable to mark reward as fulfilled');
}
