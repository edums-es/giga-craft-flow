import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import logo from "@/assets/giga-logo.asset.json";
import { looseSupabase as db } from "@/lib/supabase-loose";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/orcamentos/$id/imprimir")({
  head: () => ({ meta: [{ title: "Proposta Giga" }, { name: "robots", content: "noindex" }] }),
  component: ImprimirOrcamentoPage,
});

type QuoteItem = {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
  prazoDiasUteis: number;
  resumo: string;
  observacao?: string;
};

type Quote = {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_email: string | null;
  cliente_empresa: string | null;
  cliente_cidade: string | null;
  observacao: string | null;
  items: QuoteItem[];
  total: number;
  prazo_dias: number;
  validade_em: string | null;
  created_at: string;
  desconto_valor: number;
  desconto_percentual: number;
  pricing_snapshot: {
    subtotal?: number;
    desconto?: number;
    pagamento?: {
      forma?: string;
      formaLabel?: string;
      trocoPara?: number;
      troco?: number;
    };
  } | null;
};

type SiteConfig = {
  nome: string;
  logo_url: string | null;
};

function ImprimirOrcamentoPage() {
  const { id } = Route.useParams();
  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote-print", id],
    queryFn: async () => {
      const { data, error } = await db.from("quotes").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Quote;
    },
  });
  const { data: siteConfig } = useQuery({
    queryKey: ["site_config"],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_config")
        .select("nome, logo_url")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as SiteConfig;
    },
  });

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Carregando proposta...</div>;
  }

  if (!quote) {
    return <div className="p-10 text-center text-muted-foreground">Orcamento nao encontrado.</div>;
  }

  const subtotal =
    quote.pricing_snapshot?.subtotal ??
    quote.items.reduce((sum, item) => sum + Number(item.precoTotal || 0), 0);
  const discount =
    quote.pricing_snapshot?.desconto ?? Math.max(0, subtotal - Number(quote.total || 0));
  const payment = quote.pricing_snapshot?.pagamento;
  const showPayment =
    payment && payment.forma && payment.forma !== "nao_informado" && payment.formaLabel;
  const showChange =
    payment?.forma === "dinheiro" && Number(payment.trocoPara || 0) > 0;
  const companyName = siteConfig?.nome || "Giga Personalizados";
  const proposalLogo = siteConfig?.logo_url || logo.url;

  return (
    <div className="min-h-screen bg-white text-zinc-950 print:bg-white">
      <div className="print:hidden border-b border-zinc-200 bg-zinc-50 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link to="/admin/orcamentos" className="text-sm text-zinc-600 hover:text-zinc-950">
            Voltar aos orcamentos
          </Link>
          <p className="hidden text-xs text-zinc-500 sm:block">
            Confira a proposta antes de salvar ou imprimir.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm text-white"
          >
            <Printer className="h-4 w-4" />
            Salvar em PDF
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-10 py-10 print:px-8 print:py-8">
        <header className="flex items-start justify-between gap-8 border-b border-zinc-200 pb-8">
          <div>
            <img src={proposalLogo} alt={companyName} className="h-12 w-auto object-contain" />
            <h1 className="mt-8 text-3xl font-semibold tracking-tight">Proposta comercial</h1>
            <p className="mt-2 text-sm text-zinc-600">{companyName}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-zinc-500">Orcamento</p>
            <p className="text-lg font-semibold">#{quote.codigo}</p>
            <p className="mt-4 text-zinc-500">Emissao</p>
            <p>{new Date(quote.created_at).toLocaleDateString("pt-BR")}</p>
            {quote.validade_em && (
              <>
                <p className="mt-4 text-zinc-500">Validade</p>
                <p>{new Date(quote.validade_em).toLocaleDateString("pt-BR")}</p>
              </>
            )}
          </div>
        </header>

        <section className="mt-8 grid gap-6 border-b border-zinc-200 pb-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Cliente</p>
            <p className="mt-2 text-lg font-semibold">{quote.cliente_nome}</p>
            {quote.cliente_empresa && <p>{quote.cliente_empresa}</p>}
            <p className="text-zinc-600">{quote.cliente_whatsapp}</p>
            {quote.cliente_email && <p className="text-zinc-600">{quote.cliente_email}</p>}
            {quote.cliente_cidade && <p className="text-zinc-600">{quote.cliente_cidade}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Condicoes
            </p>
            <p className="mt-2">
              Prazo estimado: {quote.prazo_dias} dias uteis apos aprovacao da arte
            </p>
            <p>Valores sujeitos a confirmacao de arte, estoque e pagamento.</p>
          </div>
        </section>

        <section className="mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-widest text-zinc-500">
                <th className="py-3">Item</th>
                <th className="py-3 text-right">Qtd.</th>
                <th className="py-3 text-right">Unit.</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={`${item.nome}-${index}`} className="border-b border-zinc-200 align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold">{item.nome}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                      {item.resumo}
                    </p>
                    {item.observacao && (
                      <p className="mt-2 text-xs text-zinc-500">Obs: {item.observacao}</p>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {Number(item.quantidade).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-4 text-right">{formatBRL(Number(item.precoUnitario || 0))}</td>
                  <td className="py-4 text-right font-medium">
                    {formatBRL(Number(item.precoTotal || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <Line label="Subtotal" value={formatBRL(subtotal)} />
            {discount > 0 && <Line label="Desconto" value={`-${formatBRL(discount)}`} />}
            <div className="mt-3 flex items-center justify-between border-t border-zinc-300 pt-4 text-lg font-semibold">
              <span>Total</span>
              <span>{formatBRL(Number(quote.total || 0))}</span>
            </div>
            {showPayment && (
              <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4">
                <Line label="Pagamento" value={payment.formaLabel ?? ""} />
                {showChange && (
                  <>
                    <Line label="Troco para" value={formatBRL(Number(payment.trocoPara || 0))} />
                    <Line label="Troco" value={formatBRL(Number(payment.troco || 0))} />
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {quote.observacao && (
          <section className="mt-8 rounded-xl border border-zinc-200 p-4 text-sm">
            <p className="font-semibold">Observacoes</p>
            <p className="mt-1 text-zinc-600">{quote.observacao}</p>
          </section>
        )}

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          <p>{companyName} - proposta gerada pelo painel interno.</p>
        </footer>
      </main>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
