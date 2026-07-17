// Catálogo público da Giga Personalizados.
// Este arquivo pode ser importado por telas do cliente, então não coloque custos,
// margens, capacidade interna ou fórmulas aqui.

export type MaterialId = "offset180" | "matte220" | "glossy220" | "offset90";
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
  { id: "offset90", nome: "Offset 90g" },
];

export const SACOLAS: Sacola[] = [
  { id: "mini", nome: "Mini", medida: "12 x 9 x 4 cm", uso: "Joias e pequenos acessórios" },
  { id: "p", nome: "P", medida: "15 x 14 x 7,5 cm", uso: "Cosméticos e presentes" },
  { id: "m", nome: "M", medida: "22 x 18 x 8 cm", uso: "Roupas e kits" },
  { id: "g", nome: "G", medida: "27 x 20 x 10 cm", uso: "Roupas e itens maiores" },
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

export type ProdutoTipo = "sacola" | "tag" | "cartao" | "caixa";

export interface Produto {
  slug: string;
  nome: string;
  categoria: CategoriaId;
  tipo: ProdutoTipo;
  descricao: string;
  destaque?: boolean;
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
    medida: "4,5 x 7,5 cm",
    descricao:
      "Tags de roupa com furo simples, prontas para amarrar. Papel premium, impressão nítida e acabamento delicado para lançamentos e coleções.",
  },
  {
    slug: "cartao-de-agradecimento",
    nome: "Cartão de agradecimento",
    categoria: "cartoes",
    tipo: "cartao",
    destaque: true,
    medida: "6 x 6 cm",
    descricao:
      "Cartões quadrados de agradecimento que acompanham o pedido. Toque final que encanta o cliente e reforça a sua marca.",
  },
  {
    slug: "tag-para-brincos",
    nome: "Tag para brincos",
    categoria: "tags",
    tipo: "tag",
    medida: "5 x 7 cm",
    descricao:
      "Tag para brincos e semijoias, com cortes e furos simples para apresentar peças pequenas.",
  },
  {
    slug: "tag-para-colar-e-brincos",
    nome: "Tag para colar e brincos",
    categoria: "tags",
    tipo: "tag",
    medida: "7 x 10 cm",
    descricao:
      "Tag maior para conjunto de colar e brincos, ideal para semijoias e kits de presente.",
  },
  {
    slug: "caixa-para-joia-pp",
    nome: "Caixa para joia PP",
    categoria: "caixas",
    tipo: "caixa",
    medida: "6 x 6 x 3 cm",
    descricao:
      "Caixa pequena para joias e semijoias. Modelo inicial com consumo estimado para teste de molde.",
  },
  {
    slug: "caixa-para-conjunto-p",
    nome: "Caixa para conjunto P",
    categoria: "caixas",
    tipo: "caixa",
    medida: "10 x 10 x 3,5 cm",
    descricao:
      "Caixa para conjunto pequeno de semijoias, com montagem manual e custo calculado por folha consumida.",
  },
  {
    slug: "caixa-sacolinha",
    nome: "Caixa sacolinha",
    categoria: "caixas",
    tipo: "caixa",
    medida: "8 x 10 x 4 cm",
    descricao:
      "Caixa estilo sacolinha com alça integrada, indicada para lembranças e presentes pequenos.",
  },
  {
    slug: "caixa-almofada",
    nome: "Caixa almofada",
    categoria: "caixas",
    tipo: "caixa",
    medida: "10 x 7 x 3 cm",
    descricao:
      "Caixa almofada de montagem rápida para joias, semijoias e pequenos acessórios.",
  },
  {
    slug: "cartao-de-visita",
    nome: "Cartão de visita",
    categoria: "cartoes",
    tipo: "cartao",
    medida: "9 x 5 cm",
    descricao:
      "Cartão de visita no tamanho padrão brasileiro, com rendimento inicial de 10 unidades por folha A4.",
  },
  {
    slug: "santinho-politico",
    nome: "Santinho político",
    categoria: "cartoes",
    tipo: "cartao",
    medida: "7 x 10 cm",
    descricao:
      "Santinho político para pequenos lotes internos, com base em Offset 90g e opção frente e verso.",
  },
];

export function getProdutoBySlug(slug: string): Produto | undefined {
  return PRODUTOS.find((p) => p.slug === slug);
}

export function getCategoriaById(id: CategoriaId): Categoria | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}
