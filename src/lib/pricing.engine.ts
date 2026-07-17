import {
  MATERIAIS,
  SACOLAS,
  getProdutoBySlug,
  type AlcaId,
  type CoberturaId,
  type MaterialId,
  type ProdutoTipo,
  type SacolaSize,
} from "@/data/catalog";
import {
  CUSTOM_PRODUCT_SLUG,
  labelAlca,
  labelCobertura,
  type CustomProductType,
  type PricingMode,
  type PricingInput,
  type PricingResult,
} from "./pricing.shared";

export interface PricingParams {
  materiais: Record<MaterialId, number>;
  reservaBrancaPorFolha: number;
  adicionalColoridaPorFolha: number;
  custoAlca: Record<AlcaId, number>;
  margemPadrao: number;
  margemMinima: number;
  taxaCriacao: number;
  taxaUrgenciaPct: number;
  diasSeguranca: number;
}

interface InternalSacolaConfig {
  folhas: number;
  capacidadeDia: number;
}

interface InternalProductConfig {
  modoConsumo: "unidades_por_folha" | "folhas_por_unidade";
  fator: number;
  acabamentoPorUnidade: number;
  capacidadeDia: number;
  setupDias?: number;
}

export interface PricingInternalSnapshot {
  formulaVersion: "giga-pricing-v2";
  input: PricingInput;
  params: PricingParams;
  produto: {
    slug: string;
    tipo: ProdutoTipo | CustomProductType;
    nome: string;
    medida?: string;
  };
  custoUnitario: number;
  custoProducao: number;
  custosExtras: number;
  custoTotal: number;
  margemAplicada: number;
  margemMinima: number;
  lucroEstimado: number;
  prazo: {
    capacidadeDia: number;
    diasProducao: number;
    setupDias: number;
    diasSeguranca: number;
    prazoDiasUteis: number;
  };
  breakdown: Record<string, number>;
}

export interface PricingComputation {
  publicResult: PricingResult;
  internalSnapshot?: PricingInternalSnapshot;
}

export interface SupplyCostSnapshot {
  nome: string;
  custo_medio: number | null;
  ultimo_custo: number | null;
}

const DEFAULT_PRICING_PARAMS: PricingParams = {
  materiais: {
    offset180: 0.274,
    matte220: 0.5001,
    glossy220: 0.6406,
    offset90: 0.1204,
  },
  reservaBrancaPorFolha: 0.15,
  adicionalColoridaPorFolha: 0.2,
  custoAlca: {
    poliester: 0.68,
    gorgurao: 0.7,
    sem: 0,
  },
  margemPadrao: 0.65,
  margemMinima: 0.45,
  taxaCriacao: 20,
  taxaUrgenciaPct: 0.2,
  diasSeguranca: 2,
};

const SACOLA_INTERNAL: Record<SacolaSize, InternalSacolaConfig> = {
  mini: { folhas: 1, capacidadeDia: 30 },
  p: { folhas: 2, capacidadeDia: 20 },
  m: { folhas: 4, capacidadeDia: 12 },
  g: { folhas: 5, capacidadeDia: 8 },
};

const SACOLA_SALES_TABLE: Record<SacolaSize, Record<number, number>> = {
  mini: { 25: 105, 50: 180, 100: 310, 250: 687.5, 500: 1250 },
  p: { 25: 155, 50: 275, 100: 490, 250: 1100, 500: 2050 },
  m: { 25: 235, 50: 430, 100: 790, 250: 1800, 500: 3400 },
  g: { 25: 297.5, 50: 545, 100: 990, 250: 2300, 500: 4350 },
};

const SACOLA_COLOR_ADDITIONAL_PER_UNIT: Record<SacolaSize, number> = {
  mini: 0.2,
  p: 0.4,
  m: 0.8,
  g: 1,
};

