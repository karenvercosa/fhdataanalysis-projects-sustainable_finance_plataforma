// Wrapper de dev: aceita --port/-p e ignora flags herdadas do Vite
// (ex.: --strictPort) que o `next dev` não reconhece.
//
// Também remove o diretório .next antes de iniciar. Em pastas do OneDrive,
// a limpeza interna do Next falha com `readlink EINVAL` sobre arquivos
// desidratados; apagar antes evita que o Next tente essa limpeza.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let port = process.env.PORT || "3000";
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) port = args[i + 1];
  else if (args[i].startsWith("--port=")) port = args[i].split("=")[1];
}

try {
  rmSync(path.join(raiz, ".next"), { recursive: true, force: true });
} catch {
  // ignora: o Next recria o diretório
}

// Chamamos o CLI do Next pelo caminho absoluto, com o mesmo binário de Node que
// já está rodando (`process.execPath`), em vez de `spawn("next", …, {shell:true})`.
// Aquela forma dependia do PATH — que qualquer diretório gravável na frente
// consegue sequestrar (SonarQube S4036) — e ainda passava pelo shell sem
// necessidade. Assim não há busca no PATH nem shell no meio do caminho.
const nextCli = path.join(raiz, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextCli, "dev", "-p", port], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
