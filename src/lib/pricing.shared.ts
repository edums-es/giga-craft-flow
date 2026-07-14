import type { AlcaId, CoberturaId, MaterialId, SacolaSize } from "@/data/catalog";

export const CUSTOM_PRODUCT_SLUG = "produto-personalizado";

export type CustomProductType = "sacola" | "tag" | "cartao" | "caixa" | "outro";
export type CustomConsumptionMode = "folhas_por_unidade" | "unidades_por_folha";
export type PrintMode = "frente" | "frente_verso";
export type PricingMode = "tabela_venda" | "calculadora_planilha";

export interface CustomPricingProduct {
  nome: string;
  tipo: CustomProductType;
  medida: string;
  modoConsumo: CustomConsumptionMode;
  fator: number;
  acabamentoPorUnidade: number;
  capacidadeDia: number;
  setupDias: number;
  usarAlca?: boolean;
}

export interface PricingInput {
  slug: string;
  quantidade: number;
  materialId: MaterialId;
  cobertura: CoberturaId;
  tamanho?: SacolaSize;
  alca?: AlcaId;
  impressao?: PrintMode;
  modoPreco?: PricingMode;
  personalizado?: CustomPricingProduct;
  criacaoArte?: boolean;
  urgencia?: boolean;
}

// Saída pública: nunca inclui custo, margem, lucro ou memória de cálculo interna.
export interface PricingResult {
  valido: boolean;
  motivo?: string;
  precoUnitario: number;
  precoTotal: number;
  adicionais: { nome: string; valor: number }[];
  prazoDiasUteis: number;
  quantidade: number;
  resumo: string;
}

export const OPCOES_COBERTURA: { id: CoberturaId; nome: string; hint: string }[] = [
  { id: "branca", nome: "Fundo branco com logo", hint: "Apenas sua logo aplicada" },
  { id: "colorida", nome: "Colorida", hint: "Arte com cores por toda a peça" },
  { id: "texturizada", nome: "Texturizada", hint: "Fundos com padrões ou texturas" },
  { id: "alta", nome: "Alta cobertura", hint: "Fundo cheio e alta saturação" },
];

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
