import { Buffer } from "buffer";
if (!window.Buffer) {
  window.Buffer = Buffer;
}
// import "@/hooks/suppressConsole";//是否正式环境关闭console
import { createRoot } from "react-dom/client";
import { HashRouter, BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import "./i18n.ts";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
