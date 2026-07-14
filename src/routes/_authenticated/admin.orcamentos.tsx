import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Eye, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/pricing";
import { readableError } from "@/lib/readable-error";
import { looseSupabase as db } from "@/lib/supabase-loose";
import { StatusBadge } from "@/routes/_authenticated/admin.index";

export const Route = createFileRoute("/_authenticated/admin/orcamentos")({
  head: () => ({
    meta: [{ title: "Orcamentos - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: OrcamentosPage,
});

interface QuoteItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
  resumo: string;
  observacao?: string;
}

interface Quote {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_email: string | null;
  cliente_empresa: string | null;
  cliente_cidade: string | null;
  observacao: string | null;
  total: number;
  prazo_dias: number;
  status: string;
  items: QuoteItem[];
  created_at: string;
}

function OrcamentosPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/admin/orcamentos") return <Outlet />;
  return <OrcamentosList />;
}

function OrcamentosList() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("todos");
  const [opened, setOpened] = useState<Quote | null>(null);

  const {
    data: quotes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await db
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAdminData(qc),
  });

  const convertToOrder = useMutation({
    mutationFn: async (quote: Quote) => {
      const converted = { ...quote, status: "convertido" };
      const { error } = await db.from("quotes").update({ status: "convertido" }).eq("id", quote.id);
      if (error) throw error;
      await ensureConvertedRecords(converted);
    },
    onSuccess: () => invalidateAdminData(qc),
  });

  const saveQuoteDetails = useMutation({
    mutationFn: async (quote: Quote) => {
      const payload = {
        cliente_nome: quote.cliente_nome.trim(),
        cliente_whatsapp: quote.cliente_whatsapp.trim(),
        cliente_email: quote.cliente_email?.trim() || null,
        cliente_empresa: quote.cliente_empresa?.trim() || null,
        cliente_cidade: quote.cliente_cidade?.trim() || null,
        observacao: quote.observacao?.trim() || null,
        total: Number(quote.total || 0),
        prazo_dias: Math.max(0, Math.floor(Number(quote.prazo_dias || 0))),
        status: quote.status,
        customer_snapshot: {
          nome: quote.cliente_nome.trim(),
          whatsapp: quote.cliente_whatsapp.trim(),
          email: quote.cliente_email?.trim() || null,
          empresa: quote.cliente_empresa?.trim() || null,
          cidade: quote.cliente_cidade?.trim() || null,
        },
      };

      const { error } = await db.from("quotes").update(payload).eq("id", quote.id);
      if (error) throw error;

      if (payload.status === "convertido") {
        await ensureConvertedRecords({ ...quote, ...payload });
      }
    },
    onSuccess: () => {
      invalidateAdminData(qc);
      setOpened(null);
    },
  });

  const filtered = filter === "todos" ? quotes : quotes.filter((quote) => quote.status === filter);

  return (
    <AdminShell
      title="Orcamentos"
      subtitle="Gerencie orcamentos recebidos pela vitrine"
      actions={
        <Link to="/admin/orcamentos/novo" className="btn-gold">
          <Plus className="h-4 w-4" />
          Novo orcamento
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["todos", "novo", "em_negociacao", "aprovado", "recusado", "convertido"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === status
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {status === "todos" ? "Todos" : status.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Codigo</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">WhatsApp</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-destructive">
                    Nao consegui carregar os orcamentos. {readableError(error)}
                  </td>
                </tr>
              )}
              {!isLoading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Nenhum orcamento.
                  </td>
                </tr>
              )}
              {filtered.map((quote) => (
                <tr key={quote.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">#{quote.codigo}</td>
                  <td className="px-4 py-3">{quote.cliente_nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{quote.cliente_whatsapp}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatBRL(Number(quote.total))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(quote.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setOpened({ ...quote })}
                        className="rounded p-1.5 hover:bg-secondary"
                        title="Ver e editar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `/admin/orcamentos/${quote.id}/imprimir`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="rounded p-1.5 hover:bg-secondary"
                        title="Abrir proposta para PDF"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove.mutate(quote.id)}
                        className="rounded p-1.5 text-destructive hover:bg-secondary"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {opened && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          onClick={() => setOpened(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="card-elegant max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-accent">Orcamento</p>
                <h2 className="text-2xl font-semibold">#{opened.codigo}</h2>
              </div>
              <button onClick={() => setOpened(null)} className="rounded p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <EditField
                label="Cliente"
                value={opened.cliente_nome}
                onChange={(value) => setOpened({ ...opened, cliente_nome: value })}
              />
              <EditField
                label="WhatsApp"
                value={opened.cliente_whatsapp}
                onChange={(value) => setOpened({ ...opened, cliente_whatsapp: value })}
              />
              <EditField
                label="E-mail"
                value={opened.cliente_email ?? ""}
                onChange={(value) => setOpened({ ...opened, cliente_email: value })}
              />
              <EditField
                label="Empresa"
                value={opened.cliente_empresa ?? ""}
                onChange={(value) => setOpened({ ...opened, cliente_empresa: value })}
              />
              <EditField
                label="Cidade"
                value={opened.cliente_cidade ?? ""}
                onChange={(value) => setOpened({ ...opened, cliente_cidade: value })}
              />
              <EditField
                type="number"
                label="Prazo em dias uteis"
                value={String(opened.prazo_dias ?? 0)}
                onChange={(value) => setOpened({ ...opened, prazo_dias: Number(value || 0) })}
              />
              <EditField
                type="number"
                step="0.01"
                label="Total"
                value={String(opened.total ?? 0)}
                onChange={(value) => setOpened({ ...opened, total: Number(value || 0) })}
              />
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Status
                </span>
                <select
                  value={opened.status}
                  onChange={(event) => setOpened({ ...opened, status: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="novo">Novo</option>
                  <option value="em_negociacao">Em negociacao</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="recusado">Recusado</option>
                  <option value="convertido">Convertido</option>
                </select>
              </label>
            </div>

            <div className="mt-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Observacao
              </label>
              <textarea
                rows={3}
                value={opened.observacao ?? ""}
                onChange={(event) => setOpened({ ...opened, observacao: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Itens</p>
              {(opened.items ?? []).map((item, index) => (
                <div key={index} className="rounded-xl border border-border/60 p-3">
                  <div className="flex justify-between gap-4">
                    <p className="font-medium">{item.nome}</p>
                    <p className="text-accent">{formatBRL(Number(item.precoTotal || 0))}</p>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {item.resumo}
                  </pre>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-semibold text-accent">
                {formatBRL(Number(opened.total || 0))}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveQuoteDetails.mutate(opened)}
                disabled={saveQuoteDetails.isPending}
                className="btn-gold"
              >
                <Save className="h-4 w-4" />
                Salvar alteracoes
              </button>
              <button
                type="button"
                onClick={() => {
                  convertToOrder.mutate(opened);
                  setOpened(null);
                }}
                className="btn-primary"
              >
                Converter em pedido
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `/admin/orcamentos/${opened.id}/imprimir`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="btn-primary"
              >
                <Printer className="h-4 w-4" />
                Abrir PDF
              </button>
              <a
                href={`https://wa.me/${opened.cliente_whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

async function ensureConvertedRecords(quote: Quote) {
  const orderPayload = {
    quote_id: quote.id,
    cliente_nome: quote.cliente_nome,
    cliente_whatsapp: quote.cliente_whatsapp,
    total: Number(quote.total || 0),
    notas: quote.observacao,
  };

  const { data: existingOrder, error: orderLookupError } = await db
    .from("orders")
    .select("id")
    .eq("quote_id", quote.id)
    .maybeSingle();
  if (orderLookupError) throw orderLookupError;

  let orderId = (existingOrder as { id: string } | null)?.id ?? null;
  if (orderId) {
    const { error } = await db.from("orders").update(orderPayload).eq("id", orderId);
    if (error) throw error;
  } else {
    const { data: order, error } = await db
      .from("orders")
      .insert({ ...orderPayload, status: "aguardando_arte" })
      .select("id")
      .single();
    if (error) throw error;
    orderId = (order as { id: string }).id;
  }

  const revenuePayload = {
    descricao: `Orcamento ${quote.codigo} - ${quote.cliente_nome}`,
    valor: Number(quote.total || 0),
    data: new Date().toISOString().slice(0, 10),
    quote_id: quote.id,
    order_id: orderId,
  };

  const { data: existingRevenue, error: revenueLookupError } = await db
    .from("revenues")
    .select("id")
    .eq("quote_id", quote.id)
    .maybeSingle();
  if (revenueLookupError) throw revenueLookupError;

  const revenueId = (existingRevenue as { id: string } | null)?.id ?? null;
  if (revenueId) {
    const { error } = await db.from("revenues").update(revenuePayload).eq("id", revenueId);
    if (error) throw error;
    return;
  }

  const { error } = await db.from("revenues").insert(revenuePayload);
  if (error) throw error;
}

function invalidateAdminData(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["quotes"] });
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.invalidateQueries({ queryKey: ["revenues"] });
  qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        min={type === "number" ? "0" : undefined}
        step={step ?? (type === "number" ? "1" : undefined)}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
