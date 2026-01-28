import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  useKnowledgeArticle,
  useCreateKnowledgeArticle,
  useUpdateKnowledgeArticle,
} from "@/hooks/useKnowledge";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton, SkeletonButton } from "@/components/ui/Skeleton";
import type { KnowledgeCategory } from "@/types/database";

export function ArticleEditor() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const isEditing = !!articleId && articleId !== "new";

  const {
    data: existingArticle,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useKnowledgeArticle(isEditing ? articleId : undefined);

  const createArticle = useCreateKnowledgeArticle();
  const updateArticle = useUpdateKnowledgeArticle();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("knowledge");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title);
      setCategory(existingArticle.category);
      setTagsInput(existingArticle.tags?.join(", ") || "");
      setContent(htmlToText(existingArticle.content));
    }
  }, [existingArticle]);

  const handleSave = () => {
    if (!title) return;

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const contentHtml = textToHtml(content);

    if (isEditing) {
      updateArticle.mutate(
        { id: articleId, title, content: contentHtml, category, tags },
        { onSuccess: () => navigate(`/knowledge/${articleId}`) },
      );
    } else {
      createArticle.mutate(
        { title, content: contentHtml, category, tags },
        { onSuccess: () => navigate("/knowledge") },
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonButton />
          <SkeletonButton />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Kunde inte hämta artikel"
        message={error.message || "Ett fel uppstod vid hämtning av artikeln."}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            !title || createArticle.isPending || updateArticle.isPending
          }
        >
          <Save className="h-4 w-4 mr-2" />
          {createArticle.isPending || updateArticle.isPending
            ? "Sparar..."
            : "Spara"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Artikelns titel..."
              className="text-lg font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as KnowledgeCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Taggar</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Separera med komma..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Innehall *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv innehall..."
              className="min-h-[300px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function htmlToText(html: string) {
  if (!html) return "";
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = withBreaks;
  return wrapper.textContent ?? "";
}

function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br />");
}