const PRODUCT_INTERNAL: Record<string, InternalProductConfig> = {
  "tag-de-roupa": {
    modoConsumo: "unidades_por_folha",
    fator: 12,
    acabamentoPorUnidade: 0.03,
    capacidadeDia: 120,
  },
  "cartao-de-agradecimento": {
    modoConsumo: "unidades_por_folha",
    fator: 12,
    acabamentoPorUnidade: 0,
    capacidadeDia: 150,
  },
  "tag-para-brincos": {
    modoConsumo: "unidades_por_folha",
    fator: 12,
    acabamentoPorUnidade: 0.05,
    capacidadeDia: 120,
  },
  "tag-para-colar-e-brincos": {
    modoConsumo: "unidades_por_folha",
    fator: 6,
    acabamentoPorUnidade: 0.08,
    capacidadeDia: 80,
  },
  "caixa-para-joia-pp": {
    modoConsumo: "folhas_por_unidade",
    fator: 1,
    acabamentoPorUnidade: 0.25,
    capacidadeDia: 15,
  },
  "caixa-para-conjunto-p": {
    modoConsumo: "folhas_por_unidade",
    fator: 2,
    acabamentoPorUnidade: 0.4,
    capacidadeDia: 10,
  },
  "caixa-sacolinha": {
    modoConsumo: "folhas_por_unidade",
    fator: 1,
    acabamentoPorUnidade: 0.3,
    capacidadeDia: 18,
  },
  "caixa-almofada": {
    modoConsumo: "folhas_por_unidade",
    fator: 1,
    acabamentoPorUnidade: 0.2,
    capacidadeDia: 25,
  },
  "cartao-de-visita": {
    modoConsumo: "unidades_por_folha",
    fator: 10,
    acabamentoPorUnidade: 0,
    capacidadeDia: 200,
  },
  "santinho-politico": {
    modoConsumo: "unidades_por_folha",
    fator: 6,
    acabamentoPorUnidade: 0,
    capacidadeDia: 300,
  },
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function carregarParametrosPreco(): Promise<PricingParams> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pricing_params")
      .select("params")
      .eq("id", 1)
      .single();

    if (error || !data?.params) return DEFAULT_PRICING_PARAMS;
    const raw = data.params as Partial<PricingParams>;
    return normalizeParams(raw);
  } catch {
    return DEFAULT_PRICING_PARAMS;
  }
}

export async function calcularPreco(input: PricingInput): Promise<PricingResult> {
  const computation = await calcularPrecoComSnapshot(input);
  return computation.publicResult;
}

export async function calcularPrecoComSnapshot(input: PricingInput): Promise<PricingComputation> {
  const params = await carregarParametrosPreco();
  return calcularPrecoComParametros(input, params);
}

