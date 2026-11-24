import { z } from "zod";
import { requiredTextSchema } from "../shared/schemas";
import type { RawInput } from "../shared/validation";
import { COMMENT_MAX_LENGTH } from "./discussion";

export const voteSchema = z.object({ voted: z.boolean({ error: "Voto inválido" }) });
export const commentSchema = z.object({ body: requiredTextSchema("El comentario", COMMENT_MAX_LENGTH) });

export type VoteInput = RawInput<typeof voteSchema>;
export type CommentInput = RawInput<typeof commentSchema>;
