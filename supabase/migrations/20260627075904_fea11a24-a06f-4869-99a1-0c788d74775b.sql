
-- 1. Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- 2. Lock down user_roles writes (RLS already enabled; add explicit restrictive denials)
CREATE POLICY "No client inserts on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- 3. RLS on realtime.messages — scope feedback channel to authenticated users
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read feedback-community channel"
  ON realtime.messages FOR SELECT TO authenticated
  USING (realtime.topic() = 'feedback-community');

CREATE POLICY "Authenticated can send to feedback-community channel"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (realtime.topic() = 'feedback-community');
