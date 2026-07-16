
  import { createRoot } from "react-dom/client";
  import { registerSW } from "virtual:pwa-register";
  import App from "./app/App.tsx";
  import { ThemeProvider } from "next-themes";
  import "./styles/index.css";

  try {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(swUrl, registration) {
        console.log("PWA SERVICE WORKER REGISTERED SUCCESSFULLY", {
          swUrl,
          scope: registration?.scope,
          activeState: registration?.active?.state,
          installingState: registration?.installing?.state,
          waitingState: registration?.waiting?.state,
        });
      },
      onRegisterError(error) {
        console.error("PWA SERVICE WORKER REGISTRATION FAILED", error);
      },
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent("cb-sw-update"));
      },
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent("cb-offline-ready"));
      },
    });

    console.log("PWA SERVICE WORKER REGISTRATION INITIATED", updateSW);
  } catch (error) {
    console.error("PWA SERVICE WORKER REGISTRATION THREW", error);
  }

  const removeSplash = () => {
    const splash = document.getElementById("app-splash");
    if (splash) {
      splash.classList.add("hide");
      window.setTimeout(() => splash.remove(), 450);
    }
  };

  if (document.readyState === "complete") {
    removeSplash();
  } else {
    window.addEventListener("load", removeSplash);
  }


  createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>
  );
  