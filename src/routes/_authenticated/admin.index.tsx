import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  FileText,
  KanbanSquare,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/pricing";
import { readableError } from "@/lib/readable-error";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [{ title: "Dashboard - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

const PERIODS = [
  { label: "7 dias", value: "7" },
  { label: "30 dias", value: "30" },
  { label: "90 dias", value: "90" },
  { label: "Ano", value: "365" },
  { label: "Tudo", value: "all" },
] as const;

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "#f4a582" },
  em_negociacao: { label: "Negociando", color: "#f7c948" },
  aprovado: { label: "Aprovado", color: "#45c37a" },
  recusado: { label: "Recusado", color: "#ef6f6c" },
  convertido: { label: "Convertido", color: "#60a5fa" },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  aguardando_arte: { label: "Arte", color: "#f4a582" },
  arte_aprovada: { label: "Aprovada", color: "#f7c948" },
  em_producao: { label: "Producao", color: "#60a5fa" },
  acabamento: { label: "Acabamento", color: "#a78bfa" },
  pronto: { label: "Pronto", color: "#45c37a" },
  entregue: { label: "Entregue", color: "#8bd3c7" },
  cancelado: { label: "Cancelado", color: "#ef6f6c" },
};

type PeriodValue = (typeof PERIODS)[number]["value"];

interface Quote {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  total: number;
  status: string;
  created_at: string;
}

interface Order {
  id: string;
  cliente_nome: string;
  total: number;
  status: string;
  entrega_prevista: string | null;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  created_at: string;
}

interface MoneyRow {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria?: string | null;
  quote_id?: string | null;
  order_id?: string | null;
}

