import { registerSW } from "virtual:pwa-register"
import { StrictMode } from "react"
import "./styles.css"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { App } from "./App"

registerSW({ immediate: true })

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
