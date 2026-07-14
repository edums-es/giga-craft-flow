import { supabase } from "@/integrations/supabase/client";

type LooseResult = {
  data: unknown;
  error: unknown;
};

export type LooseQuery = PromiseLike<LooseResult> & {
  select: (...args: unknown[]) => LooseQuery;
  insert: (...args: unknown[]) => LooseQuery;
  update: (...args: unknown[]) => LooseQuery;
  delete: (...args: unknown[]) => LooseQuery;
  eq: (...args: unknown[]) => LooseQuery;
  order: (...args: unknown[]) => LooseQuery;
  limit: (...args: unknown[]) => LooseQuery;
  single: () => LooseQuery;
};

export const looseSupabase = supabase as unknown as {
  from: (table: string) => LooseQuery;
};
