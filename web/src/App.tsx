import { Route, Routes } from "react-router-dom"
import { CreateGroup } from "./routes/CreateGroup"
import { GroupPage } from "./routes/GroupPage"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateGroup />} />
      <Route path="/g/:slug" element={<GroupPage />} />
    </Routes>
  )
}
