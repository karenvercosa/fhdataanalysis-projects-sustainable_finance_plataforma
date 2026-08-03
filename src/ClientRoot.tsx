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
import { type SessaoCliente } from "@/types";

/**
 * Raiz client-side: providers + roteamento (montada via next/dynamic ssr:false).
 *
 * `sessao` vem do Server Component que já autorizou a rota — papel e
 * capacidades resolvidos no banco. É `null` nas telas públicas (login/cadastro).
 */
export default function ClientRoot({ sessao }: Readonly<{ sessao: SessaoCliente | null }>) {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <PermissionsProvider>
          <AuthProvider sessao={sessao}>
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
