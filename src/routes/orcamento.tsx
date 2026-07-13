import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, ArrowRight, MessageCircle } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { useCart, removeFromCart, clearCart, useHydrated } from "@/lib/cart";
import { formatBRL } from "@/lib/pricing";
import { SITE, whatsappLink, novoCodigoOrcamento } from "@/lib/site-config";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Meu orçamento — Giga Personalizados" },
      { name: "description", content: "Revise seus itens e finalize pelo WhatsApp." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrcamentoPage,
});

const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido").max(20),
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
  empresa: z.string().trim().max(100).optional(),
  cidade: z.string().trim().max(80).optional(),
  observacao: z.string().trim().max(500).optional(),
});
type Cliente = z.infer<typeof clienteSchema>;

function OrcamentoPage() {
  const items = useCart();
  const hydrated = useHydrated();
  const total = items.reduce((acc, i) => acc + i.precoTotal, 0);
  const prazoMax = items.reduce((acc, i) => Math.max(acc, i.prazoDiasUteis), 0);

  const [form, setForm] = useState<Cliente>({
    nome: "", whatsapp: "", email: "", empresa: "", cidade: "", observacao: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = clienteSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    if (items.length === 0) return;

    const codigo = novoCodigoOrcamento();
    const mensagem = buildMessage(codigo, parsed.data, items, total, prazoMax);
    // TODO Fase 2: gravar no banco (Lovable Cloud) antes de abrir o WhatsApp.
    window.open(whatsappLink(mensagem), "_blank");
    clearCart();
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container-giga py-12">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">Orçamento</span>
        <h1 className="mt-2 font-display text-5xl">Meu orçamento</h1>
        <p className="mt-2 text-muted-foreground">Revise os itens, informe seus dados e finalize direto no WhatsApp da Giga.</p>

        {!hydrated ? null : items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-14 text-center">
            <p className="font-display text-2xl">Seu orçamento está vazio</p>
            <p className="mt-2 text-muted-foreground">Adicione produtos do catálogo para começar.</p>
            <Link to="/catalogo" className="btn-gold mt-6 inline-flex">
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="card-elegant p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-xl">{item.nome}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.config.quantidade} unidades</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl text-accent">{formatBRL(item.precoTotal)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(item.precoUnitario)} / un.
                      </p>
                    </div>
                  </div>
                  <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-nude/50 p-3 font-sans text-xs text-muted-foreground">
{item.resumo}
                  </pre>
                  {item.observacao && (
                    <p className="mt-2 text-xs text-muted-foreground"><b>Obs:</b> {item.observacao}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Prazo estimado: {item.prazoDiasUteis} dias úteis</span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleFinalize} className="card-elegant space-y-5 self-start p-6">
              <div className="flex items-baseline justify-between border-b border-border/60 pb-4">
                <span className="text-sm text-muted-foreground">Total estimado</span>
                <span className="font-display text-3xl text-accent">{formatBRL(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Prazo geral: até {prazoMax} dias úteis após aprovação da arte.
              </p>

              <Field label="Nome*" value={form.nome} error={errors.nome}
                onChange={(v) => setForm({ ...form, nome: v })} />
              <Field label="WhatsApp*" value={form.whatsapp} error={errors.whatsapp}
                onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="(11) 99999-9999" />
              <Field label="E-mail" value={form.email ?? ""} error={errors.email}
                onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Empresa" value={form.empresa ?? ""}
                onChange={(v) => setForm({ ...form, empresa: v })} />
              <Field label="Cidade" value={form.cidade ?? ""}
                onChange={(v) => setForm({ ...form, cidade: v })} />

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Observações</label>
                <textarea
                  rows={3}
                  value={form.observacao ?? ""}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-accent"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Ao finalizar, você concorda com o processo de aprovação de arte e prazos estimados da {SITE.nome}.
              </p>

              <button type="submit" className="btn-gold w-full">
                <MessageCircle className="h-4 w-4" /> Finalizar no WhatsApp
              </button>
            </form>
          </div>
        )}
      </div>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function Field({
  label, value, onChange, error, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-accent"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function buildMessage(
  codigo: string,
  cliente: Cliente,
  items: ReturnType<typeof useCart>,
  total: number,
  prazoMax: number,
): string {
  const linhas: string[] = [];
  linhas.push(`Olá! Gostaria de solicitar este orçamento na ${SITE.nome}.`);
  linhas.push("");
  linhas.push(`Orçamento: #${codigo}`);
  linhas.push("");
  linhas.push("Produtos:");
  items.forEach((i) => {
    linhas.push("");
    i.resumo.split("\n").forEach((l) => linhas.push(`• ${l}`));
    if (i.observacao) linhas.push(`  Obs: ${i.observacao}`);
  });
  linhas.push("");
  linhas.push(`Total estimado: ${formatBRL(total)}`);
  linhas.push(`Prazo estimado: até ${prazoMax} dias úteis`);
  linhas.push("");
  linhas.push(`Nome: ${cliente.nome}`);
  linhas.push(`WhatsApp: ${cliente.whatsapp}`);
  if (cliente.email) linhas.push(`E-mail: ${cliente.email}`);
  if (cliente.empresa) linhas.push(`Empresa: ${cliente.empresa}`);
  if (cliente.cidade) linhas.push(`Cidade: ${cliente.cidade}`);
  if (cliente.observacao) linhas.push(`Observações: ${cliente.observacao}`);
  return linhas.join("\n");
}
