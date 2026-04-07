-- ============================================================================
-- AUDIT LOGGING TRIGGERS
-- Automatically tracks critical changes to reports and user accounts.
-- ============================================================================

-- 1. Function to log report status changes
CREATE OR REPLACE FUNCTION public.log_report_changes()
RETURNS TRIGGER AS $$
DECLARE
  acting_user_id UUID;
BEGIN
  -- We try to get auth.uid() (the user making the request via client)
  -- If it's null, the change was made via service_role or backend process
  acting_user_id := auth.uid();

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      acting_user_id,
      'Update Report Status',
      'Changed report ' || NEW.id || ' status from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map trigger to Reports table
DROP TRIGGER IF EXISTS trigger_log_report_changes ON public.reports;
CREATE TRIGGER trigger_log_report_changes
AFTER UPDATE ON public.reports
FOR EACH ROW EXECUTE PROCEDURE public.log_report_changes();


-- 2. Function to log profile role/jurisdiction changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
  acting_user_id UUID;
BEGIN
  acting_user_id := auth.uid();

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      acting_user_id,
      'Update User Role',
      'Changed user ' || COALESCE(NEW.email, NEW.id::text) || ' role from ' || OLD.role || ' to ' || NEW.role
    );
  END IF;

  IF OLD.jurisdiction IS DISTINCT FROM NEW.jurisdiction THEN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
      acting_user_id,
      'Update User Jurisdiction',
      'Changed user ' || COALESCE(NEW.email, NEW.id::text) || ' jurisdiction from ' || COALESCE(OLD.jurisdiction, 'None') || ' to ' || COALESCE(NEW.jurisdiction, 'None')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map trigger to Profiles table
DROP TRIGGER IF EXISTS trigger_log_profile_changes ON public.profiles;
CREATE TRIGGER trigger_log_profile_changes
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.log_profile_changes();
