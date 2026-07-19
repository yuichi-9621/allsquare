import { z } from "zod"

const currency = z.string().regex(/^[A-Z]{3}$/, "currency must be an ISO 4217 uppercase code")

export const roundingSchema = z.union([
  z.literal(1),
  z.literal(10),
  z.literal(100),
  z.literal(1000),
])

export const createGroupSchema = z.object({
  title: z.string().min(1),
  baseCurrency: currency,
  rounding: roundingSchema,
  memberNames: z.array(z.string().min(1)).min(1),
})

export const addMemberSchema = z.object({ name: z.string().min(1) })

export const groupPatchSchema = z.object({ title: z.string().min(1) })

// Free text on purpose: a Venmo handle, PayPal.Me link, $cashtag, any URL,
// or plain instructions. Empty string clears it.
export const memberPatchSchema = z.object({ paymentHandle: z.string().trim().max(200) })

const splitEqualSchema = z.object({
  kind: z.literal("equal"),
  participantIds: z.array(z.string().min(1)).min(1),
})
const splitExactSchema = z.object({
  kind: z.literal("exact"),
  shares: z
    .array(
      z.object({
        memberId: z.string().min(1),
        // safe non-negative integer — honors api-contract's assertSafeMinor duty (core does no input validation)
        amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      }),
    )
    .min(1),
})

export const CATEGORY_IDS = [
  "food",
  "drinks",
  "transport",
  "lodging",
  "activities",
  "groceries",
  "shopping",
  "other",
] as const

const itemSchema = z.object({
  name: z.string().min(1).max(120),
  amountMinor: z.number().int().positive(),
  memberIds: z.array(z.string()).min(1),
})

export const expenseBodySchema = z.object({
  kind: z.enum(["expense", "repayment"]).default("expense"),
  category: z.enum(CATEGORY_IDS).nullish(),
  items: z.array(itemSchema).min(1).max(200).nullish(),
  payerId: z.string().min(1),
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency,
  description: z.string(),
  split: z.discriminatedUnion("kind", [splitEqualSchema, splitExactSchema]),
})

export const fxQuerySchema = z.object({
  from: currency,
  to: currency,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
