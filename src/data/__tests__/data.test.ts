import { describe, it, expect } from "vitest";
import { SESSIONS, toMinutes, sessionsOverlap, TRACK_TONE, CURATOR_LEADS, ATTENDEES, CONTENTS } from "@/data/mock";
import {
  TICKET_TYPES,
  VOUCHERS,
  CURATORS,
  SPEAKERS,
  getSpeaker,
  getCurator,
  getSessionTitle,
  getTicketType,
  getVoucherByCode,
  applyVoucher,
} from "@/data/catalog";
import {
  CONNECTIONS,
  getConnection,
  sponsorTier,
  companyTier,
  sealForConnection,
  personCompany,
  TIER_TONE,
} from "@/data/networking";
import {
  BRAND_KEY,
  BRAND_FORMATS,
  BRAND_SEED,
  SPEAKER_OPTIONS,
  PANEL_OPTIONS,
  BRAND_COMPANIES,
} from "@/data/brandContent";
import { LEGAL_DOCS, LEGAL_ORDER, CONTROLADOR, CONSENTIMENTO_KEY, AVISO_FORMULARIO_B2B } from "@/data/legal";
import { SPONSOR_ADS, BRONZE_SPONSORS, SPONSOR_ADS_KEY } from "@/data/sponsorAds";
import {
  TIER_ORDER,
  TIER_BENEFITS,
  COMMERCIAL_CONTACT,
  cotaDoSelo,
  tiersAbove,
  benefitsGained,
} from "@/data/sponsorTiers";
import {
  DEFAULT_TIER_MATRIX,
  TIER_FEATURE_ROWS,
  TIER_MATRIX_KEY,
  UNRESTRICTED,
} from "@/data/tierMatrix";
import { SEED_USERS, USER_TAGS } from "@/data/users";

describe("mock — grade do evento", () => {
  it("toda sessão tem id único", () => {
    expect(new Set(SESSIONS.map((s) => s.id)).size).toBe(SESSIONS.length);
  });

  it("toda sessão termina depois de começar", () => {
    for (const s of SESSIONS) {
      expect(toMinutes(s.end)).toBeGreaterThan(toMinutes(s.start));
    }
  });

  it("toda trilha tem um tom declarado", () => {
    for (const s of SESSIONS) expect(TRACK_TONE[s.track]).toBeDefined();
  });

  it("os catálogos auxiliares vêm preenchidos", () => {
    expect(CURATOR_LEADS.length).toBeGreaterThan(0);
    expect(ATTENDEES.length).toBeGreaterThan(0);
    expect(CONTENTS.length).toBeGreaterThan(0);
  });
});

describe("toMinutes", () => {
  it("converte HH:mm em minutos desde a meia-noite", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59")).toBe(1439);
  });
});

describe("sessionsOverlap", () => {
  const em = (start: string, end: string) => ({ start, end }) as never;

  it("horários que se cruzam conflitam", () => {
    expect(sessionsOverlap(em("09:00", "10:00"), em("09:30", "10:30"))).toBe(true);
  });

  it("uma dentro da outra também conflita", () => {
    expect(sessionsOverlap(em("09:00", "12:00"), em("10:00", "11:00"))).toBe(true);
  });

  it("sessões coladas não conflitam — o fim de uma é o início da outra", () => {
    expect(sessionsOverlap(em("09:00", "10:00"), em("10:00", "11:00"))).toBe(false);
  });

  it("sessões separadas não conflitam, em qualquer ordem", () => {
    expect(sessionsOverlap(em("09:00", "10:00"), em("14:00", "15:00"))).toBe(false);
    expect(sessionsOverlap(em("14:00", "15:00"), em("09:00", "10:00"))).toBe(false);
  });
});

describe("catalog — buscas por id", () => {
  it("encontra palestrante, curador e tipo de ingresso existentes", () => {
    expect(getSpeaker(SPEAKERS[0].id)).toBe(SPEAKERS[0]);
    expect(getCurator(CURATORS[0].id)).toBe(CURATORS[0]);
    expect(getTicketType(TICKET_TYPES[0].id)).toBe(TICKET_TYPES[0]);
  });

  it("devolve undefined para id inexistente", () => {
    expect(getSpeaker("nao-existe")).toBeUndefined();
    expect(getCurator("nao-existe")).toBeUndefined();
    expect(getTicketType("nao-existe")).toBeUndefined();
  });

  it("o título da sessão cai no próprio id quando ela não existe", () => {
    expect(getSessionTitle(SESSIONS[0].id)).toBe(SESSIONS[0].title);
    expect(getSessionTitle("s-inexistente")).toBe("s-inexistente");
  });
});

