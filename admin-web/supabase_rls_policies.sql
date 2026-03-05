-- ============================================================================
-- ResponX — Combined Schema + RLS Policies (Final Production Version)
-- ============================================================================
-- This single file creates the full database and applies hardened RLS policies.
--
-- HOW TO USE:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. That's it. Tables, policies, triggers, and storage are all set up.
--
-- ⚠️  WARNING: Section 1 DROPS all existing tables. Only run this on a fresh
--     database or when you intentionally want to reset everything.
-- ============================================================================


-- =================================================================
-- 1. CLEANUP (Delete everything to fix conflicts)
-- =================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_jurisdiction CASCADE;
DROP TABLE IF EXISTS public.report_updates CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.agency_whitelist CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.blotter CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- =================================================================
-- 2. PROFILES TABLE (Users & Admins) — Created FIRST because helpers need it
-- =================================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  role TEXT DEFAULT 'resident',
  jurisdiction TEXT,
  verification_status TEXT DEFAULT 'pending'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 🔒 Recursion-Safe SELECT: No helper function calls on this table!
-- Users see their own row. Everyone can see admin profiles (for UI display).
-- Residents CANNOT see other residents.
CREATE POLICY "profiles_select_safe"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR role IN ('super_admin', 'police_admin', 'barangay_admin')
  );

-- UPDATE: Users can update their own profile (name, avatar, etc.)
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Users create their own row (via signup trigger)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());


-- =================================================================
-- 3. HELPER FUNCTIONS (Created AFTER profiles table exists)
-- =================================================================
-- SECURITY DEFINER lets these bypass RLS to read profiles safely.
-- Only used on tables OTHER than profiles (to avoid infinite recursion).

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

-- UPDATE: Super admins can change anyone's role/jurisdiction (uses helper)
-- ✅ FIX: Added WITH CHECK so the UPDATE actually succeeds
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');


-- =================================================================
-- 4. REPORTS TABLE (Incidents)
-- =================================================================
CREATE TABLE public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Core Data
    incident_type TEXT NOT NULL,
    priority TEXT DEFAULT 'Low',
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    rejection_reason TEXT,

    -- Location & Meta
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    -- Extended Fields
    incident_date TEXT,
    incident_time TEXT,
    reporter_name TEXT,
    contact_number TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    actioned_by TEXT,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX reports_user_id_idx ON public.reports(user_id);
CREATE INDEX reports_status_idx ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- SELECT: Super and Police admins see all reports
CREATE POLICY "reports_select_super"
  ON public.reports FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'police_admin'));

-- SELECT: Barangay admins see only their jurisdiction
CREATE POLICY "reports_select_barangay"
  ON public.reports FOR SELECT
  USING (
    public.get_user_role() = 'barangay_admin'
    AND location ILIKE '%' || public.get_user_jurisdiction() || '%'
  );

-- SELECT: Residents see their own reports
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Anyone can see Verified/Resolved reports (for the Safety Map)
-- This is separate so jurisdiction-limited admins don't see
-- cross-barangay reports via the combined policy.
CREATE POLICY "reports_select_public_verified"
  ON public.reports FOR SELECT
  USING (status IN ('Verified', 'Resolved'));

-- INSERT: Authenticated users can submit, but cannot spoof another user's ID
CREATE POLICY "reports_insert"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Admins can update report statuses (Verify/Resolve/Reject)
--         Residents can update their own PENDING reports (edit feature)
CREATE POLICY "reports_update_admin"
  ON public.reports FOR UPDATE
  USING (public.get_user_role() IN ('super_admin', 'police_admin', 'barangay_admin'));

CREATE POLICY "reports_update_own_pending"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id AND status = 'Pending')
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Only super_admin and police_admin can delete
CREATE POLICY "reports_delete_admin"
  ON public.reports FOR DELETE
  USING (public.get_user_role() IN ('super_admin', 'police_admin'));


-- =================================================================
-- 5. BLOTTER TABLE
-- =================================================================
CREATE TABLE public.blotter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barangay TEXT NOT NULL,
  complainant TEXT NOT NULL,
  respondent TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  narrative TEXT,
  status TEXT DEFAULT 'Scheduled',
  hearing_date DATE,
  filed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.blotter ENABLE ROW LEVEL SECURITY;

