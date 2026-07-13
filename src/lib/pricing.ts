// Motor de precificação Giga — usado no servidor.
// Recebe uma configuração pública e devolve APENAS valores comerciais.
// Custo, margem e memória interna nunca saem daqui para o cliente.

import {
  ADICIONAL_COLORIDA_POR_FOLHA,
  CUSTO_ALCA,
  MARGEM_PADRAO,
  MATERIAIS,
  PRODUTOS,
  RESERVA_BRANCA_POR_FOLHA,
  SACOLAS,
  getProdutoBySlug,
  type AlcaId,
  type CoberturaId,
  type MaterialId,
  type SacolaSize,
} from "@/data/catalog";

export interface PricingInput {
  slug: string;
  quantidade: number;
  materialId: MaterialId;
  cobertura: CoberturaId;
  tamanho?: SacolaSize;      // sacolas
  alca?: AlcaId;             // sacolas
  criacaoArte?: boolean;
  urgencia?: boolean;
}

// Saída pública — nunca inclui custo/margem/lucro.
export interface PricingResult {
  valido: boolean;
  motivo?: string;
  precoUnitario: number;
  precoTotal: number;
  adicionais: { nome: string; valor: number }[];
  prazoDiasUteis: number;
  quantidade: number;
  resumo: string; // texto pronto p/ WhatsApp
}

const TAXA_CRIACAO = 60;   // R$ fixo quando cliente pede criação de arte
const TAXA_URGENCIA_PCT = 0.20;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calcularPreco(input: PricingInput): PricingResult {
  const produto = getProdutoBySlug(input.slug);
  if (!produto) {
    return vazio("Produto não encontrado");
  }
  const quantidade = Math.max(1, Math.floor(input.quantidade || 0));
  if (!quantidade) return vazio("Informe a quantidade");

  const material = MATERIAIS.find((m) => m.id === input.materialId);
  if (!material) return vazio("Selecione um material válido");

  const adicionaisPublicos: { nome: string; valor: number }[] = [];
  let custoUnitario = 0;
  let capacidadeDia = 20;
  let setupDias = 1;
  const impressaoColorida =
    input.cobertura === "colorida" ||
    input.cobertura === "texturizada" ||
    input.cobertura === "alta";

  if (produto.tipo === "sacola") {
    const sac = SACOLAS.find((s) => s.id === input.tamanho);
    if (!sac) return vazio("Selecione um tamanho");
    const papel = material.custoPorFolha * sac.folhas;
    const reserva = RESERVA_BRANCA_POR_FOLHA * sac.folhas;
    const adicionalCor = impressaoColorida ? ADICIONAL_COLORIDA_POR_FOLHA * sac.folhas : 0;
    const alca = CUSTO_ALCA[input.alca ?? "poliester"];
    custoUnitario = papel + reserva + adicionalCor + alca;
    capacidadeDia = sac.capacidadeDia;
    setupDias = 2;
  } else {
    // tag / cartão
    const unidadesPorFolha = produto.unidadesPorFolha ?? 12;
    const papel = material.custoPorFolha / unidadesPorFolha;
    const reserva = RESERVA_BRANCA_POR_FOLHA / unidadesPorFolha;
    const adicionalCor = impressaoColorida ? ADICIONAL_COLORIDA_POR_FOLHA / unidadesPorFolha : 0;
    const acabamento = produto.acabamentoPorUnidade ?? 0;
    custoUnitario = papel + reserva + adicionalCor + acabamento;
    capacidadeDia = produto.capacidadeDia ?? 120;
    setupDias = 1;
  }

  const custoProducao = custoUnitario * quantidade;
  let custosExtras = 0;
  if (input.criacaoArte) {
    custosExtras += TAXA_CRIACAO;
    adicionaisPublicos.push({ nome: "Criação de arte", valor: TAXA_CRIACAO });
  }

  const custoTotal = custoProducao + custosExtras;
  const margem = MARGEM_PADRAO;
  let precoTotal = custoTotal / (1 - margem);

  if (input.urgencia) {
    const taxa = precoTotal * TAXA_URGENCIA_PCT;
    adicionaisPublicos.push({ nome: "Urgência", valor: round2(taxa) });
    precoTotal += taxa;
  }

  // Arredondamento comercial: sobe para múltiplos de R$ 5 quando > 100
  if (precoTotal > 100) {
    precoTotal = Math.ceil(precoTotal / 5) * 5;
  } else {
    precoTotal = round2(precoTotal);
  }

  const precoUnitario = round2(precoTotal / quantidade);

  // Prazo
  const diasProducao = Math.ceil(quantidade / capacidadeDia);
  const diasSeguranca = 2;
  let prazo = diasProducao + setupDias + diasSeguranca;
  if (input.urgencia) prazo = Math.max(3, Math.ceil(prazo * 0.6));

  const linhas = [
    `${quantidade} × ${produto.nome}`,
    `Material: ${material.nome}`,
    produto.tipo === "sacola"
      ? `Tamanho: ${SACOLAS.find((s) => s.id === input.tamanho)?.nome}`
      : `Medida: ${produto.medida}`,
    `Cobertura: ${labelCobertura(input.cobertura)}`,
    produto.tipo === "sacola" ? `Alça: ${labelAlca(input.alca ?? "poliester")}` : null,
    `Valor unitário estimado: R$ ${precoUnitario.toFixed(2).replace(".", ",")}`,
    `Valor total estimado: R$ ${precoTotal.toFixed(2).replace(".", ",")}`,
  ].filter(Boolean) as string[];

  return {
    valido: true,
    quantidade,
    precoUnitario,
    precoTotal: round2(precoTotal),
    adicionais: adicionaisPublicos,
    prazoDiasUteis: prazo,
    resumo: linhas.join("\n"),
  };
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

export function labelCobertura(c: CoberturaId): string {
  return {
    branca: "Fundo branco com logo",
    colorida: "Colorida",
    texturizada: "Texturizada",
    alta: "Alta cobertura",
  }[c];
}

export function labelAlca(a: AlcaId): string {
  return { poliester: "Poliéster", gorgurao: "Gorgurão", sem: "Sem alça" }[a];
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const OPCOES_COBERTURA: { id: CoberturaId; nome: string; hint: string }[] = [
  { id: "branca",     nome: "Fundo branco com logo", hint: "Apenas sua logo aplicada" },
  { id: "colorida",   nome: "Colorida",              hint: "Arte com cores por toda a peça" },
  { id: "texturizada",nome: "Texturizada",           hint: "Fundos com padrões ou texturas" },
  { id: "alta",       nome: "Alta cobertura",        hint: "Fundo cheio e alta saturação" },
];
