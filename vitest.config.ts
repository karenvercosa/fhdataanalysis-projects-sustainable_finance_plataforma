import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // A ORDEM importa: o Vite usa a primeira chave que casar como prefixo, e
    // `@` casaria com `@/types` antes da entrada específica — resolvendo para
    // `src/types`, que não existe.
    alias: [
      { find: "server-only", replacement: path.resolve(__dirname, "./src/test/server-only.ts") },
      { find: /^@\/types$/, replacement: path.resolve(__dirname, "./types") },
      { find: /^@\//, replacement: `${path.resolve(__dirname, "./src")}/` },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // lcov é o formato lido pelo SonarQube.
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      // `all: true` + `include` fazem o relatório listar o src inteiro, e não
      // apenas os arquivos que os testes chegaram a importar. Sem isso, rotas
      // de API e services ficavam fora do lcov e o Sonar reportava uma
      // cobertura inflada.
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      // Mantido em sincronia com `sonar.coverage.exclusions`. Só sai daqui o
      // que não é código executável testável.
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/**/__tests__/**",
        "src/test/**",
        "src/app/manifest.ts",
        "src/app/layout.tsx",
        "src/ClientRoot.tsx",
      ],
    },
  },
});