export function calcularPrecoComParametros(
  input: PricingInput,
  params: PricingParams,
): PricingComputation {
  const produto = getProdutoBySlug(input.slug);
  const isCustom = input.slug === CUSTOM_PRODUCT_SLUG;
  if (!produto && !isCustom) return { publicResult: vazio("Produto não encontrado") };

  const quantidade = Math.max(1, Math.floor(input.quantidade || 0));
  if (!quantidade) return { publicResult: vazio("Informe a quantidade") };

  const material = MATERIAIS.find((m) => m.id === input.materialId);
  const custoPorFolha = params.materiais[input.materialId];
  if (!material || typeof custoPorFolha !== "number") {
    return { publicResult: vazio("Selecione um material válido") };
  }

  const adicionaisPublicos: { nome: string; valor: number }[] = [];
  const modoPreco: PricingMode = input.modoPreco ?? "tabela_venda";
  const usaCalculadoraPlanilha = modoPreco === "calculadora_planilha";
  const impressaoColorida =
    input.cobertura === "colorida" ||
    input.cobertura === "texturizada" ||
    input.cobertura === "alta";
  const passesImpressao = input.impressao === "frente_verso" ? 2 : 1;

  let custoUnitario = 0;
  let capacidadeDia = 20;
  let setupDias = 1;
  let precoComercialTotal: number | null = null;
  const breakdown: Record<string, number> = {};
  let nomeProduto = produto?.nome ?? "Produto personalizado";
  let tipoProduto: ProdutoTipo | CustomProductType = produto?.tipo ?? "outro";
  let medidaProduto = produto?.medida;

  if (isCustom) {
    const custom = input.personalizado;
    if (!custom?.nome?.trim()) return { publicResult: vazio("Informe o nome do produto") };
    if (!custom.medida?.trim()) return { publicResult: vazio("Informe a medida do produto") };

    const fator = Number(custom.fator || 0);
    if (fator <= 0) return { publicResult: vazio("Informe o consumo de papel") };

    nomeProduto = custom.nome.trim();
    tipoProduto = custom.tipo;
    medidaProduto = custom.medida.trim();

    const fatorSeguro =
      custom.modoConsumo === "unidades_por_folha" ? Math.max(1, fator) : Math.max(0.001, fator);
    const reservaPorFolha =
      (params.reservaBrancaPorFolha + (impressaoColorida ? params.adicionalColoridaPorFolha : 0)) *
      passesImpressao;
    const papel =
      custom.modoConsumo === "unidades_por_folha"
        ? custoPorFolha / fatorSeguro
        : custoPorFolha * fatorSeguro;
    const reserva =
      custom.modoConsumo === "unidades_por_folha"
        ? reservaPorFolha / fatorSeguro
        : reservaPorFolha * fatorSeguro;
    const acabamento = Math.max(0, Number(custom.acabamentoPorUnidade || 0));
    const custoAlca = custom.usarAlca ? params.custoAlca[input.alca ?? "poliester"] : 0;

    custoUnitario = papel + reserva + acabamento + custoAlca;
    capacidadeDia = Math.max(1, Math.floor(Number(custom.capacidadeDia || 20)));
    setupDias = Math.max(0, Math.floor(Number(custom.setupDias ?? 1)));
    Object.assign(breakdown, {
      papel,
      reserva,
      acabamento,
      alca: custoAlca,
      fator: fatorSeguro,
      passesImpressao,
    });
  } else if (produto?.tipo === "sacola") {
    const sacola = input.tamanho ? SACOLA_INTERNAL[input.tamanho] : undefined;
    const sacolaPublica = SACOLAS.find((s) => s.id === input.tamanho);
    if (!sacola || !sacolaPublica) return { publicResult: vazio("Selecione um tamanho") };

    const papel = custoPorFolha * sacola.folhas;
    const reserva = params.reservaBrancaPorFolha * sacola.folhas * passesImpressao;
    const adicionalCor = impressaoColorida
      ? params.adicionalColoridaPorFolha * sacola.folhas * passesImpressao
      : 0;
    const custoAlca = params.custoAlca[input.alca ?? "poliester"];

    custoUnitario = papel + reserva + adicionalCor + custoAlca;
    capacidadeDia = sacola.capacidadeDia;
    setupDias = 2;
    Object.assign(breakdown, { papel, reserva, adicionalCor, alca: custoAlca, passesImpressao });

    const precoTabela = calcularPrecoTabelaSacola({
      tamanho: input.tamanho,
      quantidade,
      cobertura: input.cobertura,
      alca: input.alca ?? "poliester",
      materialId: input.materialId,
      params,
    });
    if (!usaCalculadoraPlanilha && precoTabela) {
      precoComercialTotal = precoTabela.precoTotal;
      Object.assign(breakdown, precoTabela.breakdown);
    }
  } else {
    const config = PRODUCT_INTERNAL[input.slug];
    if (!config) return { publicResult: vazio("Produto ainda sem regra de preço") };

    const fatorSeguro =
      config.modoConsumo === "unidades_por_folha"
        ? Math.max(1, config.fator)
        : Math.max(0.001, config.fator);
    const papel =
      config.modoConsumo === "unidades_por_folha"
        ? custoPorFolha / fatorSeguro
        : custoPorFolha * fatorSeguro;
    const reserva =
      config.modoConsumo === "unidades_por_folha"
        ? (params.reservaBrancaPorFolha * passesImpressao) / fatorSeguro
        : params.reservaBrancaPorFolha * fatorSeguro * passesImpressao;
    const adicionalCor = impressaoColorida
      ? config.modoConsumo === "unidades_por_folha"
        ? (params.adicionalColoridaPorFolha * passesImpressao) / fatorSeguro
        : params.adicionalColoridaPorFolha * fatorSeguro * passesImpressao
      : 0;
    const acabamento = config.acabamentoPorUnidade;

    custoUnitario = papel + reserva + adicionalCor + acabamento;
    capacidadeDia = config.capacidadeDia;
    setupDias = config.setupDias ?? 1;
    Object.assign(breakdown, {
      papel,
      reserva,
      adicionalCor,
      acabamento,
      fator: fatorSeguro,
      passesImpressao,
    });
  }

  const custoProducao = custoUnitario * quantidade;
  let custosExtras = 0;
  if (usaCalculadoraPlanilha || input.criacaoArte) {
    custosExtras += params.taxaCriacao;
    adicionaisPublicos.push({
      nome: usaCalculadoraPlanilha ? "Taxa de criacao/setup" : "Criacao de arte",
      valor: params.taxaCriacao,
    });
  }

  const custoTotal = custoProducao + custosExtras;
  const margem = Math.max(params.margemPadrao, params.margemMinima);
  let precoTotal = precoComercialTotal ?? custoTotal / (1 - margem);
  if (precoComercialTotal !== null) precoTotal += custosExtras;

  if (input.urgencia) {
    const taxa = precoTotal * params.taxaUrgenciaPct;
    adicionaisPublicos.push({ nome: "Urgência", valor: round2(taxa) });
    precoTotal += taxa;
  }

  if (!usaCalculadoraPlanilha && precoComercialTotal === null && precoTotal > 100) {
    precoTotal = Math.ceil(precoTotal / 5) * 5;
  } else {
    precoTotal = round2(precoTotal);
  }

  const precoUnitario = round2(precoTotal / quantidade);
  const margemReal = precoTotal > 0 ? (precoTotal - custoTotal) / precoTotal : 0;
  const diasProducao = Math.ceil(quantidade / capacidadeDia);
  const setupDiasPrazo = usaCalculadoraPlanilha ? 0 : setupDias;
  let prazoDiasUteis = diasProducao + setupDiasPrazo + params.diasSeguranca;
  if (input.urgencia) prazoDiasUteis = Math.max(3, Math.ceil(prazoDiasUteis * 0.6));

  const linhas = [
    `${quantidade} × ${nomeProduto}`,
    `Material: ${material.nome}`,
    tipoProduto === "sacola" && !isCustom
      ? `Tamanho: ${SACOLAS.find((s) => s.id === input.tamanho)?.nome}`
      : `Medida: ${medidaProduto ?? "-"}`,
    `Cobertura: ${labelCobertura(input.cobertura)}`,
    input.impressao === "frente_verso" ? "Impressão: frente e verso" : "Impressão: frente",
    (tipoProduto === "sacola" || input.personalizado?.usarAlca) && input.alca !== "sem"
      ? `Alça: ${labelAlca(input.alca ?? "poliester")}`
      : null,
    `Valor unitário estimado: R$ ${precoUnitario.toFixed(2).replace(".", ",")}`,
    `Valor total estimado: R$ ${precoTotal.toFixed(2).replace(".", ",")}`,
  ].filter(Boolean) as string[];

  const publicResult: PricingResult = {
    valido: true,
    quantidade,
    precoUnitario,
    precoTotal: round2(precoTotal),
    adicionais: adicionaisPublicos,
    prazoDiasUteis,
    resumo: linhas.join("\n"),
  };

  return {
    publicResult,
    internalSnapshot: {
      formulaVersion: "giga-pricing-v2",
      input,
      params,
      produto: {
        slug: produto?.slug ?? CUSTOM_PRODUCT_SLUG,
        tipo: tipoProduto,
        nome: nomeProduto,
        medida: medidaProduto,
      },
      custoUnitario: round2(custoUnitario),
      custoProducao: round2(custoProducao),
      custosExtras: round2(custosExtras),
      custoTotal: round2(custoTotal),
      margemAplicada: round2(margemReal),
      margemMinima: params.margemMinima,
      lucroEstimado: round2(precoTotal - custoTotal),
      prazo: {
        capacidadeDia,
        diasProducao,
        setupDias: setupDiasPrazo,
        diasSeguranca: params.diasSeguranca,
        prazoDiasUteis,
      },
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [key, round2(value)]),
      ),
    },
  };
}

