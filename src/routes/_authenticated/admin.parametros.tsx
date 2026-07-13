import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/parametros")({
  head: () => ({ meta: [{ title: "Preços — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: ParametrosPage,
});

interface Params {
  materiais: { offset180: number; matte220: number; glossy220: number };
  reservaBrancaPorFolha: number;
  adicionalColoridaPorFolha: number;
  custoAlca: { poliester: number; gorgurao: number; sem: number };
  margemPadrao: number;
  margemMinima: number;
  taxaCriacao: number;
  taxaUrgenciaPct: number;
}

function ParametrosPage() {
  const qc = useQueryClient();
  const [params, setParams] = useState<Params | null>(null);

  const { data } = useQuery({
    queryKey: ["pricing_params"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_params").select("params").eq("id", 1).single();
      if (error) throw error;
      return data.params as unknown as Params;
    },
  });

  useEffect(() => { if (data) setParams(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!params) return;
      const { error } = await supabase.from("pricing_params").update({ params, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing_params"] }),
  });

  if (!params) return <AdminShell title="Preços"><Loader2 className="h-6 w-6 animate-spin text-accent" /></AdminShell>;

  const update = (patch: Partial<Params>) => setParams({ ...params, ...patch });

  return (
    <AdminShell
      title="Parâmetros de preço"
      subtitle="Ajuste custos, margens e taxas — clientes veem apenas o preço final"
      actions={
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-gold">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Custo por folha (R$)">
          <NumberField label="Offset 180g" value={params.materiais.offset180}
            onChange={(v) => update({ materiais: { ...params.materiais, offset180: v } })} />
          <NumberField label="Matte 220g" value={params.materiais.matte220}
            onChange={(v) => update({ materiais: { ...params.materiais, matte220: v } })} />
          <NumberField label="Glossy 220g" value={params.materiais.glossy220}
            onChange={(v) => update({ materiais: { ...params.materiais, glossy220: v } })} />
        </Section>

        <Section title="Custo por alça (R$)">
          <NumberField label="Poliéster" value={params.custoAlca.poliester}
            onChange={(v) => update({ custoAlca: { ...params.custoAlca, poliester: v } })} />
          <NumberField label="Gorgurão" value={params.custoAlca.gorgurao}
            onChange={(v) => update({ custoAlca: { ...params.custoAlca, gorgurao: v } })} />
        </Section>

        <Section title="Operacional">
          <NumberField label="Reserva por folha (R$)" value={params.reservaBrancaPorFolha}
            onChange={(v) => update({ reservaBrancaPorFolha: v })} />
          <NumberField label="Adicional cobertura colorida (R$/folha)" value={params.adicionalColoridaPorFolha}
            onChange={(v) => update({ adicionalColoridaPorFolha: v })} />
        </Section>

        <Section title="Margens & taxas">
          <NumberField label="Margem padrão (0-1)" step={0.01} value={params.margemPadrao}
            onChange={(v) => update({ margemPadrao: v })} />
          <NumberField label="Margem mínima (0-1)" step={0.01} value={params.margemMinima}
            onChange={(v) => update({ margemMinima: v })} />
          <NumberField label="Taxa de criação de arte (R$)" value={params.taxaCriacao}
            onChange={(v) => update({ taxaCriacao: v })} />
          <NumberField label="Taxa de urgência (0-1)" step={0.01} value={params.taxaUrgenciaPct}
            onChange={(v) => update({ taxaUrgenciaPct: v })} />
        </Section>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        * A vitrine usa os valores padrão do código na Fase 1. Salvamento no banco preparado para a Fase 2
        (o motor de preços passará a ler daqui automaticamente).
      </p>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elegant p-5">
      <h3 className="mb-4 font-display text-xl">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 0.001 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent" />
    </div>
  );
}
