import { Button } from "@allsquare/ui"
import { useState } from "react"
import { useT } from "../lib/i18n"
import { paymentTarget } from "../lib/paymentLink"
import type { Member, Transfer } from "../lib/types"
import { MemberAvatar } from "./MemberAvatar"
import { MoneyAmount } from "./MoneyAmount"

// One "who pays who" line with Pay + Mark paid actions. Recording semantics
// live in the parent (GroupPage); Pay opens the payee's saved payment
// destination (or copies it when it isn't a link).
export function SettleRow({
  transfer,
  members,
  baseCurrency,
  note = "Allsquare",
  onMarkPaid,
}: {
  transfer: Transfer
  members: Member[]
  baseCurrency: string
  note?: string | undefined
  onMarkPaid: (transfer: Transfer) => Promise<void>
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  const from = nameOf.get(transfer.from) ?? "?"
  const to = nameOf.get(transfer.to) ?? "?"

  const handle = members.find((m) => m.id === transfer.to)?.paymentHandle
  const target = handle ? paymentTarget(handle, transfer.amountMinor, baseCurrency, note) : null

  const markPaid = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await onMarkPaid(transfer)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const copyTarget = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <MemberAvatar members={members} memberId={transfer.from} />
          {from} → <MemberAvatar members={members} memberId={transfer.to} />
          {to}
        </span>
        <div className="flex shrink-0 items-center gap-2.5">
          <MoneyAmount
            amountMinor={transfer.amountMinor}
            currency={baseCurrency}
            className="text-foil"
          />
          {target?.kind === "link" ? (
            <Button asChild variant="secondary" size="sm">
              <a
                href={target.href}
                target="_blank"
                rel="noreferrer"
                aria-label={t("payAria", { name: to })}
              >
                {t("pay")}
              </a>
            </Button>
          ) : null}
          {target?.kind === "copy" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={t("copyPaymentInfoAria", { name: to })}
              onClick={() => copyTarget(target.text)}
            >
              {copied ? t("copied") : t("payInfo")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={markPaid}
            aria-label={t("markPaidAria", { from, to })}
          >
            {busy ? t("saving") : t("markPaid")}
          </Button>
        </div>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("recordPaymentError")}
        </p>
      ) : null}
    </div>
  )
}
