-- Keep read policies separate from write policies so authenticated SELECT
-- checks do not evaluate multiple permissive RLS policies.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_categories' AND policyname = 'public reads active categories') THEN
    ALTER POLICY "public reads active categories" ON public.product_categories TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'public reads active products') THEN
    ALTER POLICY "public reads active products" ON public.products TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_variants' AND policyname = 'public reads active variants') THEN
    ALTER POLICY "public reads active variants" ON public.product_variants TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_option_groups' AND policyname = 'public reads option groups') THEN
    ALTER POLICY "public reads option groups" ON public.product_option_groups TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_option_values' AND policyname = 'public reads active option values') THEN
    ALTER POLICY "public reads active option values" ON public.product_option_values TO anon;
  END IF;
END $$;

DROP POLICY IF EXISTS "admin manages roles" ON public.user_roles;
CREATE POLICY "admin creates roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "admin updates roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "admin deletes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "admin write params" ON public.pricing_params;
CREATE POLICY "admin creates params" ON public.pricing_params FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "admin updates params" ON public.pricing_params FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "admin writes site config" ON public.site_config;
CREATE POLICY "admin creates site config" ON public.site_config FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE POLICY "admin updates site config" ON public.site_config FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "staff writes customers" ON public.customers;
CREATE POLICY "staff creates customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes customers" ON public.customers FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

DROP POLICY IF EXISTS "staff manages categories" ON public.product_categories;
CREATE POLICY "staff reads categories" ON public.product_categories FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff creates categories" ON public.product_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates categories" ON public.product_categories FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes categories" ON public.product_categories FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

DROP POLICY IF EXISTS "staff manages products" ON public.products;
CREATE POLICY "staff reads products" ON public.products FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff creates products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

DROP POLICY IF EXISTS "staff manages variants" ON public.product_variants;
CREATE POLICY "staff reads variants" ON public.product_variants FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff creates variants" ON public.product_variants FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates variants" ON public.product_variants FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes variants" ON public.product_variants FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

DROP POLICY IF EXISTS "staff manages option groups" ON public.product_option_groups;
CREATE POLICY "staff reads option groups" ON public.product_option_groups FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff creates option groups" ON public.product_option_groups FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates option groups" ON public.product_option_groups FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes option groups" ON public.product_option_groups FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

DROP POLICY IF EXISTS "staff manages option values" ON public.product_option_values;
CREATE POLICY "staff reads option values" ON public.product_option_values FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff creates option values" ON public.product_option_values FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates option values" ON public.product_option_values FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes option values" ON public.product_option_values FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));

DROP POLICY IF EXISTS "staff manages quote items" ON public.quote_items;
CREATE POLICY "staff creates quote items" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff updates quote items" ON public.quote_items FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
CREATE POLICY "staff deletes quote items" ON public.quote_items FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'staff'));
