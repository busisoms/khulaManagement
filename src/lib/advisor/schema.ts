import { z } from "zod";
import { ActionType, Area } from "@/types";

/** The shape every recommendation must have — from the LLM or from the rules. */
export const AdviceSchema = z.object({
  area: Area,
  finding: z.string().min(1).max(400),
  evidence: z.array(z.object({ label: z.string().min(1), value: z.union([z.number(), z.string()]) })).min(1).max(6),
  actionType: ActionType,
  actionTitle: z.string().min(1).max(80),
  draftText: z.string().max(600),
  why: z.string().min(1).max(300),
  estimatedCostCents: z.number().int().min(0),
});

export type Advice = z.infer<typeof AdviceSchema>;
