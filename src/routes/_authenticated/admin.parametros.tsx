import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { readableError } from "@/lib/readable-error";

export const Route = createFileRoute("/_authenticated/admin/parametros")({
  head: () => ({
    meta: [{ title: "Precos - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: ParametrosPage,
});

interface Params {
  materiais: { offset180: number; matte220: number; glossy220: number; offset90: number };
  reservaBrancaPorFolha: number;
  adicionalColoridaPorFolha: number;
  custoAlca: { poliester: number; gorgurao: number; sem: number };
  margemPadrao: number;
  margemMinima: number;
  taxaCriacao: number;
  taxaUrgenciaPct: number;
  diasSeguranca: number;
}

const defaultParams: Params = {
  materiais: { offset180: 0.274, matte220: 0.5001, glossy220: 0.6406, offset90: 0.1204 },
  reservaBrancaPorFolha: 0.15,
  adicionalColoridaPorFolha: 0.2,
  custoAlca: { poliester: 0.68, gorgurao: 0.7, sem: 0 },
  margemPadrao: 0.65,
  margemMinima: 0.45,
  taxaCriacao: 20,
  taxaUrgenciaPct: 0.2,
  diasSeguranca: 2,
};

function ParametrosPage() {
  const qc = useQueryClient();
  const [params, setParams] = useState<Params | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: ["pricing_params"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_params")
        .select("params")
        .eq("id", 1)
        .single();
      if (error) throw error;
      const raw = data.params as unknown as Partial<Params>;
      return {
        ...defaultParams,
        ...raw,
        materiais: { ...defaultParams.materiais, ...(raw.materiais ?? {}) },
        custoAlca: { ...defaultParams.custoAlca, ...(raw.custoAlca ?? {}) },
      };
    },
  });

  useEffect(() => {
    if (data) setParams(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!params) return;
      const { error } = await supabase
        .from("pricing_params")
        .update({ params: params as unknown as never, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing_params"] }),
  });

  if (isLoading || (!params && !error)) {
    return (
      <AdminShell title="Precos">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </AdminShell>
    );
  }

  if (error || !params) {
    return (
      <AdminShell title="Precos">
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Nao consegui carregar os parametros de preco. Tente sair e entrar de novo no painel.
          <p className="mt-2 text-xs opacity-80">{readableError(error)}</p>
        </div>
      </AdminShell>
    );
  }

  const update = (patch: Partial<Params>) => setParams({ ...params, ...patch });

  return (
    <AdminShell
      title="Parametros de preco"
      subtitle="Ajuste custos, margens e taxas. Clientes veem apenas o preco final."
      actions={
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-gold">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Custo por folha (R$)">
          <NumberField
            label="Offset 180g"
            value={params.materiais.offset180}
            onChange={(v) => update({ materiais: { ...params.materiais, offset180: v } })}
          />
          <NumberField
            label="Matte 220g"
            value={params.materiais.matte220}
            onChange={(v) => update({ materiais: { ...params.materiais, matte220: v } })}
          />
          <NumberField
            label="Glossy 220g"
            value={params.materiais.glossy220}
            onChange={(v) => update({ materiais: { ...params.materiais, glossy220: v } })}
          />
          <NumberField
            label="Offset 90g"
            value={params.materiais.offset90}
            onChange={(v) => update({ materiais: { ...params.materiais, offset90: v } })}
          />
        </Section>

        <Section title="Custo por alca (R$)">
          <NumberField
            label="Poliester"
            value={params.custoAlca.poliester}
            onChange={(v) => update({ custoAlca: { ...params.custoAlca, poliester: v } })}
          />
          <NumberField
            label="Gorgurao"
            value={params.custoAlca.gorgurao}
            onChange={(v) => update({ custoAlca: { ...params.custoAlca, gorgurao: v } })}
          />
        </Section>

        <Section title="Operacional">
          <NumberField
            label="Reserva por folha (R$)"
            value={params.reservaBrancaPorFolha}
            onChange={(v) => update({ reservaBrancaPorFolha: v })}
          />
          <NumberField
            label="Adicional cobertura colorida (R$/folha)"
            value={params.adicionalColoridaPorFolha}
            onChange={(v) => update({ adicionalColoridaPorFolha: v })}
          />
        </Section>

        <Section title="Margens e taxas">
          <NumberField
            label="Margem padrao (0-1)"
            step={0.01}
            value={params.margemPadrao}
            onChange={(v) => update({ margemPadrao: v })}
          />
          <NumberField
            label="Margem minima (0-1)"
            step={0.01}
            value={params.margemMinima}
            onChange={(v) => update({ margemMinima: v })}
          />
          <NumberField
            label="Taxa de criacao de arte (R$)"
            value={params.taxaCriacao}
            onChange={(v) => update({ taxaCriacao: v })}
          />
          <NumberField
            label="Taxa de urgencia (0-1)"
            step={0.01}
            value={params.taxaUrgenciaPct}
            onChange={(v) => update({ taxaUrgenciaPct: v })}
          />
          <NumberField
            label="Dias de seguranca"
            step={1}
            value={params.diasSeguranca}
            onChange={(v) => update({ diasSeguranca: v })}
          />
        </Section>
      </div>

      {save.error && (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {readableError(save.error, "Nao foi possivel salvar.")}
        </p>
      )}
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

function NumberField({
  label,
  value,
  onChange,
  step = 0.001,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
