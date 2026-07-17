const key = (slug: string) => `allsquare:activeMember:${slug}`

export function getActiveMemberId(slug: string): string | null {
  try {
    return localStorage.getItem(key(slug))
  } catch {
    return null
  }
}

export function setActiveMemberId(slug: string, memberId: string): void {
  try {
    localStorage.setItem(key(slug), memberId)
  } catch {
    // private-mode / quota failures are non-fatal: the picker simply re-appears.
  }
}

export function clearActiveMember(slug: string): void {
  try {
    localStorage.removeItem(key(slug))
  } catch {
    // ignore
  }
}