export function aplicarCustosDeInsumos(
  params: PricingParams,
  supplies: SupplyCostSnapshot[],
): PricingParams {
  const next = normalizeParams(params);

  for (const supply of supplies) {
    const nome = normalizeName(supply.nome);
    const unitCost = Number(supply.custo_medio || supply.ultimo_custo || 0);
    if (!unitCost) continue;

    if (nome.includes("offset") && nome.includes("180")) next.materiais.offset180 = unitCost;
    if (nome.includes("offset") && nome.includes("90")) next.materiais.offset90 = unitCost;
    if (nome.includes("matte") && nome.includes("220")) next.materiais.matte220 = unitCost;
    if (nome.includes("glossy") && nome.includes("220")) next.materiais.glossy220 = unitCost;
    if (nome.includes("alca") && nome.includes("poliester"))
      next.custoAlca.poliester = unitCost * 2;
    if (nome.includes("gorgurao")) next.custoAlca.gorgurao = unitCost * 0.56;
  }

  return normalizeParams(next);
}

function calcularPrecoTabelaSacola({
  tamanho,
  quantidade,
  cobertura,
  alca,
  materialId,
  params,
}: {
  tamanho?: SacolaSize;
  quantidade: number;
  cobertura: CoberturaId;
  alca: AlcaId;
  materialId: MaterialId;
  params: PricingParams;
}) {
  if (!tamanho || materialId !== "offset180") return null;

  const baseBranca = interpolateTierTotal(SACOLA_SALES_TABLE[tamanho], quantidade);
  const adicionalCor =
    cobertura === "branca" ? 0 : SACOLA_COLOR_ADDITIONAL_PER_UNIT[tamanho] * quantidade;
  const margem = Math.max(params.margemPadrao, params.margemMinima);
  const ajusteAlca =
    ((params.custoAlca[alca] ?? params.custoAlca.poliester) - params.custoAlca.poliester) /
    Math.max(0.01, 1 - margem);
  const ajusteAlcaTotal = ajusteAlca * quantidade;
  const precoTotal = Math.max(0, baseBranca + adicionalCor + ajusteAlcaTotal);

  return {
    precoTotal,
    breakdown: {
      precoTabelaBranca: baseBranca,
      adicionalTabelaCor: adicionalCor,
      ajusteTabelaAlca: ajusteAlcaTotal,
    },
  };
}

