-- Codex pre-landing review (PR #1) flagged three cross-user data leaks /
-- privilege issues in earlier migrations. Earlier migrations were already
-- applied in prod; this is a fixup migration rather than an in-place edit.
--
--   1. get_friend_daily_stats — friend_ids accepted from caller without a
--      friendship gate. Any signed-in user could query any user's daily kcal.
--   2. compute_user_streak — same shape: target_user_id with no auth check.
--      Leaks meal-logging cadence for arbitrary users.
--   3. friendships UPDATE policy — WITH CHECK only pinned addressee_id and
--      status, so an addressee could mutate requester_id to forge an
--      "accepted" friendship with someone who never sent a request.

-- ── 1. get_friend_daily_stats: gate on accepted friendship ────────────────────

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

-- ── 2. compute_user_streak: gate on self or accepted friendship ───────────────

CREATE OR REPLACE FUNCTION public.compute_user_streak(target_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  WITH authorized AS (
    SELECT 1
    WHERE target_user_id = auth.uid()
       OR EXISTS (
         SELECT 1 FROM public.friendships f
         WHERE f.status = 'accepted'
           AND (
             (f.requester_id = auth.uid() AND f.addressee_id = target_user_id)
             OR (f.addressee_id = auth.uid() AND f.requester_id = target_user_id)
           )
       )
  ),
  active_days AS (
    SELECT DISTINCT date_trunc('day', logged_at)::date AS day
    FROM public.meals_log
    WHERE user_id = target_user_id
      AND logged_at >= NOW() - INTERVAL '400 days'
      AND EXISTS (SELECT 1 FROM authorized)
  ),
  numbered AS (
    SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn
    FROM active_days
    WHERE day <= CURRENT_DATE
  )
  SELECT COALESCE(
    (SELECT COUNT(*)::INTEGER FROM numbered
      WHERE day = CURRENT_DATE - (rn - 1) * INTERVAL '1 day'),
    0
  );
$$;

REVOKE ALL ON FUNCTION public.compute_user_streak(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_user_streak(UUID) TO authenticated;

-- ── 3. friendships UPDATE: pin requester_id, addressee_id, id ───────────────
-- WITH CHECK cannot reference OLD values, so column immutability is enforced
-- with a BEFORE UPDATE trigger. The existing RLS policy still gates which
-- rows the addressee can touch; this trigger stops them from rewriting the
-- requester column (which would forge an "accepted" friendship with a user
-- who never sent a request).

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
