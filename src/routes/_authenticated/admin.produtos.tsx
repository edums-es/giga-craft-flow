import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { PRODUTOS, CATEGORIAS, MATERIAIS, SACOLAS } from "@/data/catalog";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: ProdutosPage,
});

function ProdutosPage() {
  return (
    <AdminShell title="Produtos" subtitle="Catálogo público exibido na vitrine">
      <div className="mb-6 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        O catálogo inicial vem da planilha Giga. Os valores de custo, materiais e alças
        são editáveis em <b className="text-foreground">Preços</b>. Novos produtos serão
        gerenciados aqui em versões futuras.
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PRODUTOS.map((p) => (
          <div key={p.slug} className="card-elegant p-5">
            <p className="text-[10px] uppercase tracking-widest text-accent">
              {CATEGORIAS.find((c) => c.id === p.categoria)?.nome}
            </p>
            <p className="mt-1 font-display text-xl">{p.nome}</p>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{p.descricao}</p>
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-secondary px-2 py-0.5">{p.tipo}</span>
              {p.medida && <span className="ml-2">{p.medida}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card-elegant p-5">
          <h3 className="mb-3 font-display text-xl">Materiais</h3>
          <ul className="space-y-2 text-sm">
            {MATERIAIS.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-border/50 pb-2">
                <span>{m.nome}</span>
                <span className="text-muted-foreground">{m.id}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-elegant p-5">
          <h3 className="mb-3 font-display text-xl">Tamanhos de sacola</h3>
          <ul className="space-y-2 text-sm">
            {SACOLAS.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-border/50 pb-2">
                <span>{s.nome} — {s.medida}</span>
                <span className="text-muted-foreground">{s.folhas} folha(s)</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
