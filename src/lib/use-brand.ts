import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  id: string;
  name: string;
  tone: string;
  colors: Record<string, unknown> | null;
  logo_url: string | null;
};

/** Loads the signed-in user's brands, creating a starter brand on first visit. */
export function useBrands() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["brands"],
    queryFn: async (): Promise<Brand[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from("smm_brands")
        .select("id, name, tone, colors, logo_url")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) return data as Brand[];

      const { data: created, error: createError } = await supabase
        .from("smm_brands")
        .insert({ user_id: userId, name: "My Brand", tone: "friendly" })
        .select("id, name, tone, colors, logo_url")
        .single();
      if (createError) throw createError;
      return [created as Brand];
    },
  });

  return { ...query, refreshBrands: () => queryClient.invalidateQueries({ queryKey: ["brands"] }) };
}

/** Active brand selection, persisted in the browser. */
export function useActiveBrand() {
  const { data: brands, isLoading } = useBrands();
  const [brandId, setBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (!brands || brands.length === 0) return;
    const stored = window.localStorage.getItem("socialpilot-brand");
    const valid = stored && brands.some((b) => b.id === stored) ? stored : brands[0]!.id;
    setBrandId(valid);
  }, [brands]);

  const select = (id: string) => {
    window.localStorage.setItem("socialpilot-brand", id);
    setBrandId(id);
  };

  return {
    brands: brands ?? [],
    brand: brands?.find((b) => b.id === brandId) ?? null,
    brandId,
    select,
    isLoading,
  };
}
