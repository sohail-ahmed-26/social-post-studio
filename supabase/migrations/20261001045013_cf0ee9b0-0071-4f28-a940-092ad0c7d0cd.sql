CREATE OR REPLACE FUNCTION public.smm_owns_brand(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.smm_brands b WHERE b.id = _brand_id AND b.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.smm_owns_post(_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.smm_posts p
    JOIN public.smm_brands b ON b.id = p.brand_id
    WHERE p.id = _post_id AND b.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.smm_owns_schedule(_schedule_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.smm_schedules s
    JOIN public.smm_posts p ON p.id = s.post_id
    JOIN public.smm_brands b ON b.id = p.brand_id
    WHERE s.id = _schedule_id AND b.user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.smm_owns_brand(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smm_owns_post(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.smm_owns_schedule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smm_owns_brand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.smm_owns_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.smm_owns_schedule(uuid) TO authenticated;