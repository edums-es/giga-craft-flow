import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calculator, FileText, Plus, Printer, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  MATERIAIS,
  PRODUTOS,
  SACOLAS,
  type AlcaId,
  type CoberturaId,
  type MaterialId,
  type SacolaSize,
} from "@/data/catalog";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";
import { adminPricingQuote } from "@/lib/admin-pricing.functions";
import { sameCustomerContact } from "@/lib/customer-utils";
import { looseSupabase as db } from "@/lib/supabase-loose";
import {
  CUSTOM_PRODUCT_SLUG,
  formatBRL,
  labelAlca,
  labelCobertura,
  type CustomConsumptionMode,
  type CustomPricingProduct,
  type CustomProductType,
  type PricingInput,
  type PrintMode,
} from "@/lib/pricing";
import type { PricingComputation } from "@/lib/pricing.engine";

export const Route = createFileRoute("/_authenticated/admin/orcamentos/novo")({
  head: () => ({
    meta: [{ title: "Novo orcamento - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: NovoOrcamentoPage,
});

type Customer = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  empresa: string | null;
  cidade: string | null;
};

type QuoteItemDraft = {
  id: string;
  config: PricingInput;
  observacao: string;
  computation?: PricingComputation;
};

const defaultConfig: PricingInput = {
  slug: "sacola-personalizada",
  quantidade: 100,
  materialId: "offset180",
  cobertura: "branca",
  tamanho: "p",
  alca: "poliester",
  impressao: "frente",
  modoPreco: "calculadora_planilha",
  criacaoArte: false,
  urgencia: false,
};

const defaultCustomProduct: CustomPricingProduct = {
  nome: "Produto personalizado",
  tipo: "caixa",
  medida: "10 x 10 x 3 cm",
  modoConsumo: "folhas_por_unidade",
  fator: 1,
  acabamentoPorUnidade: 0,
  capacidadeDia: 20,
  setupDias: 1,
  usarAlca: false,
};

const emptyCustomer = {
  nome: "",
  whatsapp: "",
  email: "",
  empresa: "",
  cidade: "",
  observacao: "",
};

function NovoOrcamentoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const priceFn = useServerFn(adminPricingQuote);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [items, setItems] = useState<QuoteItemDraft[]>([newItem()]);
  const [descontoValor, setDescontoValor] = useState("0");
  const [descontoPercentual, setDescontoPercentual] = useState("0");
  const [validadeDias, setValidadeDias] = useState("7");
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [savedQuote, setSavedQuote] = useState<{ id: string; codigo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await db
        .from("customers")
        .select("id, nome, whatsapp, email, empresa, cidade")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const totals = useMemo(() => {
    const subtotal = round2(
      items.reduce((sum, item) => sum + Number(item.computation?.publicResult.precoTotal || 0), 0),
    );
    const custo = round2(
      items.reduce(
        (sum, item) => sum + Number(item.computation?.internalSnapshot?.custoTotal || 0),
        0,
      ),
    );
    const desconto = Math.min(
      subtotal,
      round2(Number(descontoValor || 0) + subtotal * (Number(descontoPercentual || 0) / 100)),
    );
    const total = round2(Math.max(0, subtotal - desconto));
    const lucro = round2(total - custo);
    const margem = total > 0 ? lucro / total : 0;
    const prazo = items.reduce(
      (max, item) => Math.max(max, item.computation?.publicResult.prazoDiasUteis || 0),
      0,
    );
    return { subtotal, custo, desconto, total, lucro, margem, prazo };
  }, [items, descontoValor, descontoPercentual]);

  const calculateItem = useMutation({
    mutationFn: async (id: string) => {
      const item = items.find((current) => current.id === id);
      if (!item) throw new Error("Item nao encontrado.");
      const computation = await priceFn({ data: normalizeConfig(item.config) });
      if (!computation.publicResult.valido) {
        throw new Error(computation.publicResult.motivo ?? "Nao foi possivel calcular.");
      }
      return { id, computation };
    },
    onSuccess: ({ id, computation }) => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, computation } : item)),
      );
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao calcular item."),
  });

  const saveQuote = useMutation({
    mutationFn: async () => {
      setError(null);
      setSavedQuote(null);

      if (!customer.nome.trim() || !customer.whatsapp.trim()) {
        throw new Error("Informe nome e WhatsApp do cliente.");
      }

      const computedItems = await Promise.all(
        items.map(async (item) => {
          if (item.computation?.publicResult.valido) return item;
          const computation = await priceFn({ data: normalizeConfig(item.config) });
          if (!computation.publicResult.valido) {
            throw new Error(computation.publicResult.motivo ?? "Item invalido.");
          }
          return { ...item, computation };
        }),
      );
      setItems(computedItems);

      const customerPayload = {
        nome: customer.nome.trim(),
        whatsapp: customer.whatsapp.trim(),
        email: customer.email.trim() || null,
        empresa: customer.empresa.trim() || null,
        cidade: customer.cidade.trim() || null,
        notas: customer.observacao.trim() || null,
      };
      const matchedCustomer =
        customers.find((item) => item.id === selectedCustomerId) ??
        customers.find((item) =>
          sameCustomerContact(item, {
            whatsapp: customerPayload.whatsapp,
            email: customerPayload.email,
          }),
        );

      let customerId = matchedCustomer?.id ?? (selectedCustomerId || null);
      if (saveCustomer && customerId) {
        const { error: customerUpdateError } = await db
          .from("customers")
          .update(customerPayload)
          .eq("id", customerId);
        if (customerUpdateError) throw customerUpdateError;
      }

      if (saveCustomer && !customerId) {
        const { data: created, error: customerError } = await db
          .from("customers")
          .insert(customerPayload)
          .select("id")
          .single();
        if (customerError) throw customerError;
        customerId = (created as { id: string }).id;
      }

      const codigo = `GIGA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const validade = addDays(new Date(), Number(validadeDias || 7))
        .toISOString()
        .slice(0, 10);
      const publicItems = computedItems.map(toPublicItem);
      const internalItems = computedItems.map((item) => item.computation?.internalSnapshot);

      const { data: quote, error: quoteError } = await db
        .from("quotes")
        .insert({
          codigo,
          cliente_nome: customerPayload.nome,
          cliente_whatsapp: customerPayload.whatsapp,
          cliente_email: customerPayload.email,
          cliente_empresa: customerPayload.empresa,
          cliente_cidade: customerPayload.cidade,
          observacao: customerPayload.notas,
          items: publicItems,
          total: totals.total,
          prazo_dias: totals.prazo,
          status: "em_negociacao",
          customer_id: customerId,
          validade_em: validade,
          desconto_valor: Number(descontoValor || 0),
          desconto_percentual: Number(descontoPercentual || 0) / 100,
          desconto_motivo: totals.desconto ? "Desconto manual" : null,
          customer_snapshot: {
            nome: customerPayload.nome,
            whatsapp: customerPayload.whatsapp,
            email: customerPayload.email,
            empresa: customerPayload.empresa,
            cidade: customerPayload.cidade,
          },
          pricing_snapshot: {
            formulaVersion: "giga-pricing-v2",
            manual: true,
            subtotal: totals.subtotal,
            desconto: totals.desconto,
            custoTotal: totals.custo,
            lucroEstimado: totals.lucro,
            margemEstimada: totals.margem,
            items: internalItems,
          },
        })
        .select("id, codigo")
        .single();
      if (quoteError) throw quoteError;

      const quoteId = (quote as { id: string; codigo: string }).id;
      const quoteItems = computedItems.map((item) => ({
        quote_id: quoteId,
        product_slug: item.config.slug,
        product_nome: productName(item.config),
        quantidade: item.computation?.publicResult.quantidade ?? item.config.quantidade,
        preco_unitario: item.computation?.publicResult.precoUnitario ?? 0,
        preco_total: item.computation?.publicResult.precoTotal ?? 0,
        prazo_dias: item.computation?.publicResult.prazoDiasUteis ?? 0,
        public_snapshot: toPublicItem(item),
        internal_pricing_snapshot: item.computation?.internalSnapshot ?? {},
        observacao: item.observacao.trim() || null,
      }));

      const { error: itemError } = await db.from("quote_items").insert(quoteItems);
      if (itemError) throw itemError;

      return quote as { id: string; codigo: string };
    },
    onSuccess: (quote) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
      setSavedQuote(quote);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o orcamento."),
  });

  const updateItem = (id: string, patch: Partial<QuoteItemDraft>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              computation: "computation" in patch ? patch.computation : item.computation,
            }
          : item,
      ),
    );
  };

  const updateConfig = (id: string, patch: Partial<PricingInput>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              config: normalizeConfig({ ...item.config, ...patch }),
              computation: undefined,
            }
          : item,
      ),
    );
  };

  const updateCustomConfig = (id: string, patch: Partial<CustomPricingProduct>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          config: normalizeConfig({
            ...item.config,
            slug: CUSTOM_PRODUCT_SLUG,
            personalizado: {
              ...defaultCustomProduct,
              ...(item.config.personalizado ?? {}),
              ...patch,
            },
          }),
          computation: undefined,
        };
      }),
    );
  };

  const selectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((item) => item.id === id);
    if (!found) {
      setCustomer(emptyCustomer);
      return;
    }
    setCustomer({
      nome: found.nome,
      whatsapp: found.whatsapp,
      email: found.email ?? "",
      empresa: found.empresa ?? "",
      cidade: found.cidade ?? "",
      observacao: "",
    });
  };

  return (
    <AdminShell
      title="Novo orcamento"
      subtitle="Calculadora interna, cliente rapido e proposta pronta para PDF"
      actions={
        <Link to="/admin/orcamentos" className="btn-primary">
          Voltar
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Subtotal" value={formatBRL(totals.subtotal)} />
        <StatCard label="Custo estimado" value={formatBRL(totals.custo)} />
        <StatCard
          label="Lucro"
          value={formatBRL(totals.lucro)}
          hint={`${Math.round(totals.margem * 100)}% margem`}
        />
        <StatCard
          label="Total final"
          value={formatBRL(totals.total)}
          hint={`${totals.prazo || "-"} dias uteis`}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr_360px]">
        <section className="card-elegant h-fit space-y-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Cliente rapido
            </p>
            <h2 className="font-display text-xl">Dados do cliente</h2>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Cliente existente
            </span>
            <select
              value={selectedCustomerId}
              onChange={(event) => selectCustomer(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Novo cliente</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} - {item.whatsapp}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Nome*"
            value={customer.nome}
            onChange={(nome) => setCustomer({ ...customer, nome })}
            required
          />
          <Field
            label="WhatsApp*"
            value={customer.whatsapp}
            onChange={(whatsapp) => setCustomer({ ...customer, whatsapp })}
            required
          />
          <Field
            label="E-mail"
            value={customer.email}
            onChange={(email) => setCustomer({ ...customer, email })}
          />
          <Field
            label="Empresa"
            value={customer.empresa}
            onChange={(empresa) => setCustomer({ ...customer, empresa })}
          />
          <Field
            label="Cidade"
            value={customer.cidade}
            onChange={(cidade) => setCustomer({ ...customer, cidade })}
          />
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Observacao
            </label>
            <textarea
              rows={4}
              value={customer.observacao}
              onChange={(event) => setCustomer({ ...customer, observacao: event.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          {!selectedCustomerId && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={saveCustomer}
                onChange={(event) => setSaveCustomer(event.target.checked)}
                className="h-4 w-4 accent-[oklch(0.72_0.09_40)]"
              />
              Salvar cliente no cadastro
            </label>
          )}
        </section>

        <section className="space-y-4">
          {items.map((item, index) => {
            const produto = PRODUTOS.find((product) => product.slug === item.config.slug);
            const isCustom = item.config.slug === CUSTOM_PRODUCT_SLUG;
            const custom = item.config.personalizado ?? defaultCustomProduct;
            const isStandardBag = produto?.tipo === "sacola";
            const needsHandle = isStandardBag || (isCustom && custom.tipo === "sacola");
            const internal = item.computation?.internalSnapshot;
            return (
              <div key={item.id} className="card-elegant p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Item {index + 1}
                    </p>
                    <h3 className="font-display text-xl">
                      {isCustom
                        ? custom.nome || "Produto personalizado"
                        : (produto?.nome ?? "Produto")}
                    </h3>
                  </div>
                  <button
                    onClick={() => setItems(items.filter((current) => current.id !== item.id))}
                    disabled={items.length === 1}
                    className="rounded-lg border border-border p-2 text-destructive disabled:opacity-40"
                    title="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Produto
                    </span>
                    <select
                      value={item.config.slug}
                      onChange={(event) =>
                        updateConfig(item.id, productDefaults(event.target.value))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      {PRODUTOS.map((product) => (
                        <option key={product.slug} value={product.slug}>
                          {product.nome}
                        </option>
                      ))}
                      <option value={CUSTOM_PRODUCT_SLUG}>Produto personalizado</option>
                    </select>
                  </label>
                  <Field
                    type="number"
                    label="Quantidade"
                    value={String(item.config.quantidade)}
                    onChange={(quantidade) =>
                      updateConfig(item.id, { quantidade: Math.max(1, Number(quantidade || 1)) })
                    }
                  />
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Material
                    </span>
                    <select
                      value={item.config.materialId}
                      onChange={(event) =>
                        updateConfig(item.id, { materialId: event.target.value as MaterialId })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      {MATERIAIS.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {isCustom && (
                  <div className="mt-4 rounded-xl border border-border/60 bg-secondary/25 p-4">
                    <div className="mb-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        Produto personalizado
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Informe o tamanho e o consumo real de papel para o sistema sugerir um preco
                        com custo, margem e prazo.
                      </p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <Field
                        label="Nome do produto"
                        value={custom.nome}
                        onChange={(nome) => updateCustomConfig(item.id, { nome })}
                      />
                      <label className="block">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Tipo
                        </span>
                        <select
                          value={custom.tipo}
                          onChange={(event) =>
                            updateCustomConfig(item.id, {
                              tipo: event.target.value as CustomProductType,
                              usarAlca: event.target.value === "sacola" ? custom.usarAlca : false,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                        >
                          <option value="sacola">Sacola</option>
                          <option value="tag">Tag</option>
                          <option value="cartao">Cartao</option>
                          <option value="caixa">Caixa</option>
                          <option value="outro">Outro</option>
                        </select>
                      </label>
                      <Field
                        label="Medida final"
                        value={custom.medida}
                        onChange={(medida) => updateCustomConfig(item.id, { medida })}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      <label className="block">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Como medir o papel
                        </span>
                        <select
                          value={custom.modoConsumo}
                          onChange={(event) =>
                            updateCustomConfig(item.id, {
                              modoConsumo: event.target.value as CustomConsumptionMode,
                              fator:
                                event.target.value === "unidades_por_folha"
                                  ? Math.max(1, custom.fator)
                                  : custom.fator,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                        >
                          <option value="folhas_por_unidade">Folhas por unidade</option>
                          <option value="unidades_por_folha">Unidades por folha A4</option>
                        </select>
                      </label>
                      <Field
                        type="number"
                        step="0.01"
                        label={
                          custom.modoConsumo === "unidades_por_folha"
                            ? "Unidades por folha"
                            : "Folhas por unidade"
                        }
                        value={String(custom.fator)}
                        onChange={(fator) =>
                          updateCustomConfig(item.id, { fator: Math.max(0.01, Number(fator || 0)) })
                        }
                      />
                      <label className="block">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Impressao
                        </span>
                        <select
                          value={item.config.impressao ?? "frente"}
                          onChange={(event) =>
                            updateConfig(item.id, { impressao: event.target.value as PrintMode })
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                        >
                          <option value="frente">Frente</option>
                          <option value="frente_verso">Frente e verso</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      <Field
                        type="number"
                        step="0.01"
                        label="Acabamento/un. R$"
                        value={String(custom.acabamentoPorUnidade)}
                        onChange={(acabamentoPorUnidade) =>
                          updateCustomConfig(item.id, {
                            acabamentoPorUnidade: Math.max(0, Number(acabamentoPorUnidade || 0)),
                          })
                        }
                      />
                      <Field
                        type="number"
                        label="Capacidade/dia"
                        value={String(custom.capacidadeDia)}
                        onChange={(capacidadeDia) =>
                          updateCustomConfig(item.id, {
                            capacidadeDia: Math.max(1, Math.floor(Number(capacidadeDia || 1))),
                          })
                        }
                      />
                      <Field
                        type="number"
                        label="Setup dias"
                        value={String(custom.setupDias)}
                        onChange={(setupDias) =>
                          updateCustomConfig(item.id, {
                            setupDias: Math.max(0, Math.floor(Number(setupDias || 0))),
                          })
                        }
                      />
                    </div>

                    {custom.tipo === "sacola" && (
                      <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={Boolean(custom.usarAlca)}
                          onChange={(event) =>
                            updateCustomConfig(item.id, { usarAlca: event.target.checked })
                          }
                          className="h-4 w-4 accent-[oklch(0.72_0.09_40)]"
                        />
                        Incluir custo de alca
                      </label>
                    )}
                  </div>
                )}

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {isStandardBag && (
                    <label className="block">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        Tamanho
                      </span>
                      <select
                        value={item.config.tamanho ?? "p"}
                        onChange={(event) =>
                          updateConfig(item.id, { tamanho: event.target.value as SacolaSize })
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                      >
                        {SACOLAS.map((size) => (
                          <option key={size.id} value={size.id}>
                            {size.nome} - {size.medida}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Cobertura
                    </span>
                    <select
                      value={item.config.cobertura}
                      onChange={(event) =>
                        updateConfig(item.id, { cobertura: event.target.value as CoberturaId })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="branca">Fundo branco</option>
                      <option value="colorida">Colorida</option>
                      <option value="texturizada">Texturizada</option>
                      <option value="alta">Alta cobertura</option>
                    </select>
                  </label>
                  {needsHandle && (
                    <label className="block">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        Alca
                      </span>
                      <select
                        value={item.config.alca ?? "poliester"}
                        onChange={(event) =>
                          updateConfig(item.id, { alca: event.target.value as AlcaId })
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                      >
                        <option value="poliester">Poliester</option>
                        <option value="gorgurao">Gorgurao</option>
                        <option value="sem">Sem alca</option>
                      </select>
                    </label>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle
                      checked={Boolean(item.config.criacaoArte)}
                      label="Criacao de arte"
                      onChange={(criacaoArte) => updateConfig(item.id, { criacaoArte })}
                    />
                    <Toggle
                      checked={Boolean(item.config.urgencia)}
                      label="Urgencia"
                      onChange={(urgencia) => updateConfig(item.id, { urgencia })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => calculateItem.mutate(item.id)}
                    disabled={calculateItem.isPending}
                    className="btn-gold"
                  >
                    <Calculator className="h-4 w-4" />
                    Calcular
                  </button>
                </div>

                <div className="mt-3">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Observacao do item
                  </label>
                  <input
                    value={item.observacao}
                    onChange={(event) => updateItem(item.id, { observacao: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>

                <div className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-secondary/35 p-4 sm:grid-cols-4">
                  <MiniStat
                    label="Venda"
                    value={formatBRL(item.computation?.publicResult.precoTotal ?? 0)}
                  />
                  <MiniStat label="Custo" value={formatBRL(internal?.custoTotal ?? 0)} />
                  <MiniStat label="Lucro" value={formatBRL(internal?.lucroEstimado ?? 0)} />
                  <MiniStat
                    label="Margem"
                    value={internal ? `${Math.round(internal.margemAplicada * 100)}%` : "-"}
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setItems([...items, newItem()])}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Adicionar item
          </button>
        </section>

        <aside className="card-elegant h-fit space-y-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Resumo interno
            </p>
            <h2 className="font-display text-xl">Preco e margem</h2>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryLine label="Subtotal" value={formatBRL(totals.subtotal)} />
            <SummaryLine label="Desconto" value={`-${formatBRL(totals.desconto)}`} />
            <SummaryLine label="Custo" value={formatBRL(totals.custo)} />
            <SummaryLine label="Lucro" value={formatBRL(totals.lucro)} strong />
            <SummaryLine label="Margem" value={`${Math.round(totals.margem * 100)}%`} strong />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              type="number"
              label="Desc. R$"
              value={descontoValor}
              onChange={setDescontoValor}
              step="0.01"
            />
            <Field
              type="number"
              label="Desc. %"
              value={descontoPercentual}
              onChange={setDescontoPercentual}
              step="0.01"
            />
          </div>
          <Field
            type="number"
            label="Validade dias"
            value={validadeDias}
            onChange={setValidadeDias}
          />
          <div className="rounded-xl bg-accent/10 p-4">
            <p className="text-xs uppercase tracking-widest text-accent">Total da proposta</p>
            <p className="mt-1 font-display text-3xl text-accent">{formatBRL(totals.total)}</p>
          </div>
          <button
            type="button"
            onClick={() => saveQuote.mutate()}
            disabled={saveQuote.isPending}
            className="btn-gold w-full"
          >
            <Save className="h-4 w-4" />
            Salvar orcamento
          </button>
          {savedQuote && (
            <div className="space-y-2 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
              <p className="text-accent">Orcamento salvo: #{savedQuote.codigo}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `/admin/orcamentos/${savedQuote.id}/imprimir`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="btn-primary"
                >
                  <Printer className="h-4 w-4" />
                  Abrir PDF
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/admin/orcamentos" })}
                  className="btn-primary"
                >
                  <FileText className="h-4 w-4" />
                  Ver lista
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function newItem(): QuoteItemDraft {
  return {
    id: crypto.randomUUID(),
    config: { ...defaultConfig },
    observacao: "",
  };
}

function normalizeConfig(config: PricingInput): PricingInput {
  const product = PRODUTOS.find((item) => item.slug === config.slug);
  const isCustom = config.slug === CUSTOM_PRODUCT_SLUG;
  const custom = isCustom
    ? {
        ...defaultCustomProduct,
        ...(config.personalizado ?? {}),
        fator: Math.max(0.01, Number(config.personalizado?.fator || defaultCustomProduct.fator)),
        acabamentoPorUnidade: Math.max(
          0,
          Number(
            config.personalizado?.acabamentoPorUnidade ?? defaultCustomProduct.acabamentoPorUnidade,
          ),
        ),
        capacidadeDia: Math.max(
          1,
          Math.floor(
            Number(config.personalizado?.capacidadeDia || defaultCustomProduct.capacidadeDia),
          ),
        ),
        setupDias: Math.max(
          0,
          Math.floor(Number(config.personalizado?.setupDias ?? defaultCustomProduct.setupDias)),
        ),
      }
    : undefined;
  return {
    ...config,
    quantidade: Math.max(1, Math.floor(Number(config.quantidade || 1))),
    impressao: config.impressao ?? "frente",
    modoPreco: "calculadora_planilha",
    personalizado: custom,
    tamanho: product?.tipo === "sacola" ? (config.tamanho ?? "p") : undefined,
    alca: product?.tipo === "sacola" || custom?.usarAlca ? (config.alca ?? "poliester") : undefined,
  };
}

function productDefaults(slug: string): Partial<PricingInput> {
  const product = PRODUTOS.find((item) => item.slug === slug);
  if (slug === CUSTOM_PRODUCT_SLUG) {
    return {
      ...defaultConfig,
      slug,
      tamanho: undefined,
      alca: "sem",
      impressao: "frente",
      personalizado: { ...defaultCustomProduct },
    };
  }
  return {
    ...defaultConfig,
    slug,
    tamanho: product?.tipo === "sacola" ? "p" : undefined,
    alca: product?.tipo === "sacola" ? "poliester" : undefined,
  };
}

function productName(config: PricingInput) {
  if (config.slug === CUSTOM_PRODUCT_SLUG)
    return config.personalizado?.nome ?? "Produto personalizado";
  return PRODUTOS.find((product) => product.slug === config.slug)?.nome ?? config.slug;
}

function toPublicItem(item: QuoteItemDraft) {
  const product = PRODUTOS.find((current) => current.slug === item.config.slug);
  const result = item.computation?.publicResult;
  return {
    nome: product?.nome ?? item.config.personalizado?.nome ?? item.config.slug,
    quantidade: result?.quantidade ?? item.config.quantidade,
    precoUnitario: result?.precoUnitario ?? 0,
    precoTotal: result?.precoTotal ?? 0,
    prazoDiasUteis: result?.prazoDiasUteis ?? 0,
    resumo: result?.resumo ?? quoteSummary(item.config),
    observacao: item.observacao.trim() || undefined,
  };
}

function quoteSummary(config: PricingInput) {
  const product = PRODUTOS.find((item) => item.slug === config.slug);
  const custom = config.slug === CUSTOM_PRODUCT_SLUG ? config.personalizado : undefined;
  return [
    `${config.quantidade} x ${product?.nome ?? custom?.nome ?? config.slug}`,
    `Material: ${MATERIAIS.find((item) => item.id === config.materialId)?.nome ?? config.materialId}`,
    product?.tipo === "sacola"
      ? `Tamanho: ${SACOLAS.find((item) => item.id === config.tamanho)?.nome}`
      : custom
        ? `Medida: ${custom.medida}`
        : null,
    custom
      ? `Consumo: ${
          custom.modoConsumo === "unidades_por_folha"
            ? `${custom.fator} un./folha`
            : `${custom.fator} folha(s)/un.`
        }`
      : null,
    `Cobertura: ${labelCobertura(config.cobertura)}`,
    config.impressao === "frente_verso" ? "Impressao: frente e verso" : "Impressao: frente",
    product?.tipo === "sacola" || custom?.usarAlca
      ? `Alca: ${labelAlca(config.alca ?? "poliester")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        required={required}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={step ?? (type === "number" ? "1" : undefined)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[oklch(0.72_0.09_40)]"
      />
      {label}
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-medium text-accent" : ""}>{value}</span>
    </div>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
