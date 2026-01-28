import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, Clock, User, Tag } from "lucide-react";
import DOMPurify from "dompurify";
import {
  useKnowledgeArticle,
  useDeleteKnowledgeArticle,
} from "@/hooks/useKnowledge";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Skeleton,
  SkeletonText,
  SkeletonButton,
} from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ArticleView() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: article,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useKnowledgeArticle(articleId);
  const deleteArticle = useDeleteKnowledgeArticle();

  // Sanera HTML för att förhindra XSS-attacker
  const sanitizedContent = useMemo(() => {
    if (!article?.content) return "";
    return DOMPurify.sanitize(article.content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "a",
      ],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });
  }, [article?.content]);

  const handleDelete = () => {
    if (!articleId) return;
    deleteArticle.mutate(articleId, {
      onSuccess: () => navigate("/knowledge"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonButton />
          <div className="flex items-center gap-2">
            <SkeletonButton />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
        </div>
        <Card>
          <CardHeader className="border-b border-sand">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-8 w-2/3" />
            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Skeleton className="h-4 w-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16" />
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <SkeletonText lines={8} />
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

  if (!article) {
    return (
      <EmptyState
        title="Artikeln hittades inte"
        description="Den artikel du söker finns inte längre."
        action={
          <Link to="/knowledge">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka till kunskapsbanken
            </Button>
          </Link>
        }
      />
    );
  }

  const categoryVariant = {
    knowledge: "sage",
    policy: "lavender",
    routine: "warning",
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/knowledge")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>
        <div className="flex items-center gap-2">
          <Link to={`/knowledge/${articleId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Redigera
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteArticle.isPending}
            className="text-terracotta hover:text-terracotta"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b border-sand">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={categoryVariant[article.category]}>
              {KNOWLEDGE_CATEGORY_LABELS[article.category]}
            </Badge>
            {!article.is_published && (
              <Badge variant="outline">Opublicerad</Badge>
            )}
          </div>

          <h1 className="text-2xl font-display font-bold text-charcoal">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-ash mt-4">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {article.author?.name || "Okänd"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Uppdaterad{" "}
              {new Date(article.updated_at).toLocaleDateString("sv-SE")}
            </span>
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-ash" />
              <div className="flex flex-wrap gap-1">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Ta bort artikel"
        description={`Är du säker på att du vill ta bort "${article.title}"? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDelete}
        isLoading={deleteArticle.isPending}
      />
    </div>
  );
}
