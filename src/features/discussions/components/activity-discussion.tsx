"use client";

import { MessageCircle, Send, ThumbsUp, Trash } from "lucide-react";
import { useActionState, useId, useOptimistic, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState, fieldError, submittedValue } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { COMMENT_MAX_LENGTH } from "@/server/discussions/discussion";
import { addCommentAction, deleteCommentAction, setVoteAction } from "../actions";
import { joinNames, type DiscussionView } from "../view";

interface ActivityDiscussionProps {
  activityId: string;
  discussion: DiscussionView;
  /** Ideas can be voted; scheduled activities only keep their conversation. */
  votable: boolean;
  /** Whether the viewer may vote and comment. */
  canDiscuss: boolean;
}

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60";

/** Footer of an activity card: "me interesa" votes and the group's comments. */
export function ActivityDiscussion({ activityId, discussion, votable, canDiscuss }: ActivityDiscussionProps) {
  const [open, setOpen] = useState(false);
  const threadId = useId();
  const count = discussion.comments.length;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {votable && <VoteButton activityId={activityId} votes={discussion.votes} disabled={!canDiscuss} />}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={threadId}
          onClick={() => setOpen((value) => !value)}
          className={cn(chip, "text-slate-600 hover:bg-slate-100 hover:text-slate-900", open && "bg-slate-100")}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {count === 0 ? "Comentar" : `${count} ${count === 1 ? "comentario" : "comentarios"}`}
        </button>
      </div>
      {open && (
        <div id={threadId} className="mt-3 space-y-3">
          {count > 0 && (
            <ul className="space-y-3">
              {discussion.comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </ul>
          )}
          {canDiscuss && (
            // Keyed by the number of comments: after sending, the refreshed
            // list remounts the form, which clears it.
            <CommentForm key={count} activityId={activityId} />
          )}
        </div>
      )}
    </div>
  );
}

function VoteButton({
  activityId,
  votes,
  disabled,
}: {
  activityId: string;
  votes: DiscussionView["votes"];
  disabled: boolean;
}) {
  // Shown at once; the server's answer (via refresh) replaces it.
  const [optimistic, setOptimistic] = useOptimistic(votes);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle() {
    const voted = !optimistic.votedByMe;
    setError(null);
    startTransition(async () => {
      setOptimistic({ ...optimistic, votedByMe: voted, count: optimistic.count + (voted ? 1 : -1) });
      const result = await setVoteAction(activityId, voted);
      if (result.status === "error") setError(result.message);
    });
  }

  const voters = joinNames(votes.voters);
  return (
    <>
      <button
        type="button"
        aria-pressed={optimistic.votedByMe}
        onClick={toggle}
        disabled={disabled}
        title={voters ? `Les interesa a ${voters}` : "Todavía nadie votó esta idea"}
        className={cn(
          chip,
          optimistic.votedByMe
            ? "bg-coral-500 text-white shadow-sm hover:bg-coral-600"
            : "bg-coral-50 text-coral-600 ring-1 ring-coral-100 ring-inset hover:bg-coral-100",
        )}
      >
        <ThumbsUp className="size-3.5" aria-hidden />
        Me interesa
        <span className={cn("tabular-nums", optimistic.votedByMe ? "text-white/90" : "text-coral-600/80")}>
          {optimistic.count}
        </span>
      </button>
      {voters && <span className="sr-only">Les interesa a {voters}.</span>}
      {error && (
        <p role="alert" className="w-full text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}

function CommentItem({ comment }: { comment: DiscussionView["comments"][number] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className={cn("flex gap-2.5", pending && "opacity-50")}>
      <Avatar name={comment.authorName} className="size-7 text-[10px]" />
      <div className="min-w-0 flex-1 rounded-xl bg-sand-100 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs">
            <span className="font-semibold text-slate-800">{comment.authorName}</span>{" "}
            <time dateTime={comment.createdAt} className="text-slate-500">
              {comment.createdAtLabel}
            </time>
          </p>
          {comment.canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteCommentAction(comment.id);
                  if (result.status === "error") setError(result.message);
                })
              }
              aria-label={`Borrar el comentario de ${comment.authorName}`}
              title="Borrar"
              className="-mr-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
            >
              <Trash className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
        <p className="text-sm break-words whitespace-pre-line text-slate-700">{comment.body}</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

function CommentForm({ activityId }: { activityId: string }) {
  const [state, action] = useActionState(addCommentAction.bind(null, activityId), idleState);
  const inputId = useId();
  const error = fieldError(state, "body") ?? (state.status === "error" ? state.message : undefined);

  return (
    <form action={action} className="space-y-1.5">
      <label htmlFor={inputId} className="sr-only">
        Escribí un comentario
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id={inputId}
          name="body"
          required
          rows={1}
          maxLength={COMMENT_MAX_LENGTH}
          defaultValue={submittedValue(state, "body")}
          placeholder="¿Qué opinan?"
          // The form only appears when someone opens the thread (or just
          // sent a comment), so moving the focus here is what they expect.
          autoFocus
          aria-invalid={!!error}
          className="min-h-10 flex-1 resize-y py-2 text-sm"
          // Cmd/Ctrl + Enter sends, Enter alone adds a new line.
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SubmitButton size="sm" className="h-10" aria-label="Enviar comentario" title="Enviar (Ctrl + Enter)">
          <Send aria-hidden />
        </SubmitButton>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
