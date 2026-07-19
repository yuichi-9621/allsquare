import { useEffect } from "react"

export const DEFAULT_META = {
  title: "Allsquare | Split group bills with no sign-up",
  description:
    "Group bill splitter with no sign-up. Share one link, add expenses in any currency, and settle with the fewest payments. A Splitwise alternative for trips, dinners, and shared houses.",
}

// Per-route document metadata. Google renders the SPA, so client-set titles
// and descriptions are what gets indexed. noindex keeps trip pages out of
// search results: their secret-slug URLs are private invitations.
export function usePageMeta({
  title,
  description,
  noindex = false,
}: {
  title: string
  description?: string
  noindex?: boolean
}) {
  useEffect(() => {
    document.title = title
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute("content", description ?? DEFAULT_META.description)
    const robots = document.querySelector('meta[name="robots"]')
    if (robots) robots.setAttribute("content", noindex ? "noindex, nofollow" : "index, follow")
  }, [title, description, noindex])
}
