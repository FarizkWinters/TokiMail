import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setSessionIdGetter } from "@workspace/api-client-react";
import { getSessionId } from "./lib/session";

setSessionIdGetter(getSessionId);

createRoot(document.getElementById("root")!).render(<App />);
