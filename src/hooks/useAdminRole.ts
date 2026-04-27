import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

/** Standalone role query — used where the ProfileContext isn't available. */
export function useAdminRole() {
  const { user } = useAuth();
  return useQuery<string | null>({
    queryKey: ["profile-role", user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data?.role ?? "user";
    },
  });
}
