import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Product } from "./useProducts";

export function useProductChildren() {
  return useQuery({
    queryKey: ["product-children"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, system_type, description, image_url, active, sort_order, metadata",
        )
        .not("parent_id", "is", null)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });
}
