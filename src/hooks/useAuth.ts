import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string;
  avatar_seed: string | null;
}

async function fetchOrCreateProfile(user: User): Promise<Profile | null> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_seed")
    .eq("id", user.id)
    .maybeSingle();

  if (existing || selectError) return existing as Profile | null;

  const fallbackName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Agent";

  await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: fallbackName }, { onConflict: "id" });

  const { data: created } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_seed")
    .eq("id", user.id)
    .maybeSingle();

  return created as Profile | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => {
          fetchOrCreateProfile(sess.user).then((p) => setProfile(p));
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchOrCreateProfile(sess.user).then((p) => setProfile(p));
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, user, profile, loading, signOut };
}
