import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Info, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import {
  getProdutoBySlug,
  MATERIAIS,
  SACOLAS,
  QUANTIDADES_PADRAO,
  type MaterialId,
  type SacolaSize,
  type AlcaId,
  type CoberturaId,
} from "@/data/catalog";
import { pricingQuote } from "@/lib/pricing.functions";
import { OPCOES_COBERTURA, formatBRL, type PricingResult } from "@/lib/pricing";
import { addToCart } from "@/lib/cart";

export const Route = createFileRoute("/produto/$slug")({
  loader: ({ params }) => {
    const p = getProdutoBySlug(params.slug);
    if (!p) throw notFound();
    return { produto: p };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.produto.nome} — Giga Personalizados` },
          { name: "description", content: loaderData.produto.descricao },
          { property: "og:title", content: `${loaderData.produto.nome} — Giga Personalizados` },
          { property: "og:description", content: loaderData.produto.descricao },
        ]
      : [{ title: "Produto — Giga Personalizados" }],
  }),
  component: ProdutoPage,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container-giga py-24 text-center">
        <h1 className="font-display text-4xl">Produto não encontrado</h1>
        <Link to="/catalogo" className="mt-6 inline-block text-accent">Voltar ao catálogo</Link>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ProdutoPage() {
  const { produto } = Route.useLoaderData();
  const navigate = useNavigate();
  const priceFn = useServerFn(pricingQuote);

  const [materialId, setMaterialId] = useState<MaterialId>("offset180");
  const [tamanho, setTamanho] = useState<SacolaSize>("p");
  const [quantidade, setQuantidade] = useState<number>(100);
  const [cobertura, setCobertura] = useState<CoberturaId>("branca");
  const [alca, setAlca] = useState<AlcaId>("poliester");
  const [criacaoArte, setCriacaoArte] = useState(false);
  const [urgencia, setUrgencia] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [adicionado, setAdicionado] = useState(false);

  const input = useMemo(
    () => ({
      slug: produto.slug,
      quantidade,
      materialId,
      cobertura,
      tamanho: produto.tipo === "sacola" ? tamanho : undefined,
      alca: produto.tipo === "sacola" ? alca : undefined,
      criacaoArte,
      urgencia,
    }),
    [produto.slug, produto.tipo, quantidade, materialId, cobertura, tamanho, alca, criacaoArte, urgencia],
  );

  const mutation = useMutation<PricingResult>({
    mutationFn: () => priceFn({ data: input }),
  });

  // Recalcula com debounce quando o input muda.
  useEffect(() => {
    const t = setTimeout(() => mutation.mutate(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  const price = mutation.data;

  const handleAdd = () => {
    if (!price || !price.valido) return;
    addToCart({
      slug: produto.slug,
      nome: produto.nome,
      config: input,
      precoUnitario: price.precoUnitario,
      precoTotal: price.precoTotal,
      prazoDiasUteis: price.prazoDiasUteis,
      adicionais: price.adicionais,
      resumo: price.resumo,
      observacao: observacao || undefined,
    });
    setAdicionado(true);
    setTimeout(() => navigate({ to: "/orcamento" }), 600);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container-giga py-10">
        <Link to="/catalogo" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar ao catálogo
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* Configurador */}
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-accent">Personalização</span>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{produto.nome}</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">{produto.descricao}</p>

            <div className="mt-10 space-y-8">
              {produto.tipo === "sacola" && (
                <Step number={1} title="Tamanho">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {SACOLAS.map((s) => (
                      <Option
                        key={s.id}
                        selected={tamanho === s.id}
                        onSelect={() => setTamanho(s.id)}
                        title={s.nome}
                        sub={s.medida}
                      />
                    ))}
                  </div>
                </Step>
              )}

              <Step number={produto.tipo === "sacola" ? 2 : 1} title="Material">
                <div className="grid gap-3 sm:grid-cols-3">
                  {MATERIAIS.map((m) => (
                    <Option
                      key={m.id}
                      selected={materialId === m.id}
                      onSelect={() => setMaterialId(m.id)}
                      title={m.nome}
                      sub="Papel premium"
                    />
                  ))}
                </div>
              </Step>

              <Step number={produto.tipo === "sacola" ? 3 : 2} title="Quantidade">
                <div className="flex flex-wrap items-center gap-3">
                  {QUANTIDADES_PADRAO.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantidade(q)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        quantidade === q
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card hover:border-accent"
                      }`}
                    >
                      {q} un.
                    </button>
                  ))}
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
                    <span className="text-xs text-muted-foreground">Outra:</span>
                    <input
                      type="number"
                      min={1}
                      value={quantidade}
                      onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 0))}
                      className="w-20 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>
              </Step>

              <Step number={produto.tipo === "sacola" ? 4 : 3} title="Estilo da impressão">
                <div className="grid gap-3 sm:grid-cols-2">
                  {OPCOES_COBERTURA.map((o) => (
                    <Option
                      key={o.id}
                      selected={cobertura === o.id}
                      onSelect={() => setCobertura(o.id)}
                      title={o.nome}
                      sub={o.hint}
                    />
                  ))}
                </div>
              </Step>

              {produto.tipo === "sacola" && (
                <Step number={5} title="Alça">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Option selected={alca === "poliester"} onSelect={() => setAlca("poliester")} title="Poliéster" sub="Alça pronta, resistente" />
                    <Option selected={alca === "gorgurao"} onSelect={() => setAlca("gorgurao")} title="Gorgurão" sub="Fita de tecido, sofisticada" />
                    <Option selected={alca === "sem"} onSelect={() => setAlca("sem")} title="Sem alça" sub="Modelo envelope" />
                  </div>
                </Step>
              )}

              <Step number={produto.tipo === "sacola" ? 6 : 4} title="Adicionais">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle checked={criacaoArte} onChange={setCriacaoArte} label="Criação de arte" hint="Nossa equipe cria a arte para você" />
                  <Toggle checked={urgencia} onChange={setUrgencia} label="Produção urgente" hint="Prazo reduzido, taxa adicional" />
                </div>
              </Step>

              <Step number={produto.tipo === "sacola" ? 7 : 5} title="Observações">
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  placeholder="Referências, cores, prazos especiais…"
                  className="w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:border-accent"
                />
              </Step>
            </div>
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card-elegant p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">Estimativa</p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Valor unitário</span>
                <span className="font-display text-2xl">
                  {price?.valido ? formatBRL(price.precoUnitario) : "—"}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total ({quantidade} un.)</span>
                <span className="font-display text-3xl text-accent">
                  {price?.valido ? formatBRL(price.precoTotal) : "—"}
                </span>
              </div>

              {price?.adicionais.length ? (
                <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-sm">
                  {price.adicionais.map((a) => (
                    <div key={a.nome} className="flex justify-between text-muted-foreground">
                      <span>{a.nome}</span>
                      <span>{formatBRL(a.valor)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl bg-nude/60 p-4 text-sm">
                <p className="font-medium">Prazo estimado</p>
                <p className="mt-1 text-muted-foreground">
                  {price?.valido ? `${price.prazoDiasUteis} dias úteis` : "—"} após aprovação da arte
                </p>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                Valor estimado. A confirmação final acontece na aprovação do orçamento pelo WhatsApp.
              </p>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!price?.valido || mutation.isPending}
                className="btn-gold mt-6 w-full disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : adicionado ? (
                  <>
                    <Check className="h-4 w-4" /> Adicionado
                  </>
                ) : (
                  <>
                    Adicionar ao orçamento <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 text-xs font-medium text-accent">
          {number}
        </span>
        <h3 className="font-display text-xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Option({
  selected,
  onSelect,
  title,
  sub,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-accent bg-accent/5 shadow-sm"
          : "border-border bg-card hover:border-accent/50"
      }`}
    >
      <p className="font-medium text-foreground">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
        checked ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[oklch(0.72_0.09_40)]"
      />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </label>
  );
}
