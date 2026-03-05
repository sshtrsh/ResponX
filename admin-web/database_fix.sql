-- ============================================================================
-- ResponX — SAFE PATCH (Does NOT delete any data!)
-- ============================================================================
-- Run this in Supabase → SQL Editor to fix admin login & role assignment
-- without dropping any tables or losing data.
-- ============================================================================


-- 0. Fix reports table: add missing actioned_by column
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS actioned_by TEXT;

-- 0b. Fix jurisdiction leak: barangay admins were seeing all verified reports
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_select_public_verified" ON public.reports;
CREATE POLICY "reports_select_public_verified"
  ON public.reports FOR SELECT
  USING (status IN ('Verified', 'Resolved'));
-- ============================================================================


-- 1. Fix helper functions
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_jurisdiction()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jurisdiction FROM public.profiles WHERE id = auth.uid();
$$;


-- 2. Fix profiles policies (so super_admin can change roles)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "profiles_select_safe" ON public.profiles;
CREATE POLICY "profiles_select_safe"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR role IN ('super_admin', 'police_admin', 'barangay_admin')
  );

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());


-- 3. Add 'role' column to agency_whitelist if missing
ALTER TABLE public.agency_whitelist
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'barangay_admin';


-- 4. Fix agency_whitelist policies
DROP POLICY IF EXISTS "whitelist_select" ON public.agency_whitelist;
CREATE POLICY "whitelist_select"
  ON public.agency_whitelist FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "whitelist_insert_admin" ON public.agency_whitelist;
CREATE POLICY "whitelist_insert_admin"
  ON public.agency_whitelist FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "whitelist_update_admin" ON public.agency_whitelist;
CREATE POLICY "whitelist_update_admin"
  ON public.agency_whitelist FOR UPDATE
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "whitelist_delete_admin" ON public.agency_whitelist;
CREATE POLICY "whitelist_delete_admin"
  ON public.agency_whitelist FOR DELETE
  USING (public.get_user_role() = 'super_admin');


-- 5. Fix audit_logs policies
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.get_user_role() = 'super_admin');


-- 6. Create report_updates table if missing
CREATE TABLE IF NOT EXISTS public.report_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('edit', 'follow_up')),
  message TEXT,
  image_url TEXT,
  previous_values JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.report_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_updates_select_own" ON public.report_updates;
CREATE POLICY "report_updates_select_own"
  ON public.report_updates FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin')
  );

DROP POLICY IF EXISTS "report_updates_insert_own" ON public.report_updates;
CREATE POLICY "report_updates_insert_own"
  ON public.report_updates FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reports WHERE id = report_id AND user_id = auth.uid()
    )
  );


-- 7. Upgrade signup trigger (auto-assign from whitelist!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  whitelist_role TEXT;
  whitelist_jurisdiction TEXT;
BEGIN
  -- Check if this email was pre-authorized in agency_whitelist
  SELECT role, agency_name INTO whitelist_role, whitelist_jurisdiction
  FROM public.agency_whitelist
  WHERE email = LOWER(new.email)
  LIMIT 1;

  INSERT INTO public.profiles (id, full_name, email, role, jurisdiction, verification_status)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    COALESCE(whitelist_role, 'resident'),
    whitelist_jurisdiction,
    CASE WHEN whitelist_role IS NOT NULL THEN 'verified' ELSE 'pending' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 8. Fix any existing admins whose roles were lost
-- (Only updates users who currently have 'resident' but should be admin)
-- Uncomment and edit the lines below for your specific accounts:

-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'tanjirodazai05@gmail.com';
-- UPDATE public.profiles SET role = 'super_admin', jurisdiction = 'Calamba' WHERE email = 'superadmin@example.com';
-- UPDATE public.profiles SET role = 'barangay_admin', jurisdiction = 'Canlubang' WHERE email = 'canlubang@example.com';
-- UPDATE public.profiles SET role = 'barangay_admin', jurisdiction = 'Real' WHERE email = 'real@example.com';
-- UPDATE public.profiles SET role = 'barangay_admin', jurisdiction = 'Mayapa' WHERE email = 'mayapa@example.com';
-- UPDATE public.profiles SET role = 'barangay_admin', jurisdiction = 'Bucal' WHERE email = 'bucal@example.com';
-- UPDATE public.profiles SET role = 'police_admin', jurisdiction = 'Calamba' WHERE email = 'police1@example.com';


-- 9. Verify: Show all users and their roles
SELECT email, role, jurisdiction, verification_status FROM public.profiles ORDER BY role, email;
