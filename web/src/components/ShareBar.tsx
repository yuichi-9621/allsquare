import { useState } from "react"
import { QrCode } from "./QrCode"

export function ShareBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-label="Share">
      <button type="button" onClick={copy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
      <QrCode value={url} />
    </section>
  )
}
