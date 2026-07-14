-- Foundation for the full Giga system roadmap:
-- editable catalog, normalized quote snapshots, inventory, purchases and audit.

-- ====== Catalog ======
CREATE TABLE IF NOT EXISTS public.product_categories (
  id text PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  categoria_id text REFERENCES public.product_categories(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('sacola', 'tag', 'cartao', 'caixa', 'adesivo', 'embalagem', 'kit', 'sob_medida')),
  descricao text NOT NULL DEFAULT '',
  medida_publica text,
  quantidade_minima int NOT NULL DEFAULT 25,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code text NOT NULL,
  nome text NOT NULL,
  medida_publica text,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);

CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  code text NOT NULL,
  nome text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  code text NOT NULL,
  nome text NOT NULL,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, code)
);

-- Public catalog can be read by visitors; internal_config is protected by PostgREST column grants.
GRANT SELECT (id, nome, descricao, sort_order, is_active, created_at, updated_at) ON public.product_categories TO anon, authenticated;
GRANT SELECT (id, slug, nome, categoria_id, tipo, descricao, medida_publica, quantidade_minima, is_featured, is_active, public_config, created_at, updated_at) ON public.products TO anon, authenticated;
GRANT SELECT (id, product_id, code, nome, medida_publica, public_config, sort_order, is_active, created_at, updated_at) ON public.product_variants TO anon, authenticated;
GRANT SELECT (id, product_id, code, nome, is_required, sort_order, created_at, updated_at) ON public.product_option_groups TO anon, authenticated;
GRANT SELECT (id, group_id, code, nome, public_config, sort_order, is_active, created_at, updated_at) ON public.product_option_values TO anon, authenticated;
GRANT ALL ON public.product_categories, public.products, public.product_variants, public.product_option_groups, public.product_option_values TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_categories, public.products, public.product_variants, public.product_option_groups, public.product_option_values TO authenticated;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads active categories" ON public.product_categories FOR SELECT USING (is_active = true);
CREATE POLICY "public reads active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "public reads active variants" ON public.product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "public reads option groups" ON public.product_option_groups FOR SELECT USING (true);
CREATE POLICY "public reads active option values" ON public.product_option_values FOR SELECT USING (is_active = true);