describe("getVoucherByCode", () => {
  it("a busca ignora caixa e espaços", () => {
    expect(getVoucherByCode("  verde2026 ")?.id).toBe("vc_1");
    expect(getVoucherByCode("VERDE2026")?.id).toBe("vc_1");
  });

  it("código desconhecido não devolve voucher", () => {
    expect(getVoucherByCode("NAOEXISTE")).toBeUndefined();
  });

  it("só considera voucher ativo", () => {
    for (const v of VOUCHERS) {
      if (getVoucherByCode(v.code)) expect(v.active).toBe(true);
    }
  });
});

describe("applyVoucher", () => {
  const voucher = (over: Record<string, unknown>) =>
    ({ id: "v", code: "C", value: 0, maxUses: 1, usedCount: 0, ownerType: "curator", ownerId: "o", active: true, ...over }) as never;

  it("sem voucher o preço não muda", () => {
    expect(applyVoucher(480)).toEqual({ total: 480, discount: 0 });
  });

  it("voucher gratuito zera o preço", () => {
    expect(applyVoucher(480, voucher({ kind: "free" }))).toEqual({ total: 0, discount: 480 });
  });

  it("desconto percentual é arredondado", () => {
    expect(applyVoucher(480, voucher({ kind: "percent", value: 50 }))).toEqual({
      total: 240,
      discount: 240,
    });
    expect(applyVoucher(101, voucher({ kind: "percent", value: 33 }))).toEqual({
      total: 68,
      discount: 33,
    });
  });

  it("desconto fixo nunca deixa o total negativo", () => {
    expect(applyVoucher(100, voucher({ kind: "fixed", value: 300 }))).toEqual({
      total: 0,
      discount: 100,
    });
    expect(applyVoucher(480, voucher({ kind: "fixed", value: 100 }))).toEqual({
      total: 380,
      discount: 100,
    });
  });
});

describe("networking", () => {
  const empresa = CONNECTIONS.find((c) => c.kind === "company")!;
  const pessoa = CONNECTIONS.find((c) => c.kind === "person")!;

  it("encontra a conexão pelo id", () => {
    expect(getConnection(empresa.id)).toBe(empresa);
    expect(getConnection("nao-existe")).toBeUndefined();
  });

  it("a cota da empresa é a dela própria", () => {
    expect(sponsorTier(empresa)).toBe(empresa.tier);
  });

  it("a cota de uma pessoa é a da empresa em que ela trabalha", () => {
    const daEmpresa = CONNECTIONS.find(
      (c) => c.kind === "person" && c.company === empresa.name,
    );
    if (daEmpresa) expect(sponsorTier(daEmpresa)).toBe(empresa.tier);
  });

  it("pessoa de empresa não patrocinadora fica sem cota", () => {
    expect(sponsorTier({ ...pessoa, company: "Empresa Fantasma" })).toBeUndefined();
  });

  it("companyTier busca pelo nome e tolera nome ausente", () => {
    expect(companyTier(empresa.name)).toBe(empresa.tier);
    expect(companyTier("Empresa Fantasma")).toBeUndefined();
    expect(companyTier(undefined)).toBeUndefined();
  });

  it("toda cota tem um tom declarado", () => {
    for (const c of CONNECTIONS) {
      const tier = sponsorTier(c);
      if (tier) expect(TIER_TONE[tier]).toBeDefined();
    }
  });

  it("empresa recebe o selo de patrocinador", () => {
    expect(sealForConnection(empresa)).toBe("Patrocinador");
  });

  it("curador do catálogo recebe o selo do tipo de pessoa dele", () => {
    const curador = CONNECTIONS.find((c) => CURATORS.some((x) => x.name === c.name));
    if (curador) expect(["Curador", "Patrocinador"]).toContain(sealForConnection(curador));
  });

  it("quem palestra em alguma sessão recebe o selo de palestrante", () => {
    const palestrante = CONNECTIONS.find(
      (c) =>
        c.kind === "person" &&
        !CURATORS.some((x) => x.name === c.name) &&
        SESSIONS.some((s) => s.speaker === c.name),
    );
    if (palestrante) expect(sealForConnection(palestrante)).toBe("Palestrante");
  });

  it("participante comum circula sem selo", () => {
    expect(sealForConnection({ ...pessoa, kind: "person", name: "Ninguém Conhecido" })).toBeUndefined();
  });

  it("personCompany credita a empresa da pessoa, menos quando é Independente", () => {
    const comEmpresa = CONNECTIONS.find(
      (c) => c.kind === "person" && c.company && c.company !== "Independente",
    );
    if (comEmpresa) expect(personCompany(comEmpresa.name)).toBe(comEmpresa.company);

    expect(personCompany(undefined)).toBeUndefined();
    expect(personCompany("Ninguém")).toBeUndefined();
  });
});

describe("brandContent", () => {
  it("as opções de seleção derivam dos catálogos", () => {
    expect(SPEAKER_OPTIONS).toHaveLength(SPEAKERS.length);
    expect(PANEL_OPTIONS).toHaveLength(SESSIONS.length);
    expect(BRAND_COMPANIES).toHaveLength(CONNECTIONS.filter((c) => c.kind === "company").length);
  });

  it("a chave é versionada e os formatos estão declarados", () => {
    expect(BRAND_KEY).toContain("_v2");
    expect(BRAND_FORMATS).toEqual(["E-book", "Podcast", "Vídeo", "Artigo"]);
  });

  it("todo conteúdo da semente usa um formato conhecido", () => {
    for (const c of BRAND_SEED) expect(BRAND_FORMATS).toContain(c.format);
  });
});

