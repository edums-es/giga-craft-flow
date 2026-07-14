// Catálogo público da Giga Personalizados.
// Este arquivo pode ser importado por telas do cliente, então não coloque custos,
// margens, capacidade interna ou fórmulas aqui.

export type MaterialId = "offset180" | "matte220" | "glossy220";
export type CoberturaId = "branca" | "colorida" | "texturizada" | "alta";
export type AlcaId = "poliester" | "gorgurao" | "sem";
export type SacolaSize = "mini" | "p" | "m" | "g";

export interface Material {
  id: MaterialId;
  nome: string;
}

export interface Sacola {
  id: SacolaSize;
  nome: string;
  medida: string;
  uso: string;
}

export const MATERIAIS: Material[] = [
  { id: "offset180", nome: "Offset 180g" },
  { id: "matte220", nome: "Matte 220g" },
  { id: "glossy220", nome: "Glossy 220g" },
];

export const SACOLAS: Sacola[] = [
  { id: "mini", nome: "Mini", medida: "12 × 9 × 4 cm", uso: "Joias e pequenos acessórios" },
  { id: "p", nome: "P", medida: "15 × 14 × 7,5 cm", uso: "Cosméticos e presentes" },
  { id: "m", nome: "M", medida: "22 × 18 × 8 cm", uso: "Roupas e kits" },
  { id: "g", nome: "G", medida: "27 × 20 × 10 cm", uso: "Roupas e itens maiores" },
];

export const QUANTIDADES_PADRAO = [25, 50, 100, 250, 500];

export type CategoriaId =
  "sacolas" | "tags" | "cartoes" | "caixas" | "adesivos" | "embalagens" | "kits";

export interface Categoria {
  id: CategoriaId;
  nome: string;
  descricao: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: "sacolas", nome: "Sacolas", descricao: "Sacolas personalizadas em quatro tamanhos" },
  { id: "tags", nome: "Tags", descricao: "Tags de roupa e etiquetas de marca" },
  { id: "cartoes", nome: "Cartões", descricao: "Cartões de agradecimento e visita" },
  { id: "caixas", nome: "Caixas", descricao: "Caixas rígidas e presente" },
  { id: "embalagens", nome: "Embalagens", descricao: "Papéis kraft, laminados e sob medida" },
  { id: "adesivos", nome: "Adesivos", descricao: "Adesivos recortados e em bobina" },
  { id: "kits", nome: "Kits personalizados", descricao: "Combinações prontas para marcas" },
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
