import { Link, Route, Routes } from "react-router-dom"
import { CreateGroup } from "./routes/CreateGroup"
import { GroupPage } from "./routes/GroupPage"

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Allsquare
        </Link>
        <span className="brand-tag">split · settle · square up</span>
      </header>
      <Routes>
        <Route path="/" element={<CreateGroup />} />
        <Route path="/g/:slug" element={<GroupPage />} />
      </Routes>
    </div>
  )
}