describe("legal", () => {
  it("a ordem exibida cobre exatamente os documentos existentes", () => {
    expect([...LEGAL_ORDER].sort()).toEqual(Object.keys(LEGAL_DOCS).sort());
  });

  it("todo documento tem título, data, resumo e seções com corpo", () => {
    for (const id of LEGAL_ORDER) {
      const doc = LEGAL_DOCS[id];
      expect(doc.id).toBe(id);
      expect(doc.title).toBeTruthy();
      expect(doc.updatedAt).toBeTruthy();
      expect(doc.summary).toBeTruthy();
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const s of doc.sections) {
        expect(s.heading).toBeTruthy();
        expect(s.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("o canal do encarregado exigido pela LGPD está declarado", () => {
    expect(CONTROLADOR.email).toContain("@");
    expect(CONSENTIMENTO_KEY).toBeTruthy();
    expect(AVISO_FORMULARIO_B2B).toBeTruthy();
  });
});

describe("sponsorAds", () => {
  it("toda divulgação é de uma cota que exibe banner", () => {
    for (const ad of SPONSOR_ADS) expect(["Ouro", "Prata"]).toContain(ad.tier);
  });

  it("Ouro tem o dobro de exibições de Prata", () => {
    const ouro = SPONSOR_ADS.filter((a) => a.tier === "Ouro").length;
    const prata = SPONSOR_ADS.filter((a) => a.tier === "Prata").length;
    expect(ouro).toBe(prata * 2);
  });

  it("os patrocinadores Bronze não se repetem", () => {
    expect(new Set(BRONZE_SPONSORS).size).toBe(BRONZE_SPONSORS.length);
    expect(SPONSOR_ADS_KEY).toBeTruthy();
  });
});

describe("sponsorTiers", () => {
  it("cotaDoSelo aceita só as cotas conhecidas", () => {
    expect(cotaDoSelo("Ouro")).toBe("Ouro");
    expect(cotaDoSelo("Diamante")).toBeUndefined();
    expect(cotaDoSelo(null)).toBeUndefined();
    expect(cotaDoSelo(undefined)).toBeUndefined();
  });

  it("tiersAbove lista o que vem depois da cota", () => {
    expect(tiersAbove("Bronze")).toEqual(["Prata", "Ouro"]);
    expect(tiersAbove("Ouro")).toEqual([]);
    expect(tiersAbove("Inexistente" as never)).toEqual([]);
  });

  it("benefitsGained soma os benefícios das cotas atravessadas", () => {
    expect(benefitsGained("Bronze", "Ouro")).toEqual([
      ...TIER_BENEFITS.Prata,
      ...TIER_BENEFITS.Ouro,
    ]);
    expect(benefitsGained("Ouro", "Ouro")).toEqual([]);
  });

  it("toda cota da ordem tem benefícios declarados", () => {
    for (const t of TIER_ORDER) expect(TIER_BENEFITS[t].length).toBeGreaterThan(0);
    expect(COMMERCIAL_CONTACT.email).toContain("@");
  });
});

describe("tierMatrix", () => {
  it("a matriz padrão traz as três cotas em ordem crescente", () => {
    expect(DEFAULT_TIER_MATRIX.map((t) => t.name)).toEqual(["Bronze", "Prata", "Ouro"]);
  });

  it("toda cota declara todos os recursos da matriz", () => {
    for (const plano of DEFAULT_TIER_MATRIX) {
      for (const linha of TIER_FEATURE_ROWS) {
        expect(typeof plano.features[linha.key]).toBe("boolean");
      }
    }
  });

  it("uma cota superior nunca libera menos que a inferior", () => {
    for (let i = 1; i < DEFAULT_TIER_MATRIX.length; i++) {
      for (const { key } of TIER_FEATURE_ROWS) {
        if (DEFAULT_TIER_MATRIX[i - 1].features[key]) {
          expect(DEFAULT_TIER_MATRIX[i].features[key]).toBe(true);
        }
      }
    }
  });

  it("o fallback sem cota libera tudo", () => {
    expect(Object.values(UNRESTRICTED).every(Boolean)).toBe(true);
    expect(TIER_MATRIX_KEY).toContain("_v2");
  });
});

describe("users (semente do protótipo)", () => {
  it("os e-mails da semente não se repetem", () => {
    expect(new Set(SEED_USERS.map((u) => u.email)).size).toBe(SEED_USERS.length);
  });

  it("todo selo da semente está na lista de selos", () => {
    for (const u of SEED_USERS) expect(USER_TAGS).toContain(u.tag);
  });
});
