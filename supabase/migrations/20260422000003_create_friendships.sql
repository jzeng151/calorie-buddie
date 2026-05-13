-- Friendships: directed request rows (requester_id, addressee_id) that flip
-- to status='accepted' on the addressee's UPDATE. RLS keeps each row visible
-- only to its two parties; cross-user reads go through SECURITY DEFINER RPCs
-- below which gate on accepted-friendship-with-auth.uid().

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CONSTRAINT friendships_no_self_friend CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Pin status to 'pending' on INSERT. Without this, a requester could insert
-- a row with status='accepted' targeting any user and immediately unlock the
-- friend-gated RPCs without the addressee's consent.
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- Addressee may flip status pending → accepted. WITH CHECK rejects any other
-- transition. Column immutability for id/requester_id/addressee_id is enforced
-- by the trigger below (WITH CHECK can't reference OLD).
CREATE POLICY "Addressees can accept requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (
    auth.uid() = addressee_id
    AND status IN ('pending', 'accepted')
  );

CREATE POLICY "Users can remove friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Pin id, requester_id, addressee_id on UPDATE. Without this an addressee
-- could rewrite requester_id and forge an accepted friendship with a user
-- who never sent a request.
CREATE OR REPLACE FUNCTION public.friendships_pin_identity()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'friendships.id is immutable';
  END IF;
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id THEN
    RAISE EXCEPTION 'friendships.requester_id is immutable';
  END IF;
  IF NEW.addressee_id IS DISTINCT FROM OLD.addressee_id THEN
    RAISE EXCEPTION 'friendships.addressee_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_pin_identity_trg
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.friendships_pin_identity();

-- Disallow (A→B) and (B→A) coexisting. UNIQUE(requester_id, addressee_id)
-- alone would let both directions live as separate rows.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unordered_pair_uniq
  ON public.friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

-- Hot query paths for incoming/outgoing requests on /friends.
CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS friendships_requester_idx
  ON public.friendships (requester_id);

-- ── Cross-user read RPCs ─────────────────────────────────────────────────────
-- All three are SECURITY DEFINER + gate on auth.uid() so direct table RLS
-- stays self-only while the app can still hydrate friend display info.

-- Today's logged kcal for a set of users. Each requested user_id must be
-- auth.uid() itself or have an accepted friendship row with auth.uid().
CREATE OR REPLACE FUNCTION public.get_friend_daily_stats(friend_ids UUID[])
RETURNS TABLE (user_id UUID, total_kcal INTEGER)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT
    ml.user_id,
    COALESCE(SUM(ROUND(ml.calories_per_serving * ml.servings)), 0)::INTEGER
  FROM public.meals_log ml
  WHERE ml.user_id = ANY(friend_ids)
    AND ml.logged_at >= date_trunc('day', NOW())
    AND (
      ml.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = ml.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = ml.user_id)
          )
      )
    )
  GROUP BY ml.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_friend_daily_stats(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_daily_stats(UUID[]) TO authenticated;

-- Display info + calorie target for accepted friends. daily_calorie_target
-- is shared-with-friends, never with non-friends — the inline EXISTS check
-- enforces that.
CREATE OR REPLACE FUNCTION public.get_friend_profiles(friend_ids UUID[])
RETURNS TABLE (id UUID, username TEXT, avatar_url TEXT, daily_calorie_target INTEGER)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT u.id, u.username, u.avatar_url, u.daily_calorie_target
  FROM public.users u
  WHERE u.id = ANY(friend_ids)
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = u.id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = u.id)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.get_friend_profiles(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(UUID[]) TO authenticated;

-- Display info for incoming/outgoing pending requests. Caller must already
-- be a party to the friendship row (pending OR accepted), so this is bounded
-- by the friendships RLS shape inline.
CREATE OR REPLACE FUNCTION public.get_request_profiles(other_ids UUID[])
RETURNS TABLE (id UUID, username TEXT, avatar_url TEXT)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT u.id, u.username, u.avatar_url
  FROM public.users u
  WHERE u.id = ANY(other_ids)
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (
        (f.requester_id = auth.uid() AND f.addressee_id = u.id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = u.id)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_request_profiles(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_request_profiles(UUID[]) TO authenticated;
