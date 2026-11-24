"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { formValues, runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { discussionService } from "@/server/container";

export async function setVoteAction(activityId: string, voted: boolean): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await discussionService.setVote(user.id, activityId, { voted });
    refresh();
  });
}

export async function addCommentAction(
  activityId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);
  return runAction(async () => {
    await discussionService.addComment(user.id, activityId, values);
    refresh();
  }, values);
}

export async function deleteCommentAction(commentId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await discussionService.deleteComment(user.id, commentId);
    refresh();
  });
}
