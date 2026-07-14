import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/giga-logo.asset.json";
import { SITE } from "@/lib/site-config";
import { looseSupabase as db } from "@/lib/supabase-loose";

interface SiteBrandConfig {
  nome: string;
  whatsapp: string;
  instagram: string | null;
  email: string | null;
  cidade: string | null;
  logo_url: string | null;
}

export function useSiteBrandConfig() {
  const { data } = useQuery({
    queryKey: ["site_config", "brand"],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_config")
        .select("nome, whatsapp, instagram, email, cidade, logo_url")
        .eq("id", 1)
        .maybeSingle();

      if (error) return null;
      return data as SiteBrandConfig | null;
    },
    staleTime: 30_000,
  });

  return {
    nome: data?.nome || SITE.nome,
    whatsapp: data?.whatsapp || SITE.whatsappNumero,
    instagram: data?.instagram || SITE.instagram,
    email: data?.email || SITE.email,
    cidade: data?.cidade || SITE.cidade,
    logoUrl: data?.logo_url || logo.url,
  };
}
