import { Avatar } from "@/components/ui/avatar";
import { ConfirmAction } from "@/components/ui/confirm-action";
import type { TripMember } from "@/server/members/member";
import { removeMemberAction } from "../actions";

interface MemberListProps {
  tripId: string;
  members: TripMember[];
  currentUserId: string;
  canRemove: boolean;
}

export function MemberList({ tripId, members, currentUserId, canRemove }: MemberListProps) {
  return (
    <ul className="divide-y divide-slate-100">
      {members.map((member) => (
        <li key={member.userId} className="flex flex-wrap items-center gap-3 py-3">
          <Avatar name={member.user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {member.user.name}
              {member.userId === currentUserId && <span className="text-slate-500"> (vos)</span>}
            </p>
            <p className="truncate text-xs text-slate-500">{member.user.email}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {member.role === "OWNER" ? "Organiza" : "Colabora"}
          </span>
          {canRemove && member.role !== "OWNER" && (
            <ConfirmAction
              action={removeMemberAction.bind(null, tripId, member.userId)}
              label="Quitar"
              confirmLabel="Sí, quitar"
              question={`¿Quitar a ${member.user.name}?`}
              variant="ghost"
              size="sm"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
