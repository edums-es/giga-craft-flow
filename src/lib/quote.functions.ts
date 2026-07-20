import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProdutoBySlug } from "@/data/catalog";
import { calcularPrecoComSnapshot } from "./pricing.engine";
import type { PricingInput } from "./pricing.shared";

const pricingInputSchema = z.object({
  slug: z.string().min(1),
  quantidade: z.number().int().positive().max(100000),
  materialId: z.enum(["offset180", "matte220", "glossy220", "offset90"]),
  cobertura: z.enum(["branca", "colorida", "texturizada", "alta"]),
  tamanho: z.enum(["mini", "p", "m", "g"]).optional(),
  alca: z.enum(["poliester", "gorgurao", "sem"]).optional(),
  impressao: z.enum(["frente", "frente_verso"]).optional(),
  criacaoArte: z.boolean().optional(),
  urgencia: z.boolean().optional(),
});

const submitQuoteSchema = z.object({
  cliente: z.object({
    nome: z.string().trim().min(2).max(100),
    whatsapp: z.string().trim().min(8).max(30),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    empresa: z.string().trim().max(100).optional(),
    cidade: z.string().trim().max(80).optional(),
    observacao: z.string().trim().max(500).optional(),
  }),
  items: z
    .array(
      z.object({
        config: pricingInputSchema,
        observacao: z.string().trim().max(500).optional(),
      }),
    )
    .min(1)
    .max(30),
});

export interface SubmittedQuoteItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
  prazoDiasUteis: number;
  resumo: string;
  observacao?: string;
}

export interface SubmittedQuote {
  id: string;
  codigo: string;
  total: number;
  prazoDias: number;
  items: SubmittedQuoteItem[];
}

export const submitQuote = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => submitQuoteSchema.parse(raw))
  .handler(async ({ data }): Promise<SubmittedQuote> => {
    const { db, hasServiceRole } = await createServerDbClient();
    const admin = db as unknown as {
      from: (table: string) => {
        insert: (payload: unknown) => {
          select: (columns: string) => {
            single: () => Promise<{
              data: { id: string; codigo: string } | null;
              error: Error | null;
            }>;
          };
        } & PromiseLike<{ error: Error | null }>;
      };
    };

    const computedItems = await Promise.all(
      data.items.map(async (item) => {
        const produto = getProdutoBySlug(item.config.slug);
        const computation = await calcularPrecoComSnapshot(item.config as PricingInput);
        if (!produto || !computation.publicResult.valido || !computation.internalSnapshot) {
          throw new Error(computation.publicResult.motivo ?? "Item inválido");
        }

        return {
          produto,
          observacao: item.observacao,
          publicResult: computation.publicResult,
          internalSnapshot: computation.internalSnapshot,
        };
      }),
    );

    const total = round2(
      computedItems.reduce((acc, item) => acc + item.publicResult.precoTotal, 0),
    );
    const prazoDias = computedItems.reduce(
      (acc, item) => Math.max(acc, item.publicResult.prazoDiasUteis),
      0,
    );
    const codigo = await nextQuoteCode();
    const cliente = data.cliente;
    const customerSnapshot = {
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      email: cliente.email || null,
      empresa: cliente.empresa || null,
      cidade: cliente.cidade || null,
    };

    const { data: quote, error } = await admin
      .from("quotes")
      .insert({
        codigo,
        cliente_nome: cliente.nome,
        cliente_whatsapp: cliente.whatsapp,
        cliente_email: cliente.email || null,
        cliente_empresa: cliente.empresa || null,
        cliente_cidade: cliente.cidade || null,
        observacao: cliente.observacao || null,
        items: computedItems.map((item) => toPublicItem(item)),
        total,
        prazo_dias: prazoDias,
        validade_em: addDays(new Date(), 7).toISOString().slice(0, 10),
        customer_snapshot: customerSnapshot,
        pricing_snapshot: {
          formulaVersion: "giga-pricing-v2",
          items: computedItems.map((item) => item.internalSnapshot),
        },
      })
      .select("id, codigo")
      .single();

    if (error || !quote) throw error ?? new Error("Não foi possível salvar o orçamento");

    const quoteItems = computedItems.map((item) => ({
      quote_id: quote.id,
      product_slug: item.produto.slug,
      product_nome: item.produto.nome,
      quantidade: item.publicResult.quantidade,
      preco_unitario: item.publicResult.precoUnitario,
      preco_total: item.publicResult.precoTotal,
      prazo_dias: item.publicResult.prazoDiasUteis,
      public_snapshot: toPublicItem(item),
      internal_pricing_snapshot: item.internalSnapshot,
      observacao: item.observacao || null,
    }));

    if (hasServiceRole) {
      const { error: itemsError } = await admin.from("quote_items").insert(quoteItems);
      if (itemsError) throw itemsError;
    }

    return {
      id: quote.id,
      codigo: quote.codigo,
      total,
      prazoDias,
      items: computedItems.map((item) => toPublicItem(item)),
    };
  });

function toPublicItem(item: {
  produto: { nome: string };
  observacao?: string;
  publicResult: {
    quantidade: number;
    precoUnitario: number;
    precoTotal: number;
    prazoDiasUteis: number;
    resumo: string;
  };
}): SubmittedQuoteItem {
  return {
    nome: item.produto.nome,
    quantidade: item.publicResult.quantidade,
    precoUnitario: item.publicResult.precoUnitario,
    precoTotal: item.publicResult.precoTotal,
    prazoDiasUteis: item.publicResult.prazoDiasUteis,
    resumo: item.publicResult.resumo,
    observacao: item.observacao || undefined,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function nextQuoteCode() {
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `GIGA-${suffix}`;
}

async function createServerDbClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const key = serviceRoleKey ?? publishableKey;

  if (!url || !key) {
    throw new Error("Supabase não está configurado no servidor.");
  }

  return {
    db: createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    hasServiceRole: Boolean(serviceRoleKey),
  };
}
