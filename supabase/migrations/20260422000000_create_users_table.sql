-- Profile table for app users. `id` mirrors auth.users(id); RLS keeps direct
-- table access self-only. Cross-user reads happen through SECURITY DEFINER
-- RPCs (search_users below, get_friend_profiles in the friendships migration)
-- which return only safe columns.

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  daily_calorie_target INTEGER NOT NULL DEFAULT 2000
    CHECK (daily_calorie_target > 0),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- WITH CHECK pins the post-update id to the caller's auth.uid() so a user
-- can't rewrite their own row's id to another auth.users UUID and tamper
-- with an account that doesn't yet have a public.users row.
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Search users by username prefix. Returns ONLY safe columns; never exposes
-- daily_calorie_target or any future PII. Escapes ILIKE wildcards so a single
-- `%` cannot harvest the user table.
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT)
RETURNS TABLE (id UUID, username TEXT, avatar_url TEXT)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT u.id, u.username, u.avatar_url
  FROM public.users u
  WHERE u.username IS NOT NULL
    AND u.id <> auth.uid()
    AND u.username ILIKE '%' ||
      replace(replace(replace(coalesce(search_query, ''), '\', '\\'), '%', '\%'), '_', '\_')
      || '%' ESCAPE '\'
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_users(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;
