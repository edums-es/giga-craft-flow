
# Sistema Giga Personalizados — Plano de Construção

## 1. Resumo do produto
Sistema web com duas áreas:
- **Vitrine pública** estilo "cardápio digital": cliente navega categorias, configura o produto passo a passo, vê preço e prazo estimados em tempo real, monta um carrinho de orçamento e finaliza enviando resumo para o WhatsApp da Giga.
- **Painel administrativo** com clientes, orçamentos, pedidos (Kanban de produção), produtos e opções, motor de preços editável, insumos/estoque, compras, financeiro básico e configurações.

O cliente nunca vê custo, margem, lucro, fórmulas ou dados de insumo. Todo cálculo sensível roda no servidor.

## 2. Stack (adaptada ao ambiente Lovable)
O prompt sugere Next.js + NestJS + Postgres + Prisma. O ambiente Lovable já entrega uma stack equivalente e produtiva:
- **Frontend:** React 19 + TanStack Start (SSR), TypeScript, Tailwind v4, shadcn/ui, React Hook Form + Zod, TanStack Query.
- **Backend:** TanStack Server Functions e Server Routes (equivalentes a API routes tipadas) rodando no runtime edge.
- **Banco + Auth + Storage:** Lovable Cloud (Postgres com RLS, Auth com perfis, Storage para logos/artes/PDFs). Cobre todos os requisitos de persistência, autenticação, permissões e arquivos sem infraestrutura extra.
- **PDF:** geração server-side do orçamento com layout Giga.
- **WhatsApp:** deep link `wa.me` com mensagem pré-montada (API oficial fica como evolução futura).

Se você preferir estritamente Next.js + NestJS + Postgres próprio + S3, me diga — mudarei a fase de setup.

## 3. Identidade visual
Design system em `src/styles.css` com tokens dedicados:
- Fundos: branco / creme / nude.
- Acentos rosé gold / cobre para detalhes, ícones e CTAs premium.
- Texto principal em azul-marinho profundo (quase grafite).
- Tipografia: display serifada elegante (ex.: Cormorant/Playfair) + sans-serif limpa (ex.: Inter/Manrope) — carregadas via `<link>` no root.
- Cartões com cantos arredondados, bordas finas, sombras suaves, muito respiro.
- Logo Giga aplicada em header, PDF e mensagem WhatsApp.

## 4. Mapa de telas

**Vitrine pública**
- `/` Home (hero + categorias + destaques + FAQ + rodapé)
- `/catalogo` listagem com filtros/busca
- `/categoria/$slug` categoria
- `/produto/$slug` ficha + configurador passo a passo
- `/orcamento` carrinho + dados do cliente + upload + finalizar no WhatsApp
- `/orcamento/$codigo` recuperar orçamento por link

**Painel** (`/admin`, protegido)
- Dashboard, Orçamentos, Pedidos (lista + Kanban), Clientes, Produtos, Categorias, Insumos, Compras/Fornecedores, Financeiro (receitas, despesas, caixa), Relatórios, Configurações, Usuários, Auditoria.

## 5. Modelo de dados inicial (Postgres)
Entidades principais com RLS: User, Role, Customer, Category, Product, ProductOption, ProductOptionValue, PricingRule, Material, Supply, Supplier, StockMovement, Purchase, PurchaseItem, Quote, QuoteItem, QuoteItemOption, Order, OrderItem, ProductionStage, OrderStageHistory, Payment, Expense, Revenue, Attachment, Artwork, ArtworkApproval, AuditLog, SystemSetting.

Regra chave: `QuoteItem` armazena **snapshot** (JSON) dos custos, opções e preços no momento da criação, para que mudanças em insumos não alterem orçamentos antigos.

## 6. Motor de preços (servidor)
Parâmetros vindos da planilha, todos editáveis no painel:
- Papéis: Offset 180g, Matte 220g, Glossy 220g — custo por folha rateado com frete.
- Rendimento por modelo: Mini=1, P=2, M=4, G=5 folhas; Tags/Cartões=12 un./folha.
- Alças: poliéster e gorgurão com custo por sacola.
- Reserva operacional + tinta + acabamento por unidade.
- Adicional para cobertura colorida/texturizada.
- Taxas: criação/setup, urgência, arte, outros.
- Margem desejada e margem mínima (bloqueio sem autorização).

Fórmula:
```text
custo_material = papel + tinta + alça + acabamento + reserva + perdas
custo_pedido   = custo_material * qtd + criação + setup + urgência + outros
preço_sugerido = custo_pedido / (1 - margem_desejada)
margem         = (preço - custo) / preço
```
Endpoint `POST /api/pricing/quote` recebe configuração e devolve **apenas** preço unitário, total, adicionais e prazo — nunca o custo.

## 7. Cálculo de prazo
```text
prazo = ceil(qtd / capacidade_diária) + dias_setup + dias_segurança + impacto_fila
```
Configurável por produto; considera feriados e dias sem produção.

## 8. Permissões
Perfis Admin, Vendas, Produção, Financeiro, Designer, com flags por ação (ver custo, ver lucro, aprovar, exportar). Implementadas via tabela `user_roles` + função `has_role` em RLS.

## 9. Fluxo WhatsApp
Ao finalizar: cria Quote no banco, gera código `#GIGA-000123`, monta mensagem curta com produtos, valores estimados, prazo e link do orçamento; abre `https://wa.me/<numero>?text=...` (número configurável no painel).

## 10. Plano de desenvolvimento (fases)
- **Fase 1 — MVP vitrine:** design system, catálogo, configurador, motor de preços no servidor, carrinho, finalização WhatsApp, persistência dos orçamentos, autenticação admin, CRUD de produtos/opções/parâmetros, seed com dados da planilha (Sacolas Mini/P/M/G, Tags, Cartões, materiais, alças, coberturas).
- **Fase 2:** Clientes, painel de orçamentos, PDF, conversão em pedido, Kanban de produção.
- **Fase 3:** Insumos, estoque, fichas técnicas, compras, fornecedores, reserva/baixa por pedido.
- **Fase 4:** Financeiro, dashboard com indicadores e gráficos, relatórios, exportações.
- **Fase 5:** Aprovação de arte, notificações, portal do cliente, integrações.

## 11. Critérios de aceite (MVP fase 1)
Cliente monta pedido pelo celular, preço muda em tempo real, orçamento é salvo, WhatsApp abre com mensagem correta, admin edita parâmetros de preço, nenhum dado sensível aparece no frontend/rede.

---

## Antes de começar preciso de 3 decisões suas

1. **Stack:** posso seguir com a stack Lovable (TanStack Start + Lovable Cloud/Postgres) que atende todos os requisitos funcionais, ou você quer exatamente Next.js + NestJS + Postgres próprio + S3 (aumenta bastante o tempo e exige infra sua)?
2. **Escopo desta primeira entrega:** implemento **Fase 1 completa** (vitrine + configurador + motor de preços + WhatsApp + admin básico de produtos/parâmetros + seed da planilha)? Ou você quer que eu vá além já nesta rodada?
3. **WhatsApp e dados da Giga:** qual número do WhatsApp, Instagram, e-mail e cidade devo usar como configuração inicial? (Posso deixar placeholders editáveis no painel se preferir.)