CREATE POLICY "staff manages categories" ON public.product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages variants" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages option groups" ON public.product_option_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages option values" ON public.product_option_values FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ====== Quote snapshots ======
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS validade_em date,
  ADD COLUMN IF NOT EXISTS desconto_valor numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_percentual numeric(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_motivo text,
  ADD COLUMN IF NOT EXISTS customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_token_key ON public.quotes(public_token);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  product_nome text NOT NULL,
  quantidade int NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(12,2) NOT NULL DEFAULT 0,
  preco_total numeric(12,2) NOT NULL DEFAULT 0,
  prazo_dias int NOT NULL DEFAULT 0,
  public_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads quote items" ON public.quote_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages quote items" ON public.quote_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ====== Orders cost/profit snapshots ======
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS items_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custo_previsto numeric(12,2),
  ADD COLUMN IF NOT EXISTS custo_real numeric(12,2),
  ADD COLUMN IF NOT EXISTS lucro_previsto numeric(12,2),
  ADD COLUMN IF NOT EXISTS lucro_real numeric(12,2),
  ADD COLUMN IF NOT EXISTS margem_prevista numeric(6,4),
  ADD COLUMN IF NOT EXISTS margem_real numeric(6,4),
  ADD COLUMN IF NOT EXISTS valor_recebido numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pendente numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.order_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_stage_history TO authenticated;
GRANT ALL ON public.order_stage_history TO service_role;
ALTER TABLE public.order_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages order history" ON public.order_stage_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ====== Inventory and purchases ======
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contato text,
  whatsapp text,
  cnpj text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  fornecedor_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unidade text NOT NULL DEFAULT 'un',
  quantidade_atual numeric(12,3) NOT NULL DEFAULT 0,
  estoque_minimo numeric(12,3) NOT NULL DEFAULT 0,
  ultimo_custo numeric(12,4) NOT NULL DEFAULT 0,
  custo_medio numeric(12,4) NOT NULL DEFAULT 0,
  quantidade_por_pacote numeric(12,3),
  localizacao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id uuid NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'perda', 'uso_em_pedido', 'devolucao', 'reserva')),
  quantidade numeric(12,3) NOT NULL,
  custo_unitario numeric(12,4),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT current_date,
  frete numeric(12,2) NOT NULL DEFAULT 0,
  desconto numeric(12,2) NOT NULL DEFAULT 0,
  taxas numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  pagamento text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  supply_id uuid REFERENCES public.supplies(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  quantidade numeric(12,3) NOT NULL,
  valor_unitario numeric(12,4) NOT NULL,
  valor_total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers, public.supplies, public.stock_movements, public.purchases, public.purchase_items TO authenticated;
GRANT ALL ON public.suppliers, public.supplies, public.stock_movements, public.purchases, public.purchase_items TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manages suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages supplies" ON public.supplies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages stock movements" ON public.stock_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages purchases" ON public.purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff manages purchase items" ON public.purchase_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ====== Audit ======
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff writes audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ====== Initial catalog seed from the Giga spreadsheet ======
INSERT INTO public.product_categories (id, nome, descricao, sort_order) VALUES
  ('sacolas', 'Sacolas', 'Sacolas personalizadas em quatro tamanhos', 10),
  ('tags', 'Tags', 'Tags de roupa e etiquetas de marca', 20),
  ('cartoes', 'Cartões', 'Cartões de agradecimento e visita', 30),
  ('caixas', 'Caixas', 'Caixas rígidas e presente', 40),
  ('embalagens', 'Embalagens', 'Papéis kraft, laminados e sob medida', 50),
  ('adesivos', 'Adesivos', 'Adesivos recortados e em bobina', 60),
  ('kits', 'Kits personalizados', 'Combinações prontas para marcas', 70)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.products (slug, nome, categoria_id, tipo, descricao, quantidade_minima, is_featured, public_config, internal_config)
VALUES
  (
    'sacola-personalizada',
    'Sacola personalizada',
    'sacolas',
    'sacola',
    'Sacolas em papel premium com sua marca aplicada. Quatro tamanhos padronizados, três materiais e opções de alça.',
    25,
    true,
    '{"materials":["offset180","matte220","glossy220"],"coverages":["branca","colorida","texturizada","alta"],"handles":["poliester","gorgurao","sem"]}'::jsonb,
    '{"pricingFamily":"sacola"}'::jsonb
  ),
  (
    'tag-de-roupa',
    'Tag de roupa',
    'tags',
    'tag',
    'Tags de roupa com furo simples, prontas para amarrar. Papel premium, impressão nítida e acabamento delicado.',
    25,
    true,
    '{"materials":["offset180","matte220","glossy220"],"coverages":["branca","colorida","texturizada","alta"]}'::jsonb,
    '{"pricingFamily":"papelaria","unitsPerSheet":12,"finishingCostPerUnit":0.03,"dailyCapacity":120}'::jsonb
  ),
  (
    'cartao-de-agradecimento',
    'Cartão de agradecimento',
    'cartoes',
    'cartao',
    'Cartões quadrados de agradecimento que acompanham o pedido e reforçam a sua marca.',
    25,
    true,
    '{"materials":["offset180","matte220","glossy220"],"coverages":["branca","colorida","texturizada","alta"]}'::jsonb,
    '{"pricingFamily":"papelaria","unitsPerSheet":12,"finishingCostPerUnit":0,"dailyCapacity":150}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  categoria_id = EXCLUDED.categoria_id,
  tipo = EXCLUDED.tipo,
  descricao = EXCLUDED.descricao,
  quantidade_minima = EXCLUDED.quantidade_minima,
  is_featured = EXCLUDED.is_featured,
  public_config = EXCLUDED.public_config,
  internal_config = EXCLUDED.internal_config,
  updated_at = now();

WITH sacola AS (SELECT id FROM public.products WHERE slug = 'sacola-personalizada')
INSERT INTO public.product_variants (product_id, code, nome, medida_publica, sort_order, public_config, internal_config)
SELECT sacola.id, v.code, v.nome, v.medida, v.sort_order, v.public_config::jsonb, v.internal_config::jsonb
FROM sacola
CROSS JOIN (VALUES
  ('mini', 'Mini', '12 × 9 × 4 cm', 10, '{"uso":"Joias e pequenos acessórios"}', '{"sheetsPerUnit":1,"dailyCapacity":30}'),
  ('p', 'P', '15 × 14 × 7,5 cm', 20, '{"uso":"Cosméticos e presentes"}', '{"sheetsPerUnit":2,"dailyCapacity":20}'),
  ('m', 'M', '22 × 18 × 8 cm', 30, '{"uso":"Roupas e kits"}', '{"sheetsPerUnit":4,"dailyCapacity":12}'),
  ('g', 'G', '27 × 20 × 10 cm', 40, '{"uso":"Roupas e itens maiores"}', '{"sheetsPerUnit":5,"dailyCapacity":8}')
) AS v(code, nome, medida, sort_order, public_config, internal_config)
ON CONFLICT (product_id, code) DO UPDATE SET
  nome = EXCLUDED.nome,
  medida_publica = EXCLUDED.medida_publica,
  sort_order = EXCLUDED.sort_order,
  public_config = EXCLUDED.public_config,
  internal_config = EXCLUDED.internal_config,
  updated_at = now();

INSERT INTO public.supplies (nome, categoria, unidade, quantidade_atual, estoque_minimo, ultimo_custo, custo_medio, quantidade_por_pacote)
VALUES
  ('Offset 180g', 'Papel', 'folha', 500, 100, 0.274, 0.274, 500),
  ('Matte 220g', 'Papel', 'folha', 100, 50, 0.5001, 0.5001, 100),
  ('Glossy 220g', 'Papel', 'folha', 100, 50, 0.6406, 0.6406, 100),
  ('Alça poliéster 28 cm', 'Alças', 'un', 200, 50, 0.34, 0.34, 200),
  ('Gorgurão 38 mm', 'Gorgurão', 'm', 50, 10, 1.258, 1.258, 50)
ON CONFLICT DO NOTHING;