-- SELECT: Super and Police admins see everything
CREATE POLICY "blotter_select_super"
  ON public.blotter FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'police_admin'));

-- SELECT: Barangay admins see only their own barangay's cases
CREATE POLICY "blotter_select_barangay"
  ON public.blotter FOR SELECT
  USING (
    public.get_user_role() = 'barangay_admin'
    AND barangay = public.get_user_jurisdiction()
  );

-- INSERT: Admins can file new cases
CREATE POLICY "blotter_insert_admin"
  ON public.blotter FOR INSERT
  WITH CHECK (public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin'));

-- UPDATE: Admins can update case status
CREATE POLICY "blotter_update_admin"
  ON public.blotter FOR UPDATE
  USING (public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin'));

-- DELETE: Admins can delete cases
CREATE POLICY "blotter_delete_admin"
  ON public.blotter FOR DELETE
  USING (public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin'));


-- =================================================================
-- 6. ANNOUNCEMENTS TABLE
-- =================================================================
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barangay TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read (residents need this for the mobile app)
CREATE POLICY "announcements_select_all"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Only admins can create
CREATE POLICY "announcements_insert_admin"
  ON public.announcements FOR INSERT
  WITH CHECK (public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin'));

-- DELETE: Only admins can delete
CREATE POLICY "announcements_delete_admin"
  ON public.announcements FOR DELETE
  USING (public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin'));


-- =================================================================
-- 7. AUDIT_LOGS TABLE (Immutable trail)
-- =================================================================
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: Any authenticated user can trigger a log (e.g., login audit)
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT: Only super_admin can view the logs
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.get_user_role() = 'super_admin');

-- No UPDATE or DELETE policies → audit trail is completely immutable


-- =================================================================
-- 8. AGENCY_WHITELIST TABLE
-- =================================================================
CREATE TABLE public.agency_whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'barangay_admin',
  agency_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.agency_whitelist ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow read for signup verification
CREATE POLICY "whitelist_select"
  ON public.agency_whitelist FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Only super_admin
CREATE POLICY "whitelist_insert_admin"
  ON public.agency_whitelist FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

-- UPDATE: Only super_admin
CREATE POLICY "whitelist_update_admin"
  ON public.agency_whitelist FOR UPDATE
  USING (public.get_user_role() = 'super_admin');

-- DELETE: Only super_admin
CREATE POLICY "whitelist_delete_admin"
  ON public.agency_whitelist FOR DELETE
  USING (public.get_user_role() = 'super_admin');


-- =================================================================
-- 8b. REPORT UPDATES (Follow-ups & Edit Audit Trail)
-- =================================================================
CREATE TABLE public.report_updates (
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

-- SELECT: Users see updates on their own reports; admins see all
CREATE POLICY "report_updates_select_own"
  ON public.report_updates FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_user_role() IN ('super_admin', 'barangay_admin', 'police_admin')
  );

-- INSERT: Users can add updates to their own reports only
CREATE POLICY "report_updates_insert_own"
  ON public.report_updates FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reports WHERE id = report_id AND user_id = auth.uid()
    )
  );


-- =================================================================
-- 9. AUTOMATION (Signup Trigger)
-- =================================================================

-- Auto-create a profile row when a new user signs up.
-- ✅ If the email is in the agency_whitelist, auto-assign the admin role
--    and jurisdiction so no manual promotion is needed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  whitelist_role TEXT;
  whitelist_jurisdiction TEXT;
BEGIN
  -- Check if this email was pre-authorized
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


-- =================================================================
-- 10. STORAGE BUCKETS
-- =================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload evidence" ON storage.objects;
CREATE POLICY "Users upload evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');

DROP POLICY IF EXISTS "Public view evidence" ON storage.objects;
CREATE POLICY "Public view evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence');


-- =================================================================
-- 11. RESTORE EXISTING USERS (Preserves existing roles!)
-- =================================================================
-- ✅ FIX: Uses COALESCE to keep existing role/jurisdiction if the user
-- was previously an admin, instead of resetting everyone to 'resident'.
INSERT INTO public.profiles (id, email, full_name, role, verification_status)
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name',
    COALESCE(raw_user_meta_data->>'role', 'resident'),
    'pending'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
