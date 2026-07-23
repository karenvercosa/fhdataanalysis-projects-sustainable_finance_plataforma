"use client";

import React from "react";
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
import { TierMatrixProvider } from "./context/TierMatrixContext";
import { ParticipationProvider } from "./context/ParticipationContext";
import { CookieConsentProvider } from "./context/CookieConsentContext";
import { CookieBanner } from "./components/legal/CookieBanner";

// Raiz client-side: providers + roteamento (montada via next/dynamic ssr:false).
export default function ClientRoot() {
  return (
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
                        <TierMatrixProvider>
                          <ParticipationProvider>
                            {/* Consentimento vale também deslogado (login/cadastro) */}
                            <CookieConsentProvider>
                              <App />
                              <CookieBanner />
                            </CookieConsentProvider>
                          </ParticipationProvider>
                        </TierMatrixProvider>
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
}
