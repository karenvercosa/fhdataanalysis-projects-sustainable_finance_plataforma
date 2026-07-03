// Wrapper de dev: aceita --port/-p e ignora flags herdadas do Vite
// (ex.: --strictPort) que o `next dev` não reconhece.
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
let port = process.env.PORT || "3000";
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) port = args[i + 1];
  else if (args[i].startsWith("--port=")) port = args[i].split("=")[1];
}

const child = spawn("next", ["dev", "-p", port], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
