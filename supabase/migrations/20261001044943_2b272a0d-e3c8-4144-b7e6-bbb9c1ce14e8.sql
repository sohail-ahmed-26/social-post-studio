CREATE TABLE public.smm_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  html text NOT NULL DEFAULT '',
  css text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smm_templates TO authenticated;
GRANT ALL ON public.smm_templates TO service_role;
ALTER TABLE public.smm_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are readable by signed-in users" ON public.smm_templates FOR SELECT TO authenticated USING (true);

CREATE TABLE public.smm_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  tone text NOT NULL DEFAULT 'friendly',
  colors jsonb NOT NULL DEFAULT '{"primary":"#059669","accent":"#06b6d4"}'::jsonb,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_brands TO authenticated;
GRANT ALL ON public.smm_brands TO service_role;
ALTER TABLE public.smm_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own brands" ON public.smm_brands FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.smm_owns_brand(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.smm_brands b WHERE b.id = _brand_id AND b.user_id = auth.uid())
$$;

CREATE TABLE public.smm_social_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.smm_brands(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_name text,
  external_id text,
  access_token_encrypted text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_social_accounts TO authenticated;
GRANT ALL ON public.smm_social_accounts TO service_role;
ALTER TABLE public.smm_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage accounts of their brands" ON public.smm_social_accounts FOR ALL TO authenticated USING (public.smm_owns_brand(brand_id)) WITH CHECK (public.smm_owns_brand(brand_id));

CREATE TABLE public.smm_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.smm_brands(id) ON DELETE CASCADE,
  topic text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  hashtags text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  template_id uuid REFERENCES public.smm_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_posts TO authenticated;
GRANT ALL ON public.smm_posts TO service_role;
ALTER TABLE public.smm_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage posts of their brands" ON public.smm_posts FOR ALL TO authenticated USING (public.smm_owns_brand(brand_id)) WITH CHECK (public.smm_owns_brand(brand_id));

CREATE OR REPLACE FUNCTION public.smm_owns_post(_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.smm_posts p
    JOIN public.smm_brands b ON b.id = p.brand_id
    WHERE p.id = _post_id AND b.user_id = auth.uid()
  )
$$;

CREATE TABLE public.smm_post_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.smm_posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_post_assets TO authenticated;
GRANT ALL ON public.smm_post_assets TO service_role;
ALTER TABLE public.smm_post_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage assets of their posts" ON public.smm_post_assets FOR ALL TO authenticated USING (public.smm_owns_post(post_id)) WITH CHECK (public.smm_owns_post(post_id));

CREATE TABLE public.smm_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.smm_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_schedules TO authenticated;
GRANT ALL ON public.smm_schedules TO service_role;
ALTER TABLE public.smm_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage schedules of their posts" ON public.smm_schedules FOR ALL TO authenticated USING (public.smm_owns_post(post_id)) WITH CHECK (public.smm_owns_post(post_id));

CREATE OR REPLACE FUNCTION public.smm_owns_schedule(_schedule_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.smm_schedules s
    JOIN public.smm_posts p ON p.id = s.post_id
    JOIN public.smm_brands b ON b.id = p.brand_id
    WHERE s.id = _schedule_id AND b.user_id = auth.uid()
  )
$$;

CREATE TABLE public.smm_publish_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.smm_schedules(id) ON DELETE CASCADE,
  platform text NOT NULL,
  response jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_publish_logs TO authenticated;
GRANT ALL ON public.smm_publish_logs TO service_role;
ALTER TABLE public.smm_publish_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage logs of their schedules" ON public.smm_publish_logs FOR ALL TO authenticated USING (public.smm_owns_schedule(schedule_id)) WITH CHECK (public.smm_owns_schedule(schedule_id));

CREATE INDEX smm_posts_brand_idx ON public.smm_posts(brand_id);
CREATE INDEX smm_schedules_post_idx ON public.smm_schedules(post_id);
CREATE INDEX smm_schedules_at_idx ON public.smm_schedules(scheduled_at);
CREATE INDEX smm_logs_schedule_idx ON public.smm_publish_logs(schedule_id);

INSERT INTO public.smm_templates (name, category, html, css) VALUES
('Bold Statement', 'announcement', '<div class="tpl"><h1>{{topic}}</h1><p>{{caption}}</p></div>', '.tpl{background:#064e3b;color:#fff;padding:48px}'),
('Quote Card', 'quote', '<div class="tpl"><blockquote>{{caption}}</blockquote></div>', '.tpl{background:#f4f4f5;color:#18181b;padding:48px;font-style:italic}'),
('Product Launch', 'launch', '<div class="tpl"><span>New</span><h2>{{topic}}</h2><p>{{caption}}</p></div>', '.tpl{background:linear-gradient(135deg,#059669,#06b6d4);color:#fff;padding:48px}'),
('Tip of the Day', 'education', '<div class="tpl"><h3>Tip</h3><p>{{caption}}</p></div>', '.tpl{background:#fff;color:#18181b;border:8px solid #059669;padding:40px}'),
('Minimal Photo', 'photo', '<div class="tpl"><p>{{caption}}</p></div>', '.tpl{background:#18181b;color:#fafafa;padding:32px}'),
('Hiring Blast', 'recruiting', '<div class="tpl"><h2>We are hiring</h2><p>{{caption}}</p></div>', '.tpl{background:#f43f5e;color:#fff;padding:48px}');