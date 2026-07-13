import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calcularPreco, type PricingResult } from "./pricing";

const schema = z.object({
  slug: z.string().min(1),
  quantidade: z.number().int().positive().max(100000),
  materialId: z.enum(["offset180", "matte220", "glossy220"]),
  cobertura: z.enum(["branca", "colorida", "texturizada", "alta"]),
  tamanho: z.enum(["mini", "p", "m", "g"]).optional(),
  alca: z.enum(["poliester", "gorgurao", "sem"]).optional(),
  criacaoArte: z.boolean().optional(),
  urgencia: z.boolean().optional(),
});

export const pricingQuote = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data }): Promise<PricingResult> => {
    // A lógica sensível vive somente no servidor.
    return calcularPreco(data);
  });
