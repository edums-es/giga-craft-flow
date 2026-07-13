
-- Fix search_path on triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Restrict has_role execution (policies still work: RLS runs as table owner)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Replace overly-permissive INSERT policies with more explicit shape validation
DROP POLICY IF EXISTS "anon can create quote" ON public.quotes;
DROP POLICY IF EXISTS "auth can create quote" ON public.quotes;
CREATE POLICY "anon creates quote with minimum fields" ON public.quotes
  FOR INSERT TO anon
  WITH CHECK (
    length(cliente_nome) BETWEEN 2 AND 120
    AND length(cliente_whatsapp) BETWEEN 6 AND 30
    AND jsonb_typeof(items) = 'array'
    AND total >= 0
  );
CREATE POLICY "auth creates quote" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (length(cliente_nome) >= 2);
