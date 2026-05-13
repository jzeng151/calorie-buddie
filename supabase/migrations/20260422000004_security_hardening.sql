-- Security hardening for users + friendships.
-- Closes three pre-launch issues found in the v0.1.0 review:
--   1. onboarding_completed read from client-writable user_metadata → unauthorized self-promotion
--   2. users SELECT USING (true) leaked daily_calorie_target + arbitrary user enumeration
--   3. friendships UPDATE lacked WITH CHECK; allowed self-friending and direction flipping

-- ── users: drop blanket SELECT, replace with safe search RPC ──────────────────

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.users;

-- Reinstate self-only SELECT (other code paths use SECURITY DEFINER RPCs for
-- the small slice of cross-user reads we actually need).
-- The original self-SELECT policy from migration 0 is still in place.

-- Search users by username prefix. Returns ONLY safe columns; never exposes
-- daily_calorie_target or any future PII. Escapes ILIKE wildcards in the
-- search term so a single `%` cannot harvest the user table.
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

-- Hydrate display info + calorie target for accepted friends only. The calorie
-- target is shared-with-friends; never expose it to non-friends. The function
-- gate-checks each requested ID against the friendships table.
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

-- Hydrate display info for outstanding incoming/outgoing friend requests.
-- Bounded to rows the caller is a party to (via friendships RLS check inline).
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

-- ── friendships: tighten UPDATE policy, block self-friending + direction dups ─

DROP POLICY IF EXISTS "Addressees can accept requests" ON public.friendships;

CREATE POLICY "Addressees can accept requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (
    auth.uid() = addressee_id
    AND status IN ('pending', 'accepted')
  );

-- WITH CHECK can't reference OLD values, so column immutability for id,
-- requester_id, and addressee_id is enforced with a BEFORE UPDATE trigger.
-- Without this, an addressee could rewrite requester_id and forge an accepted
-- friendship with a user who never sent a request.
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

DROP TRIGGER IF EXISTS friendships_pin_identity_trg ON public.friendships;
CREATE TRIGGER friendships_pin_identity_trg
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.friendships_pin_identity();

-- Disallow (A→B) and (B→A) coexisting. The original UNIQUE(requester, addressee)
-- only blocked exact-direction duplicates. Self-friend is already blocked by
-- the friendships_no_self_friend CHECK on the table.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unordered_pair_uniq
  ON public.friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

-- ── Indexes: hot query paths from /menu, /home, /history, /friends ────────────

CREATE INDEX IF NOT EXISTS meals_log_user_logged_at_idx
  ON public.meals_log (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS friendships_requester_idx
  ON public.friendships (requester_id);
