export const MEMBER_ROLES = ["OWNER", "EDITOR"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export interface MemberProfile {
  name: string;
  email: string;
  image: string | null;
}

export interface TripMember {
  tripId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  user: MemberProfile;
}

/**
 * Everything a member can do inside a trip. Adding a new capability (or a new
 * role) only means extending this map — services ask "can this member do X?"
 * instead of hard-coding role checks.
 */
export type TripPermission =
  "trip:view" | "trip:edit" | "trip:delete" | "activity:manage" | "expense:manage" | "member:invite" | "member:remove";

const ROLE_PERMISSIONS: Record<MemberRole, ReadonlySet<TripPermission>> = {
  OWNER: new Set<TripPermission>([
    "trip:view",
    "trip:edit",
    "trip:delete",
    "activity:manage",
    "expense:manage",
    "member:invite",
    "member:remove",
  ]),
  EDITOR: new Set<TripPermission>(["trip:view", "activity:manage", "expense:manage"]),
};

export function hasPermission(role: MemberRole, permission: TripPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
