"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/action-state";
import { createInvitationAction } from "../actions";

interface InviteLinkPanelProps {
  tripId: string;
  inviteUrl: string | null;
  expiresLabel: string | null;
}

export function InviteLinkPanel({ tripId, inviteUrl, expiresLabel }: InviteLinkPanelProps) {
  const [state, action] = useActionState(createInvitationAction.bind(null, tripId), idleState);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <FormAlert state={state} />
      {inviteUrl ? (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              aria-label="Link de invitación"
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-sand-100 px-3 font-mono text-xs text-slate-700"
            />
            <Button type="button" variant={copied ? "primary" : "secondary"} onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "¡Copiado!" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Cualquiera con este link puede sumarse al viaje. Vence el {expiresLabel}.
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Generá un link y compartilo por WhatsApp o donde quieras para sumar gente al viaje.
        </p>
      )}
      <form action={action}>
        <SubmitButton variant={inviteUrl ? "ghost" : "primary"} size="sm" pendingText="Generando…">
          {inviteUrl && <RefreshCw aria-hidden />}
          {inviteUrl ? "Generar un link nuevo (invalida el actual)" : "Generar link de invitación"}
        </SubmitButton>
      </form>
    </div>
  );
}
