// Wrapper de dev: aceita --port/-p e ignora flags herdadas do Vite
// (ex.: --strictPort) que o `next dev` não reconhece.
//
// Também remove o diretório .next antes de iniciar. Em pastas do OneDrive,
// a limpeza interna do Next falha com `readlink EINVAL` sobre arquivos
// desidratados; apagar antes evita que o Next tente essa limpeza.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const args = process.argv.slice(2);
let port = process.env.PORT || "3000";
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) port = args[i + 1];
  else if (args[i].startsWith("--port=")) port = args[i].split("=")[1];
}

try {
  rmSync(".next", { recursive: true, force: true });
} catch {
  // ignora: o Next recria o diretório
}

const child = spawn("next", ["dev", "-p", port], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
