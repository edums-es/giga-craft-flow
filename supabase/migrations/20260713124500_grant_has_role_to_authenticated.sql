-- RLS policies call has_role() to decide whether the logged user is staff/admin.
-- Authenticated users must be allowed to execute it, otherwise every protected
-- admin query returns 403 before the policy can evaluate the role row.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
