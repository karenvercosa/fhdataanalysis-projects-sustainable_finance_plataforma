import "server-only";

import { NextResponse } from "next/server";
import { ErroAutorizacao } from "@/lib/rbac.server";
import { ErroAsaas } from "@/services/asaas.service";

/**
 * Casca comum das rotas de administração.
 *
 * Toda rota sob `/api/admin` faz a mesma coisa quando algo dá errado: devolver
 * 401/403 para falha de autorização e 500 para o resto, sempre no mesmo
 * formato `{ error }` que as telas já sabem ler. Concentrar isso aqui evita
 * repetir o try/catch em cada handler — e evita que um deles esqueça de
 * traduzir o `ErroAutorizacao` e vaze um 500 no lugar de um 403.
 */
export async function rotaAdmin<T>(
  contexto: string,
  handler: () => Promise<T>,
): Promise<NextResponse> {
  try {
    return NextResponse.json(await handler());
  } catch (erro: any) {
    if (erro instanceof ErroAutorizacao) {
      return NextResponse.json({ error: erro.message }, { status: erro.status });
    }
    if (erro instanceof ErroDeEntrada || erro instanceof ErroAsaas) {
      // Recusa do gateway é dado do formulário, não falha do servidor.
      return NextResponse.json({ error: erro.message }, { status: 400 });
    }
    console.error(`[${contexto}]`, erro);
    return NextResponse.json(
      { error: erro?.message || "Não foi possível concluir a operação." },
      { status: 500 },
    );
  }
}

/** Dados inválidos enviados pela tela — vira 400, não 500. */
export class ErroDeEntrada extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeEntrada";
  }
}
