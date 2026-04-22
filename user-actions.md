# User Actions

Things you need to do manually as features are built.

---

## Supabase: create the `users` table

After the onboarding flow was added, a migration was created at:

```
supabase/migrations/20260422000000_create_users_table.sql
```

**Run this SQL in the Supabase dashboard** (SQL Editor → New query → paste → Run):

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  daily_calorie_target INTEGER NOT NULL DEFAULT 2000,
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

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
```

---

## Supabase: create the `meals_log` table

After meal logging was added, a migration was created at:

```
supabase/migrations/20260422000001_create_meals_log_table.sql
```

**Run this SQL in the Supabase dashboard** (SQL Editor → New query → paste → Run):

```sql
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
```

---

## Supabase: create the `recipes` table + seed data

After "Help Me Decide!" was added, a migration was created at:

```
supabase/migrations/20260422000002_create_recipes_table.sql
```

**Run this SQL in the Supabase dashboard** (SQL Editor → New query → paste → Run).  
This creates the table, sets RLS to public-read, and seeds 20 starter recipes.  
Full SQL is in the migration file above.

---

## Supabase: friendships table + friend stats function

After the Friends page was added, a migration was created at:

```
supabase/migrations/20260422000003_create_friendships.sql
```

**Run this SQL in the Supabase dashboard** (SQL Editor → New query → paste → Run).  
Full SQL is in the migration file above. It:
- Adds a policy so authenticated users can read all profiles (needed for friend search)
- Creates the `friendships` table with RLS
- Creates the `get_friend_daily_stats(uuid[])` function (SECURITY DEFINER, safe aggregate)