interface Supply {
  id: string;
  nome: string;
  categoria: string;
  quantidade_atual: number;
  estoque_minimo: number;
  custo_medio: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodValue>("30");

  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const [quotes, orders, customers, revenues, expenses, supplies] = await Promise.all([
        db
          .from("quotes")
          .select("id, codigo, cliente_nome, cliente_whatsapp, total, status, created_at")
          .order("created_at", { ascending: false })
          .limit(600),
        db
          .from("orders")
          .select("id, cliente_nome, total, status, entrega_prevista, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(600),
        db.from("customers").select("id, created_at").limit(1000),
        db
          .from("revenues")
          .select("id, descricao, valor, data, quote_id, order_id")
          .order("data", { ascending: false })
          .limit(600),
        db
          .from("expenses")
          .select("id, descricao, valor, data, categoria")
          .order("data", { ascending: false })
          .limit(600),
        db
          .from("supplies")
          .select("id, nome, categoria, quantidade_atual, estoque_minimo, custo_medio")
          .order("categoria", { ascending: true })
          .order("nome", { ascending: true })
          .limit(600),
      ]);

      const firstError =
        quotes.error ||
        orders.error ||
        customers.error ||
        revenues.error ||
        expenses.error ||
        supplies.error;
      if (firstError) throw firstError;

      return {
        quotes: (quotes.data ?? []) as Quote[],
        orders: (orders.data ?? []) as Order[],
        customers: (customers.data ?? []) as Customer[],
        revenues: (revenues.data ?? []) as MoneyRow[],
        expenses: (expenses.data ?? []) as MoneyRow[],
        supplies: (supplies.data ?? []) as Supply[],
      };
    },
  });

  const view = useMemo(() => buildDashboardView(data, period), [data, period]);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Visao geral, financeiro, funil e producao"
      actions={
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                period === item.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && (
        <div className="mb-4 rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Carregando visao do negocio...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Nao consegui carregar o dashboard.
          <p className="mt-2 text-xs opacity-80">{readableError(error)}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Receita"
          value={formatBRL(view.receita)}
          hint="Entradas no periodo"
          icon={<TrendingUp className="h-4 w-4" />}
          tone="green"
        />
        <MetricCard
          label="Despesas"
          value={formatBRL(view.despesas)}
          hint="Saidas registradas"
          icon={<TrendingDown className="h-4 w-4" />}
          tone="red"
        />
        <MetricCard
          label="Lucro"
          value={formatBRL(view.lucro)}
          hint={`${view.margem.toFixed(1).replace(".", ",")}% de margem`}
          icon={<Wallet className="h-4 w-4" />}
          tone={view.lucro >= 0 ? "blue" : "red"}
        />
        <MetricCard
          label="Orcamentos"
          value={String(view.quotes.length)}
          hint={`${formatBRL(view.valorOrcado)} em propostas`}
          icon={<FileText className="h-4 w-4" />}
          tone="gold"
        />
        <MetricCard
          label="Conversao"
          value={`${view.conversao.toFixed(0)}%`}
          hint={`${view.convertidos} convertidos`}
          icon={<ArrowRight className="h-4 w-4" />}
          tone="purple"
        />
        <MetricCard
          label="Estoque baixo"
          value={String(view.lowStock.length)}
          hint={`${formatBRL(view.stockValue)} em estoque`}
          icon={<Boxes className="h-4 w-4" />}
          tone={view.lowStock.length > 0 ? "red" : "green"}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Resultado financeiro"
          subtitle="Receitas, despesas e lucro por periodo"
          action={
            <button onClick={() => navigate({ to: "/admin/financeiro" })} className="panel-link">
              Financeiro <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view.timeline} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="receitaFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#45c37a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#45c37a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="despesaFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ef6f6c" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef6f6c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#a9adba", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#a9adba", fontSize: 11 }}
                  width={46}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#45c37a"
                  fill="url(#receitaFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="despesa"
                  stroke="#ef6f6c"
                  fill="url(#despesaFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  stroke="#60a5fa"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Funil de orcamentos"
          subtitle="Status das propostas no periodo"
          action={
            <button onClick={() => navigate({ to: "/admin/orcamentos" })} className="panel-link">
              Ver lista <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={view.quoteStatus}
                layout="vertical"
                margin={{ top: 8, right: 14, left: 18, bottom: 8 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#a9adba", fontSize: 11 }}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#d6d8df", fontSize: 12 }}
                  width={88}
                />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                  {view.quoteStatus.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr_1fr]">
        <Panel title="Pedidos por etapa" subtitle={`${view.activeOrders.length} pedidos ativos`}>
          <div className="grid gap-4 md:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={view.orderStatus}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                  >
                    {view.orderStatus.map((item) => (
                      <Cell key={item.key} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CountTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {view.orderStatus.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-semibold">{item.total}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Ultimos orcamentos"
          subtitle="Oportunidades mais recentes"
          action={
            <button
              onClick={() => navigate({ to: "/admin/orcamentos/novo" })}
              className="panel-link"
            >
              <Plus className="h-3.5 w-3.5" /> Novo
            </button>
          }
        >
          <div className="space-y-2">
            {view.recentQuotes.length === 0 && (
              <EmptyState>Nenhum orcamento no periodo.</EmptyState>
            )}
            {view.recentQuotes.map((quote) => (
              <button
                key={quote.id}
                type="button"
                onClick={() => navigate({ to: "/admin/orcamentos" })}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-border/70 bg-secondary/25 px-3 py-3 text-left text-sm transition hover:border-accent/50 hover:bg-secondary/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{quote.cliente_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {quote.codigo} - {formatDate(quote.created_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatBRL(Number(quote.total || 0))}</p>
                  <StatusPill status={quote.status} map={QUOTE_STATUS} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Alertas e proximas entregas" subtitle="Pontos que merecem atencao">
          <div className="space-y-3">
            {view.lowStock.slice(0, 4).map((supply) => (
              <button
                key={supply.id}
                type="button"
                onClick={() => navigate({ to: "/admin/estoque" })}
                className="flex w-full items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-left text-sm text-destructive transition hover:border-destructive"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{supply.nome}</span>
                  <span className="block text-xs opacity-80">
                    {Number(supply.quantidade_atual)} / minimo {Number(supply.estoque_minimo)}
                  </span>
                </span>
              </button>
            ))}

            {view.upcomingOrders.slice(0, 4).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => navigate({ to: "/admin/pedidos" })}
                className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-secondary/25 px-3 py-3 text-left text-sm transition hover:border-accent/50"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{order.cliente_nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    Entrega{" "}
                    {order.entrega_prevista ? formatDate(order.entrega_prevista) : "sem data"}
                  </span>
                </span>
              </button>
            ))}

            {view.lowStock.length === 0 && view.upcomingOrders.length === 0 && (
              <EmptyState>Sem alertas importantes agora.</EmptyState>
            )}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <QuickAction
          icon={<FileText className="h-4 w-4" />}
          label="Novo orcamento"
          onClick={() => navigate({ to: "/admin/orcamentos/novo" })}
        />
        <QuickAction
          icon={<KanbanSquare className="h-4 w-4" />}
          label="Kanban de pedidos"
          onClick={() => navigate({ to: "/admin/pedidos" })}
        />
        <QuickAction
          icon={<Users className="h-4 w-4" />}
          label="Clientes"
          onClick={() => navigate({ to: "/admin/clientes" })}
        />
        <QuickAction
          icon={<Boxes className="h-4 w-4" />}
          label="Estoque"
          onClick={() => navigate({ to: "/admin/estoque" })}
        />
      </section>
    </AdminShell>
  );
}

function buildDashboardView(
  data: Awaited<ReturnType<typeof emptyData>> | undefined,
  period: PeriodValue,
) {
  const current = data ?? emptyData();
  const start = getPeriodStart(period);
  const include = (date: string) => !start || safeTime(date) >= start.getTime();

  const quotes = current.quotes.filter((quote) => include(quote.created_at));
  const revenues = current.revenues.filter((row) => include(row.data));
  const expenses = current.expenses.filter((row) => include(row.data));
  const orders = current.orders.filter((order) => include(order.created_at));
  const revenueQuoteIds = new Set(revenues.map((row) => row.quote_id).filter(Boolean));
  const convertedQuoteRevenues = quotes
    .filter((quote) => quote.status === "convertido" && !revenueQuoteIds.has(quote.id))
    .map((quote) => ({
      id: `quote-${quote.id}`,
      descricao: `Orcamento convertido ${quote.codigo}`,
      valor: Number(quote.total || 0),
      data: quote.created_at.slice(0, 10),
      quote_id: quote.id,
      order_id: null,
    }));
  const effectiveRevenues = [...revenues, ...convertedQuoteRevenues];
  const receita = sumMoney(effectiveRevenues);
  const despesas = sumMoney(expenses);
  const lucro = receita - despesas;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  const valorOrcado = quotes.reduce((sum, quote) => sum + Number(quote.total || 0), 0);
  const convertidos = quotes.filter((quote) => quote.status === "convertido").length;
  const conversao = quotes.length > 0 ? (convertidos / quotes.length) * 100 : 0;
  const activeOrders = current.orders.filter(
    (order) => !["entregue", "cancelado"].includes(order.status),
  );
  const lowStock = current.supplies
    .filter((supply) => Number(supply.quantidade_atual || 0) <= Number(supply.estoque_minimo || 0))
    .sort((a, b) => Number(a.quantidade_atual || 0) - Number(b.quantidade_atual || 0));
  const stockValue = current.supplies.reduce(
    (sum, supply) => sum + Number(supply.quantidade_atual || 0) * Number(supply.custo_medio || 0),
    0,
  );

  return {
    quotes,
    orders,
    receita,
    despesas,
    lucro,
    margem,
    valorOrcado,
    convertidos,
    conversao,
    activeOrders,
    lowStock,
    stockValue,
    timeline: buildTimeline(effectiveRevenues, expenses, period),
    quoteStatus: buildStatusData(quotes, QUOTE_STATUS),
    orderStatus: buildStatusData(activeOrders, ORDER_STATUS).filter((item) => item.total > 0),
    recentQuotes: quotes.slice(0, 6),
    upcomingOrders: activeOrders
      .filter((order) => Boolean(order.entrega_prevista))
      .sort((a, b) => safeTime(a.entrega_prevista || "") - safeTime(b.entrega_prevista || "")),
  };
}

function emptyData() {
  return {
    quotes: [] as Quote[],
    orders: [] as Order[],
    customers: [] as Customer[],
    revenues: [] as MoneyRow[],
    expenses: [] as MoneyRow[],
    supplies: [] as Supply[],
  };
}

function getPeriodStart(period: PeriodValue) {
  if (period === "all") return null;
  const start = new Date();
  start.setDate(start.getDate() - Number(period) + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildTimeline(revenues: MoneyRow[], expenses: MoneyRow[], period: PeriodValue) {
  const monthly = period === "365" || period === "all";
  const rows = new Map<
    string,
    { key: string; label: string; receita: number; despesa: number; lucro: number }
  >();

  const add = (date: string, field: "receita" | "despesa", value: number) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return;
    const key = monthly
      ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`
      : parsed.toISOString().slice(0, 10);
    const label = monthly
      ? parsed.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      : parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const current = rows.get(key) ?? { key, label, receita: 0, despesa: 0, lucro: 0 };
    current[field] += Number(value || 0);
    current.lucro = current.receita - current.despesa;
    rows.set(key, current);
  };

  revenues.forEach((row) => add(row.data, "receita", row.valor));
  expenses.forEach((row) => add(row.data, "despesa", row.valor));

  const sorted = Array.from(rows.values()).sort((a, b) => a.key.localeCompare(b.key));
  return sorted.length > 0
    ? sorted
    : [{ key: "vazio", label: "-", receita: 0, despesa: 0, lucro: 0 }];
}

function buildStatusData<T extends { status: string }>(
  items: T[],
  map: Record<string, { label: string; color: string }>,
) {
  return Object.entries(map).map(([key, meta]) => ({
    key,
    label: meta.label,
    color: meta.color,
    total: items.filter((item) => item.status === key).length,
  }));
}

function sumMoney(rows: MoneyRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
}

function safeTime(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR");
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "gold" | "green" | "red" | "blue" | "purple";
}) {
  const toneClass = {
    gold: "bg-accent/15 text-accent",
    green: "bg-emerald-500/15 text-emerald-300",
    red: "bg-red-500/15 text-red-300",
    blue: "bg-sky-500/15 text-sky-300",
    purple: "bg-violet-500/15 text-violet-300",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition hover:border-accent/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span className={`rounded-md p-2 ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold leading-tight">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-accent/50 hover:bg-secondary"
    >
      <span className="flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function StatusPill({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; color: string }>;
}) {
  const item = map[status];
  return (
    <span
      className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: item ? `${item.color}22` : "rgba(255,255,255,0.08)",
        color: item?.color ?? "var(--color-muted-foreground)",
      }}
    >
      {item?.label ?? status.replaceAll("_", " ")}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <StatusPill status={status} map={QUOTE_STATUS} />;
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-2 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="capitalize text-muted-foreground">
          {item.name}: <span className="text-foreground">{formatBRL(Number(item.value || 0))}</span>
        </p>
      ))}
    </div>
  );
}

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload?: { label?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{first.payload?.label ?? label}</p>
      <p className="text-muted-foreground">
        Total: <span className="text-foreground">{Number(first.value || 0)}</span>
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border/70 bg-secondary/20 p-4 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
