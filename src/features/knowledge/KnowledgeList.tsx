import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, BookOpen, FileText, Clock, User } from "lucide-react";
import {
  useKnowledgeArticles,
  KnowledgeArticleWithAuthor,
} from "@/hooks/useKnowledge";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { KnowledgeCategory } from "@/types/database";

type FilterCategory = "all" | KnowledgeCategory;

export function KnowledgeList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>("all");

  const {
    data: articles,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useKnowledgeArticles(
    selectedCategory === "all" ? undefined : selectedCategory,
  );

  const filteredArticles = articles?.filter((article) => {
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query) ||
      article.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="h-10 w-full max-w-md bg-sand animate-pulse rounded-md" />
          <div className="h-10 w-28 bg-sand animate-pulse rounded-md" />
        </div>
        {/* Category filter skeleton */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-16 bg-sand animate-pulse rounded-md"
            />
          ))}
        </div>
        {/* Article cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Kunde inte hämta artiklar"
        message={error.message || "Ett fel uppstod vid hämtning av artiklar."}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ash" />
          <Input
            placeholder="Sök artiklar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link to="/knowledge/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ny artikel
          </Button>
        </Link>
      </div>

      {/* Category Filter - Using buttons, NOT Radix Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={selectedCategory === "all" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          Alla
        </Button>
        {(
          Object.entries(KNOWLEDGE_CATEGORY_LABELS) as [
            KnowledgeCategory,
            string,
          ][]
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={selectedCategory === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Articles List */}
      {filteredArticles?.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={searchQuery ? "Inga artiklar hittades" : "Inga artiklar"}
          description={
            searchQuery
              ? "Försök med ett annat sökord."
              : "Skapa din första artikel i kunskapsbanken."
          }
          action={
            !searchQuery && (
              <Link to="/knowledge/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Skapa artikel
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles?.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ArticleCardProps {
  article: KnowledgeArticleWithAuthor;
}

function ArticleCard({ article }: ArticleCardProps) {
  const categoryVariant = {
    knowledge: "sage",
    policy: "lavender",
    routine: "warning",
  } as const;

  const categoryIcon = {
    knowledge: BookOpen,
    policy: FileText,
    routine: FileText,
  };

  const Icon = categoryIcon[article.category];

  return (
    <Link to={`/knowledge/${article.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg bg-${categoryVariant[article.category]}/10`}
              >
                <Icon
                  className={`h-4 w-4 text-${categoryVariant[article.category]}`}
                />
              </div>
              <Badge variant={categoryVariant[article.category]}>
                {KNOWLEDGE_CATEGORY_LABELS[article.category]}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg mt-2 line-clamp-2">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ash line-clamp-3 mb-4">
            {stripHtml(article.content)}
          </p>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {article.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {article.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{article.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-ash pt-3 border-t border-sand">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author?.name || "Okänd"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(article.updated_at).toLocaleDateString("sv-SE")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").slice(0, 200);
}
