import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PermissionsProvider } from "./context/PermissionsContext";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { InterestsProvider } from "./context/InterestsContext";
import { VouchersProvider } from "./context/VouchersContext";
import { SessionsProvider } from "./context/SessionsContext";
import { CheckinProvider } from "./context/CheckinContext";
import { ConnectionFavoritesProvider } from "./context/ConnectionFavoritesContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PermissionsProvider>
        <AuthProvider>
          <FavoritesProvider>
          <InterestsProvider>
            <VouchersProvider>
              <SessionsProvider>
                <CheckinProvider>
                  <ConnectionFavoritesProvider>
                    <App />
                  </ConnectionFavoritesProvider>
                </CheckinProvider>
              </SessionsProvider>
            </VouchersProvider>
          </InterestsProvider>
          </FavoritesProvider>
        </AuthProvider>
      </PermissionsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