function interpolateTierTotal(table: Record<number, number>, quantidade: number) {
  const tiers = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const first = tiers[0];
  const last = tiers[tiers.length - 1];

  if (quantidade <= first) return (table[first] / first) * quantidade;
  if (quantidade >= last) return (table[last] / last) * quantidade;

  const upper = tiers.find((tier) => quantidade <= tier) ?? last;
  const lower = [...tiers].reverse().find((tier) => quantidade >= tier) ?? first;
  if (upper === lower) return table[upper];

  const progress = (quantidade - lower) / (upper - lower);
  return table[lower] + (table[upper] - table[lower]) * progress;
}

export function normalizeParams(raw: Partial<PricingParams>): PricingParams {
  return {
    materiais: {
      ...DEFAULT_PRICING_PARAMS.materiais,
      ...(raw.materiais ?? {}),
    },
    reservaBrancaPorFolha:
      raw.reservaBrancaPorFolha ?? DEFAULT_PRICING_PARAMS.reservaBrancaPorFolha,
    adicionalColoridaPorFolha:
      raw.adicionalColoridaPorFolha ?? DEFAULT_PRICING_PARAMS.adicionalColoridaPorFolha,
    custoAlca: {
      ...DEFAULT_PRICING_PARAMS.custoAlca,
      ...(raw.custoAlca ?? {}),
    },
    margemPadrao: raw.margemPadrao ?? DEFAULT_PRICING_PARAMS.margemPadrao,
    margemMinima: raw.margemMinima ?? DEFAULT_PRICING_PARAMS.margemMinima,
    taxaCriacao: raw.taxaCriacao ?? DEFAULT_PRICING_PARAMS.taxaCriacao,
    taxaUrgenciaPct: raw.taxaUrgenciaPct ?? DEFAULT_PRICING_PARAMS.taxaUrgenciaPct,
    diasSeguranca: raw.diasSeguranca ?? DEFAULT_PRICING_PARAMS.diasSeguranca,
  };
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function vazio(motivo: string): PricingResult {
  return {
    valido: false,
    motivo,
    precoUnitario: 0,
    precoTotal: 0,
    adicionais: [],
    prazoDiasUteis: 0,
    quantidade: 0,
    resumo: "",
  };
}
