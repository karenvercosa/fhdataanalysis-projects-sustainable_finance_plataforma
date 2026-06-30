# 🎬 Roteiro de Demonstração — Sustainable Finance 2026

Duração: **~12 min**. Mostra a jornada dos perfis e as regras de negócio
(onboarding em 2 fases, checkout híbrido, trava de download, LGPD, RBAC editável).

**Antes:**
```bash
npm install && npm run dev      # http://localhost:5188
```
- Use uma janela limpa (anônima) para a 1ª impressão da tela de login.
- Redimensione a janela para mostrar a **responsividade** (desktop ↔ mobile).
- Senha das contas de teste: `123456`. Reset rápido no console:
  `localStorage.clear(); location.href="/login"`.

---

## Ato 0 — Login & Onboarding Fase 1 (1,5 min)
1. Abra o app → **Tela de Login** (réplica do Figma).
2. Clique **"Criar conta grátis"** → **/cadastro** (Fase 1: nome, sobrenome,
   e-mail, **celular** com aviso "*exclusivamente para confirmação de segurança*").
3. Crie a conta → você entra como **Participante Não Pago** em Conteúdos.

## Ato 1 — Freemium & Trava de Download (1,5 min)
1. Em **Conteúdos**: note que cada card cruza **Sessão · Palestrante · Curador**.
2. "Assistir" (streaming) é livre; nos **Premium** o botão é **"Bloqueado — Faça
   upgrade"** (a monetização é o *Acesso ao Conhecimento*).
3. Clique **"Fazer upgrade"** → vai ao checkout.

## Ato 2 — Checkout Híbrido (2 min)
1. Preencha **empresa** e **cargo** (Fase 2) e escolha o tipo de ingresso.
2. Aba **"Cartão / Pix"**: mostra o resumo e o pagamento via Asaas (simulado).
3. Aba **"Voucher de convidado"**: digite **`VERDE2026`** → "Acesso gratuito ·
   João Patrocínio · **N usos restantes**". O total vai a **Grátis**.
4. **Resgatar ingresso grátis** → o voucher **consome 1 uso**, você vira
   **Participante Geral** e o menu ganha Agenda/Credencial/Conexões.
5. Volte a **Conteúdos** → agora tudo é **"Baixar"** (download liberado).

## Ato 3 — Participante / PWA (1,5 min)
1. **Agenda**: favorite uma sessão; veja o **alerta de conflito** de horário.
2. **Credencial**: QR individual (código por perfil). 
3. **Perfil**: edite cargo/bio e selecione temas na **nuvem de interesses**;
   salve e recarregue para provar a **persistência**. (Mostre o **selo** ao lado
   do papel — definido pelo Admin.)
4. Reduza a janela → **bottom-nav** e layout mobile.

## Ato 4 — Curador / Patrocinador (1 min)
> Topo → Perfil **Curador** (ou login `curador@sf.com`)
1. **Painel do Curador**: métricas do voucher; **leads** com **trava LGPD**
   (contato só com consentimento).
2. **Credencial**: o curador também é credenciado (código `CUR-…`).

## Ato 5 — Operador / Credenciamento (1 min)
> Topo → Perfil **Operador** (ou `operador@sf.com`)
1. **Bipar QR Code** → credencia o próximo pendente (KPIs sobem).
2. **Busca fallback** (nome/CPF/código) e credenciar manual.
3. Isso alimenta os **Relatórios** do Admin em tempo real.

## Ato 6 — Admin / Gestão (3,5 min)
> Topo → Perfil **Admin** (ou `admin@sf.com`)
1. **Painel**: KPIs, **Matchmaking** (maiores interesses) e tabela de **Curadores**
   (PF/CNPJ, vouchers, leads — refletem os resgates).
2. **Usuários**: crie/edite/exclua; defina o **Selo** (ex.: "Palestrante"). 
3. **Vouchers**: crie um voucher (free/desconto + nº de usos).
4. **Programação**: crie uma sessão → abra **/programacao** e veja-a **na agenda
   do participante** (store compartilhado).
5. **Interesses**: adicione um tema → aparece na nuvem do Perfil.
6. **Relatórios**: Donut de check-in **real** (reflete o Operador) + cupons por
   patrocinador (store vivo).
7. **Permissões** (destaque): ligue **"Baixar conteúdo"** para o **Não Pago** →
   troque o Perfil para Não Pago e veja o download **destravar na hora**. Clique
   **"Restaurar padrão"** ao fim.

---

## Mensagens-chave
- **Onboarding frictionless** em 2 fases · **aquisição híbrida** (pago ou voucher).
- **Monetização do conhecimento** (streaming livre, download pago).
- **Privacidade por design (LGPD)** · **Matchmaking** para o Admin.
- **RBAC real e editável** — muda o acesso de todos os perfis em tempo real.
- **PWA responsivo** e **persistência local** — pronto para API/Asaas.

## Estado persistente (localStorage)
`sf_session_email` · `sf_permissions` · `sf_favorites` · `sf_profile` ·
`sf_interests` · `sf_users` · `sf_lots` · `sf_speakers` · `sf_companies` ·
`sf_vouchers_live` · `sf_sessions` · `sf_checkin`
