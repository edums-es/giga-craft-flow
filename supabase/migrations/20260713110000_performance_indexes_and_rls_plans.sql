-- Performance hardening after the catalog/inventory foundation.
-- Adds covering indexes for foreign keys and avoids per-row auth.uid()
-- init plans in row level security policies.

CREATE INDEX IF NOT EXISTS pricing_params_updated_by_idx ON public.pricing_params(updated_by);
CREATE INDEX IF NOT EXISTS quotes_customer_id_idx ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS orders_quote_id_idx ON public.orders(quote_id);
CREATE INDEX IF NOT EXISTS orders_responsavel_id_idx ON public.orders(responsavel_id);
CREATE INDEX IF NOT EXISTS revenues_quote_id_idx ON public.revenues(quote_id);
CREATE INDEX IF NOT EXISTS revenues_order_id_idx ON public.revenues(order_id);
CREATE INDEX IF NOT EXISTS products_categoria_id_idx ON public.products(categoria_id);
CREATE INDEX IF NOT EXISTS product_option_groups_product_id_idx ON public.product_option_groups(product_id);
CREATE INDEX IF NOT EXISTS quote_items_quote_id_idx ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS order_stage_history_order_id_idx ON public.order_stage_history(order_id);
CREATE INDEX IF NOT EXISTS order_stage_history_changed_by_idx ON public.order_stage_history(changed_by);
CREATE INDEX IF NOT EXISTS supplies_fornecedor_id_idx ON public.supplies(fornecedor_id);
CREATE INDEX IF NOT EXISTS stock_movements_supply_id_idx ON public.stock_movements(supply_id);
CREATE INDEX IF NOT EXISTS stock_movements_order_id_idx ON public.stock_movements(order_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_by_idx ON public.stock_movements(created_by);
CREATE INDEX IF NOT EXISTS purchases_fornecedor_id_idx ON public.purchases(fornecedor_id);
CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS purchase_items_supply_id_idx ON public.purchase_items(supply_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs(actor_id);

ALTER POLICY "own profile read" ON public.profiles
  USING ((select auth.uid()) = id);
ALTER POLICY "own profile write" ON public.profiles
  USING ((select auth.uid()) = id);
ALTER POLICY "own profile insert" ON public.profiles
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "own roles read" ON public.user_roles
  USING ((select auth.uid()) = user_id OR public.has_role((select auth.uid()), 'admin'));
ALTER POLICY "admin manages roles" ON public.user_roles
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

ALTER POLICY "staff read params" ON public.pricing_params
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "admin write params" ON public.pricing_params
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

ALTER POLICY "admin writes site config" ON public.site_config
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

ALTER POLICY "staff reads customers" ON public.customers
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff writes customers" ON public.customers
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff reads quotes" ON public.quotes
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff updates quotes" ON public.quotes
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "admin deletes quotes" ON public.quotes
  USING (public.has_role((select auth.uid()), 'admin'));

ALTER POLICY "staff manages orders" ON public.orders
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff manages revenues" ON public.revenues
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages expenses" ON public.expenses
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff manages categories" ON public.product_categories
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages products" ON public.products
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages variants" ON public.product_variants
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages option groups" ON public.product_option_groups
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages option values" ON public.product_option_values
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff reads quote items" ON public.quote_items
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages quote items" ON public.quote_items
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff manages order history" ON public.order_stage_history
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff manages suppliers" ON public.suppliers
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages supplies" ON public.supplies
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages stock movements" ON public.stock_movements
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages purchases" ON public.purchases
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff manages purchase items" ON public.purchase_items
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

ALTER POLICY "staff reads audit logs" ON public.audit_logs
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
ALTER POLICY "staff writes audit logs" ON public.audit_logs
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
