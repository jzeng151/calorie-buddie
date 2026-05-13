-- Buddy feature: Tamagotchi-style health companion.
-- See ~/.gstack/projects/jzeng151-calorie-buddie/steve-main-design-20260512-003749.md
-- for the design doc; this migration implements the engineering review decisions
-- from /plan-eng-review (13 items) plus the recovery-acknowledgment column added
-- in /plan-design-review.
--
-- Shapes created:
--   • buddy_state            — one row per user, holds emotion + decor unlocks
--   • hydration_logs         — append-only water tap log
--   • compute_user_streak()  — derived consecutive-day streak from meals_log
--   • unlock_decor()         — append-only decor writer with slug allowlist
--   • log_hydration()        — capped insert (max 12/day) into hydration_logs
--   • get_friend_buddy_payload() — read-only friend room snapshot, friend-gated
--   • after_user_insert_create_buddy_state — trigger backfill for new users

-- ── buddy_state ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.buddy_state (
  user_id                   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  emotion                   TEXT NOT NULL DEFAULT 'neutral'
    CHECK (emotion IN ('happy', 'neutral', 'sleepy', 'scruffy', 'unwell', 'celebrating')),
  -- Append-only set of unlocked decor. Shape: { "<slug>": "<ISO timestamp>" }.
  decor_unlocks             JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Tracks which unlocks the user has seen a celebration animation for.
  -- Celebration fires for slugs present in decor_unlocks but absent here.
  acknowledged_unlocks      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Display name, optional. User sets at Day-0 home prompt; editable in profile.
  name                      TEXT,
  -- Tracks "user has seen current emotion" — gates the recovery animation so it
  -- fires once when scruffy/unwell transitions to happy/neutral, not on every
  -- recompute.
  last_acknowledged_emotion TEXT
    CHECK (last_acknowledged_emotion IS NULL OR last_acknowledged_emotion IN
      ('happy', 'neutral', 'sleepy', 'scruffy', 'unwell', 'celebrating')),
  last_recomputed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.buddy_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own buddy"
  ON public.buddy_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own buddy"
  ON public.buddy_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT is via the trigger below, not the client; no INSERT policy needed.
-- Friend reads go through get_friend_buddy_payload (SECURITY DEFINER), never RLS.

-- ── Backfill existing users + auto-create for new users ──────────────────────

INSERT INTO public.buddy_state (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.after_user_insert_create_buddy_state()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.buddy_state (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break user creation if buddy backfill fails. The next read of
  -- /buddy will create the row via the same upsert path.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_user_insert_create_buddy_state ON public.users;
CREATE TRIGGER after_user_insert_create_buddy_state
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.after_user_insert_create_buddy_state();

-- ── hydration_logs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hydration_logs_user_logged_at_idx
  ON public.hydration_logs (user_id, logged_at DESC);

ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hydration logs"
  ON public.hydration_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT goes through log_hydration() RPC (server-side daily cap).
-- DELETE via UI is not supported in v1 (append-only).

-- ── Streak (derived, never stored) ───────────────────────────────────────────
-- Returns the count of consecutive calendar days ending today on which the
-- user logged at least one meal. Day boundaries use server-local midnight
-- via date_trunc; the TZ-aware variant is a separate TODOS.md item.

-- target_user_id is gated on self-or-accepted-friend against auth.uid() so the
-- SECURITY DEFINER bypass of meals_log RLS can't leak meal cadence for
-- arbitrary users.
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

-- ── Decor unlocks: append-only writer with slug allowlist ────────────────────
-- The allowlist mirrors the unlock curve locked in /plan-design-review Pass 7:
--   water_bowl, plant, rug, treadmill, trophy, lamp.
-- Adding a new decor slug = ALTER this function (one place, no schema dance).

CREATE OR REPLACE FUNCTION public.unlock_decor(target_user_id UUID, slug TEXT)
RETURNS public.buddy_state
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  allowed CONSTANT TEXT[] := ARRAY[
    'water_bowl', 'plant', 'rug', 'treadmill', 'trophy', 'lamp'
  ];
  result public.buddy_state;
BEGIN
  -- Only the user themselves may unlock their own decor.
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'unlock_decor: caller is not the target user';
  END IF;

  IF slug IS NULL OR NOT (slug = ANY(allowed)) THEN
    RAISE EXCEPTION 'unlock_decor: slug % is not allowed', slug;
  END IF;

  -- Append-only: do NOT overwrite an existing unlock timestamp.
  UPDATE public.buddy_state b
  SET decor_unlocks = CASE
        WHEN b.decor_unlocks ? slug THEN b.decor_unlocks
        ELSE b.decor_unlocks || jsonb_build_object(slug, to_jsonb(NOW()))
      END,
      last_recomputed_at = NOW()
  WHERE b.user_id = target_user_id
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unlock_decor: no buddy_state row for user %', target_user_id;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_decor(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_decor(UUID, TEXT) TO authenticated;

-- ── Hydration writer: server-side daily cap ──────────────────────────────────
-- Caps at 12 logs per calendar day (matches the design doc). Returns the new
-- count so the client can update the hydration counter without a follow-up
-- SELECT.

CREATE OR REPLACE FUNCTION public.log_hydration()
RETURNS INTEGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  cap          CONSTANT INTEGER := 12;
  caller       UUID := auth.uid();
  today_count  INTEGER;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'log_hydration: not authenticated';
  END IF;

  -- Per-user transaction-scoped advisory lock serializes concurrent taps so
  -- the check-then-insert can't race past the daily cap. Released at COMMIT.
  PERFORM pg_advisory_xact_lock(hashtext('log_hydration:' || caller::text));

  SELECT COUNT(*) INTO today_count
  FROM public.hydration_logs
  WHERE user_id = caller
    AND logged_at >= date_trunc('day', NOW());

  IF today_count >= cap THEN
    RETURN today_count;
  END IF;

  INSERT INTO public.hydration_logs (user_id) VALUES (caller);
  RETURN today_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.log_hydration() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_hydration() TO authenticated;

-- ── Friend room snapshot: read-only, friend-gated ────────────────────────────
-- Returns a single friend's buddy + hydration + streak in one round trip.
-- Mirrors get_friend_daily_stats's defensive pattern: the function checks the
-- friendships table inline and returns nothing on non-friend access (the
-- client surfaces this as a 404 / redirect).

CREATE OR REPLACE FUNCTION public.get_friend_buddy_payload(friend_id UUID)
RETURNS TABLE (
  user_id              UUID,
  username             TEXT,
  avatar_url           TEXT,
  emotion              TEXT,
  decor_unlocks        JSONB,
  name                 TEXT,
  last_recomputed_at   TIMESTAMPTZ,
  hydration_today      INTEGER,
  streak_days          INTEGER
)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT
    u.id,
    u.username,
    u.avatar_url,
    b.emotion,
    b.decor_unlocks,
    b.name,
    b.last_recomputed_at,
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.hydration_logs h
      WHERE h.user_id = u.id
        AND h.logged_at >= date_trunc('day', NOW())
    ), 0)                                              AS hydration_today,
    public.compute_user_streak(u.id)                    AS streak_days
  FROM public.users u
  JOIN public.buddy_state b ON b.user_id = u.id
  WHERE u.id = friend_id
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = friend_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = friend_id)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.get_friend_buddy_payload(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_buddy_payload(UUID) TO authenticated;
