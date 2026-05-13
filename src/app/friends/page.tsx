"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  daily_calorie_target: number;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

type FriendWithStats = UserProfile & {
  friendship_id: string;
  total_kcal: number;
};

type PendingRequest = {
  friendship_id: string;
  requester: UserProfile;
};

function displayName(p: UserProfile) {
  return p.username || "Anonymous";
}

export default function FriendsPage() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<FriendWithStats[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [profileRes, friendshipsRes] = await Promise.all([
      supabase.from("users").select("id, username, avatar_url, daily_calorie_target").eq("id", user.id).single(),
      supabase.from("friendships").select("id, requester_id, addressee_id, status"),
    ]);

    const myProfile = profileRes.data as UserProfile | null;
    setMe(myProfile);

    const allFriendships: Friendship[] = (friendshipsRes.data ?? []) as Friendship[];

    const accepted = allFriendships.filter((f) => f.status === "accepted");
    const incomingPending = allFriendships.filter(
      (f) => f.status === "pending" && f.addressee_id === user.id
    );
    const outgoingPending = allFriendships.filter(
      (f) => f.status === "pending" && f.requester_id === user.id
    );

    setSentIds(new Set(outgoingPending.map((f) => f.addressee_id)));

    // Resolve friend profiles
    const friendIds = accepted.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    const requesterIds = incomingPending.map((f) => f.requester_id);
    const allIdsToFetch = [...new Set([...friendIds, ...requesterIds])];

    if (allIdsToFetch.length === 0) {
      setFriends([]);
      setPending([]);
      setLoading(false);
      return;
    }

    const [profilesRes, statsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, username, avatar_url, daily_calorie_target")
        .in("id", allIdsToFetch),
      supabase.rpc("get_friend_daily_stats", { friend_ids: friendIds }),
    ]);

    const profileMap = new Map<string, UserProfile>(
      (profilesRes.data ?? []).map((p: UserProfile) => [p.id, p])
    );
    const statsMap = new Map<string, number>(
      (statsRes.data ?? []).map((s: { user_id: string; total_kcal: number }) => [
        s.user_id,
        s.total_kcal,
      ])
    );

    setFriends(
      accepted
        .map((f) => {
          const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const profile = profileMap.get(friendId);
          if (!profile) return null;
          return {
            ...profile,
            friendship_id: f.id,
            total_kcal: statsMap.get(friendId) ?? 0,
          };
        })
        .filter((f): f is FriendWithStats => f !== null)
    );

    setPending(
      incomingPending
        .map((f) => {
          const requester = profileMap.get(f.requester_id);
          if (!requester) return null;
          return { friendship_id: f.id, requester };
        })
        .filter((r): r is PendingRequest => r !== null)
    );

    setLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !me) return;
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id, username, avatar_url, daily_calorie_target")
      .ilike("username", `%${searchQuery.trim()}%`)
      .neq("id", me.id)
      .limit(8);
    setSearchResults((data ?? []) as UserProfile[]);
    setSearching(false);
  }

  async function sendRequest(addresseeId: string) {
    if (!me) return;
    const supabase = createClient();
    await supabase.from("friendships").insert({ requester_id: me.id, addressee_id: addresseeId });
    setSentIds((prev) => new Set([...prev, addresseeId]));
  }

  async function acceptRequest(friendshipId: string) {
    const supabase = createClient();
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    await loadAll();
  }

  async function declineRequest(friendshipId: string) {
    const supabase = createClient();
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setPending((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
  }

  async function removeFriend(friendshipId: string) {
    const supabase = createClient();
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriends((prev) => prev.filter((f) => f.friendship_id !== friendshipId));
  }

  const alreadyFriendIds = new Set(friends.map((f) => f.id));

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Friends</h1>

      {/* Add friend */}
      <div style={cardStyle}>
        <p style={sectionLabelStyle}>Add a friend</p>
        <div style={searchRowStyle}>
          <input
            type="text"
            placeholder="Search by username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={inputStyle}
          />
          <button onClick={handleSearch} disabled={searching} style={searchButtonStyle}>
            {searching ? "…" : "Search"}
          </button>
        </div>
        {searchResults.length > 0 && (
          <ul style={resultListStyle}>
            {searchResults.map((u) => {
              const already = alreadyFriendIds.has(u.id);
              const sent = sentIds.has(u.id);
              return (
                <li key={u.id} style={resultRowStyle}>
                  <div style={userInfoStyle}>
                    <span style={avatarStyle}>{u.avatar_url ?? "👤"}</span>
                    <span style={nameStyle}>{displayName(u)}</span>
                  </div>
                  {already ? (
                    <span style={mutedTagStyle}>Friends</span>
                  ) : sent ? (
                    <span style={mutedTagStyle}>Requested</span>
                  ) : (
                    <button onClick={() => sendRequest(u.id)} style={addButtonStyle}>
                      Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div style={cardStyle}>
          <p style={sectionLabelStyle}>Friend requests</p>
          <ul style={resultListStyle}>
            {pending.map((r) => (
              <li key={r.friendship_id} style={resultRowStyle}>
                <div style={userInfoStyle}>
                  <span style={avatarStyle}>{r.requester.avatar_url ?? "👤"}</span>
                  <span style={nameStyle}>{displayName(r.requester)}</span>
                </div>
                <div style={requestActionsStyle}>
                  <button onClick={() => acceptRequest(r.friendship_id)} style={acceptButtonStyle}>
                    Accept
                  </button>
                  <button onClick={() => declineRequest(r.friendship_id)} style={declineButtonStyle}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Friends list */}
      <div style={cardStyle}>
        <p style={sectionLabelStyle}>
          {friends.length === 0 ? "No friends yet" : `${friends.length} friend${friends.length > 1 ? "s" : ""}`}
        </p>
        {loading ? (
          <p style={mutedStyle}>Loading…</p>
        ) : friends.length === 0 ? (
          <p style={mutedStyle}>Search for a friend above to get started.</p>
        ) : (
          <ul style={friendListStyle}>
            {friends.map((f) => {
              const pct = Math.min(100, Math.round((f.total_kcal / f.daily_calorie_target) * 100));
              const over = f.total_kcal > f.daily_calorie_target;
              return (
                <li key={f.id} style={friendItemStyle}>
                  <div style={friendTopStyle}>
                    <div style={userInfoStyle}>
                      <span style={avatarStyle}>{f.avatar_url ?? "👤"}</span>
                      <div>
                        <p style={nameStyle}>{displayName(f)}</p>
                        <p style={friendStatsTextStyle}>
                          {f.total_kcal.toLocaleString()} / {f.daily_calorie_target.toLocaleString()} kcal
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFriend(f.friendship_id)}
                      style={removeButtonStyle}
                      title="Remove friend"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={trackStyle}>
                    <div style={barStyle(pct, over)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-body-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "1rem",
  padding: "1.25rem",
  boxShadow: "0 2px 8px var(--color-shadow)",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--color-text-hover)",
  margin: 0,
};

const searchRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.625rem 0.875rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "var(--color-text-dark)",
  fontSize: "0.9375rem",
};

const searchButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1.125rem",
  borderRadius: "0.5rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.9375rem",
  border: "none",
  cursor: "pointer",
};

const resultListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.625rem",
};

const resultRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const userInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.625rem",
};

const avatarStyle: React.CSSProperties = {
  fontSize: "1.625rem",
  lineHeight: 1,
};

const nameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--color-text-dark)",
  margin: 0,
};

const mutedTagStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--color-text-hover)",
  fontStyle: "italic",
};

const mutedStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-hover)",
  margin: 0,
};

const addButtonStyle: React.CSSProperties = {
  padding: "0.35rem 0.875rem",
  borderRadius: "0.5rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.8125rem",
  border: "1px solid var(--color-border)",
  cursor: "pointer",
};

const requestActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const acceptButtonStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.8125rem",
  border: "1px solid var(--color-border)",
  cursor: "pointer",
};

const declineButtonStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: "0.5rem",
  background: "transparent",
  color: "#c0392b",
  fontWeight: 600,
  fontSize: "0.8125rem",
  border: "1px solid #f5c6c6",
  cursor: "pointer",
};

const friendListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const friendItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const friendTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const friendStatsTextStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-hover)",
  margin: "0.125rem 0 0",
};

const removeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--color-border)",
  fontSize: "0.875rem",
  cursor: "pointer",
  padding: "0.25rem",
};

const trackStyle: React.CSSProperties = {
  height: 5,
  borderRadius: 3,
  background: "var(--color-border)",
  overflow: "hidden",
};

const barStyle = (pct: number, over: boolean): React.CSSProperties => ({
  height: "100%",
  width: `${pct}%`,
  borderRadius: 3,
  background: over ? "#c0392b" : "var(--color-text-hover)",
});
