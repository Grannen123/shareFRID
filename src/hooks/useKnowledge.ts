import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  Profile,
} from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface KnowledgeArticleWithAuthor extends KnowledgeArticle {
  author?: Profile;
}

export function useKnowledgeArticles(category?: KnowledgeCategory) {
  return useQuery({
    queryKey: category
      ? queryKeys.knowledge.byCategory(category)
      : queryKeys.knowledge.all,
    queryFn: async () => {
      let query = supabase
        .from("knowledge_articles")
        .select("*")
        .eq("is_published", true)
        .order("updated_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await withTimeout(query);

      if (error) throw error;
      return data as KnowledgeArticleWithAuthor[];
    },
  });
}

export function useKnowledgeArticle(id: string | undefined) {
  return useQuery({
    queryKey: ["knowledge", "detail", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await withTimeout(
        supabase.from("knowledge_articles").select("*").eq("id", id).single(),
      );

      if (error) throw error;
      return data as KnowledgeArticleWithAuthor;
    },
    enabled: !!id,
  });
}

export interface CreateArticleData {
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags?: string[];
  is_published?: boolean;
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateArticleData) => {
      const { data: article, error } = await withTimeout(
        supabase
          .from("knowledge_articles")
          .insert({
            ...data,
            created_by: user?.id,
            updated_by: user?.id,
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return article as KnowledgeArticle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
      toast.success("Artikel skapad!");
    },
    onError: (error) => {
      console.error("Create knowledge article error:", error);
      toast.error("Kunde inte skapa artikel: " + error.message);
    },
  });
}

export interface UpdateArticleData {
  id: string;
  title?: string;
  content?: string;
  category?: KnowledgeCategory;
  tags?: string[];
  is_published?: boolean;
}

export function useUpdateKnowledgeArticle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateArticleData) => {
      const { data: article, error } = await withTimeout(
        supabase
          .from("knowledge_articles")
          .update({
            ...data,
            updated_by: user?.id,
          })
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return article as KnowledgeArticle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
      toast.success("Artikel uppdaterad!");
    },
    onError: (error) => {
      console.error("Update knowledge article error:", error);
      toast.error("Kunde inte uppdatera artikel: " + error.message);
    },
  });
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from("knowledge_articles").delete().eq("id", id),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
      toast.success("Artikel borttagen!");
    },
    onError: (error) => {
      console.error("Delete knowledge article error:", error);
      toast.error("Kunde inte ta bort artikel: " + error.message);
    },
  });
}
