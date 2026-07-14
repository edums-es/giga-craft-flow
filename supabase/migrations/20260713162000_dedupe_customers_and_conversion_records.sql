WITH ranked_customers AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')
      ORDER BY created_at ASC, id ASC
    ) AS keep_id,
    row_number() OVER (
      PARTITION BY regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')
      ORDER BY created_at ASC, id ASC
    ) AS row_number,
    regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g') AS phone_key
  FROM public.customers
),
duplicates AS (
  SELECT id, keep_id
  FROM ranked_customers
  WHERE phone_key <> ''
    AND row_number > 1
)
UPDATE public.quotes q
SET customer_id = d.keep_id
FROM duplicates d
WHERE q.customer_id = d.id;

WITH ranked_customers AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')
      ORDER BY created_at ASC, id ASC
    ) AS row_number,
    regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g') AS phone_key
  FROM public.customers
)
DELETE FROM public.customers c
USING ranked_customers r
WHERE c.id = r.id
  AND r.phone_key <> ''
  AND r.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS customers_whatsapp_digits_unique
ON public.customers ((regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')))
WHERE regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS orders_quote_id_unique
ON public.orders (quote_id)
WHERE quote_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS revenues_quote_id_unique
ON public.revenues (quote_id)
WHERE quote_id IS NOT NULL;
