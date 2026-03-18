
  import { createRoot } from "react-dom/client";
  import { registerSW } from "virtual:pwa-register";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent("cb-sw-update"));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent("cb-offline-ready"));
    },
  });

  window.addEventListener("load", () => {
    const splash = document.getElementById("app-splash");
    if (splash) {
      splash.classList.add("hide");
      window.setTimeout(() => splash.remove(), 450);
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  