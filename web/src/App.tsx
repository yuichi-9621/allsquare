import { Link, Route, Routes } from "react-router-dom"
import { useT } from "./lib/i18n"
import { CreateGroup } from "./routes/CreateGroup"
import { Dashboard } from "./routes/Dashboard"
import { GroupPage } from "./routes/GroupPage"
import { Landing } from "./routes/Landing"

export function App() {
  const t = useT()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4 sm:p-8 lg:max-w-5xl">
      <header className="flex items-baseline justify-between gap-3 px-1">
        <Link
          to="/"
          className="font-mono text-base font-bold uppercase tracking-[0.28em] text-foreground no-underline"
        >
          Allsquare
        </Link>
        <span className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          {t("appTagline")}
        </span>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/new" element={<CreateGroup />} />
        <Route path="/g/:slug" element={<GroupPage />} />
      </Routes>
    </div>
  )
}
