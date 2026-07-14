import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aplicarCustosDeInsumos,
  calcularPrecoComParametros,
  normalizeParams,
  type PricingComputation,
  type PricingParams,
  type SupplyCostSnapshot,
} from "./pricing.engine";

const customProductSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  tipo: z.enum(["sacola", "tag", "cartao", "caixa", "outro"]),
  medida: z.string().trim().min(1).max(120),
  modoConsumo: z.enum(["folhas_por_unidade", "unidades_por_folha"]),
  fator: z.number().positive().max(1000),
  acabamentoPorUnidade: z.number().min(0).max(10000),
  capacidadeDia: z.number().int().positive().max(100000),
  setupDias: z.number().int().min(0).max(365),
  usarAlca: z.boolean().optional(),
});

const schema = z.object({
  slug: z.string().min(1),
  quantidade: z.number().int().positive().max(100000),
  materialId: z.enum(["offset180", "matte220", "glossy220"]),
  cobertura: z.enum(["branca", "colorida", "texturizada", "alta"]),
  tamanho: z.enum(["mini", "p", "m", "g"]).optional(),
  alca: z.enum(["poliester", "gorgurao", "sem"]).optional(),
  impressao: z.enum(["frente", "frente_verso"]).optional(),
  modoPreco: z.enum(["tabela_venda", "calculadora_planilha"]).optional(),
  personalizado: customProductSchema.optional(),
  criacaoArte: z.boolean().optional(),
  urgencia: z.boolean().optional(),
});

type SupabaseForParams = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: unknown,
      ) => {
        single: () => Promise<{
          data: { params: Partial<PricingParams> } | null;
          error: Error | null;
        }>;
      };
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<{
        data: SupplyCostSnapshot[] | null;
        error: Error | null;
      }>;
    };
  };
};

export const adminPricingQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data, context }): Promise<PricingComputation> => {
    const supabase = (context as { supabase: SupabaseForParams }).supabase;
    const { data: row } = await supabase
      .from("pricing_params")
      .select("params")
      .eq("id", 1)
      .single();
    const { data: supplies } = await supabase
      .from("supplies")
      .select("nome, custo_medio, ultimo_custo")
      .order("nome", { ascending: true });
    const params = aplicarCustosDeInsumos(normalizeParams(row?.params ?? {}), supplies ?? []);
    return calcularPrecoComParametros(data, params);
  });
