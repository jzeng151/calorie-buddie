-- Allow all authenticated users to read any profile (needed for friend search + display)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressees can accept requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

CREATE POLICY "Users can remove friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Returns today's logged kcal for a set of user IDs (bypasses meals_log RLS safely)
CREATE OR REPLACE FUNCTION public.get_friend_daily_stats(friend_ids UUID[])
RETURNS TABLE (user_id UUID, total_kcal INTEGER)
SECURITY DEFINER SET search_path = public
LANGUAGE sql AS $$
  SELECT
    ml.user_id,
    COALESCE(SUM(ROUND(ml.calories_per_serving * ml.servings)), 0)::INTEGER
  FROM public.meals_log ml
  WHERE ml.user_id = ANY(friend_ids)
    AND ml.logged_at >= date_trunc('day', NOW())
  GROUP BY ml.user_id;
$$;
