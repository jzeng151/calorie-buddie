CREATE TABLE IF NOT EXISTS public.meals_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories_per_serving INTEGER NOT NULL,
  servings NUMERIC(6,2) NOT NULL DEFAULT 1,
  meal_type TEXT NOT NULL DEFAULT 'snack'
    CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meals_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meals"
  ON public.meals_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meals"
  ON public.meals_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals"
  ON public.meals_log FOR DELETE
  USING (auth.uid() = user_id);

-- Hot query path: /home, /menu, /history all hit (user_id, logged_at DESC).
CREATE INDEX IF NOT EXISTS meals_log_user_logged_at_idx
  ON public.meals_log (user_id, logged_at DESC);
