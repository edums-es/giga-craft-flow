// Catálogo e parâmetros de preço da Giga Personalizados.
// Valores iniciais importados da planilha oficial (Fase 1 — editáveis no painel na Fase 2).
// Custos, margens, reservas: NUNCA expor ao cliente.

export type MaterialId = "offset180" | "matte220" | "glossy220";
export type CoberturaId = "branca" | "colorida" | "texturizada" | "alta";
export type AlcaId = "poliester" | "gorgurao" | "sem";
export type SacolaSize = "mini" | "p" | "m" | "g";

export interface Material {
  id: MaterialId;
  nome: string;
  custoPorFolha: number; // interno
}

export interface Sacola {
  id: SacolaSize;
  nome: string;
  medida: string;
  folhas: number;         // A4
  capacidadeDia: number;  // unidades/dia
  uso: string;
}

export const MATERIAIS: Material[] = [
  { id: "offset180", nome: "Offset 180g",  custoPorFolha: 0.274 },
  { id: "matte220",  nome: "Matte 220g",   custoPorFolha: 0.5001 },
  { id: "glossy220", nome: "Glossy 220g",  custoPorFolha: 0.6406 },
];

export const SACOLAS: Sacola[] = [
  { id: "mini", nome: "Mini", medida: "12 × 9 × 4 cm",    folhas: 1, capacidadeDia: 30, uso: "Joias e pequenos acessórios" },
  { id: "p",    nome: "P",    medida: "15 × 14 × 7,5 cm", folhas: 2, capacidadeDia: 20, uso: "Cosméticos e presentes" },
  { id: "m",    nome: "M",    medida: "22 × 18 × 8 cm",   folhas: 4, capacidadeDia: 12, uso: "Roupas e kits" },
  { id: "g",    nome: "G",    medida: "27 × 20 × 10 cm",  folhas: 5, capacidadeDia: 8,  uso: "Roupas e itens maiores" },
];

// Parâmetros internos (planilha Giga)
export const RESERVA_BRANCA_POR_FOLHA = 0.15;
export const ADICIONAL_COLORIDA_POR_FOLHA = 0.20;
export const CUSTO_ALCA: Record<AlcaId, number> = {
  poliester: 0.68,
  gorgurao: 0.70,
  sem: 0,
};

// Margens (internas)
export const MARGEM_PADRAO = 0.65;
export const MARGEM_MINIMA = 0.45;

export const QUANTIDADES_PADRAO = [25, 50, 100, 250, 500];

export type CategoriaId = "sacolas" | "tags" | "cartoes" | "caixas" | "adesivos" | "embalagens" | "kits";

export interface Categoria {
  id: CategoriaId;
  nome: string;
  descricao: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: "sacolas",  nome: "Sacolas",              descricao: "Sacolas personalizadas em quatro tamanhos" },
  { id: "tags",     nome: "Tags",                 descricao: "Tags de roupa e etiquetas de marca" },
  { id: "cartoes",  nome: "Cartões",              descricao: "Cartões de agradecimento e visita" },
  { id: "caixas",   nome: "Caixas",               descricao: "Caixas rígidas e presente" },
  { id: "embalagens", nome: "Embalagens",         descricao: "Papéis kraft, laminados e sob medida" },
  { id: "adesivos", nome: "Adesivos",             descricao: "Adesivos recortados e em bobina" },
  { id: "kits",     nome: "Kits personalizados",  descricao: "Combinações prontas para marcas" },
];

export type ProdutoTipo = "sacola" | "tag" | "cartao";

export interface Produto {
  slug: string;
  nome: string;
  categoria: CategoriaId;
  tipo: ProdutoTipo;
  descricao: string;
  destaque?: boolean;
  // Para tags/cartões, dados fixos
  medida?: string;
  unidadesPorFolha?: number;
  acabamentoPorUnidade?: number; // interno
  capacidadeDia?: number;
}

export const PRODUTOS: Produto[] = [
  {
    slug: "sacola-personalizada",
    nome: "Sacola personalizada",
    categoria: "sacolas",
    tipo: "sacola",
    destaque: true,
    descricao:
      "Sacolas em papel premium com sua marca aplicada. Quatro tamanhos padronizados, três materiais e opções de alça. Fundo branco com logo ou arte colorida cobrindo toda a peça.",
  },
  {
    slug: "tag-de-roupa",
    nome: "Tag de roupa",
    categoria: "tags",
    tipo: "tag",
    destaque: true,
    medida: "4,5 × 7,5 cm",
    unidadesPorFolha: 12,
    acabamentoPorUnidade: 0.03,
    capacidadeDia: 120,
    descricao:
      "Tags de roupa com furo simples, prontas para amarrar. Papel premium, impressão nítida e acabamento delicado — perfeito para lançamentos e coleções.",
  },
  {
    slug: "cartao-de-agradecimento",
    nome: "Cartão de agradecimento",
    categoria: "cartoes",
    tipo: "cartao",
    destaque: true,
    medida: "6 × 6 cm",
    unidadesPorFolha: 12,
    acabamentoPorUnidade: 0,
    capacidadeDia: 150,
    descricao:
      "Cartões quadrados de agradecimento que acompanham o pedido. Toque final que encanta o cliente e reforça a sua marca.",
  },
];

export function getProdutoBySlug(slug: string): Produto | undefined {
  return PRODUTOS.find((p) => p.slug === slug);
}

export function getCategoriaById(id: CategoriaId): Categoria | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}
