/**
 * Knowledge Base Search Component
 *
 * AI-powered semantic search across knowledge base articles.
 * Supports both keyword search and natural language queries.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search,
  BookOpen,
  Tag,
  Clock,
  ChevronRight,
  Loader2,
  Sparkles,
  FileText,
  Scale,
  Lightbulb,
  FileQuestion,
} from "lucide-react";
import {
  Input,
  Button,
  Badge,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: "juridik" | "process" | "mallar" | "tips" | "ovrigt";
  tags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  relevanceScore?: number;
}

interface SearchResult {
  article: KnowledgeArticle;
  highlights: string[];
  score: number;
}

// Category configuration
const CATEGORY_CONFIG = {
  juridik: {
    label: "Juridik",
    icon: Scale,
    color: "bg-blue-100 text-blue-700",
  },
  process: {
    label: "Process",
    icon: FileText,
    color: "bg-green-100 text-green-700",
  },
  mallar: {
    label: "Mallar",
    icon: FileText,
    color: "bg-purple-100 text-purple-700",
  },
  tips: {
    label: "Tips",
    icon: Lightbulb,
    color: "bg-yellow-100 text-yellow-700",
  },
  ovrigt: {
    label: "Övrigt",
    icon: FileQuestion,
    color: "bg-gray-100 text-gray-600",
  },
};

interface KnowledgeSearchProps {
  onSelectArticle?: (article: KnowledgeArticle) => void;
  placeholder?: string;
  className?: string;
}

export function KnowledgeSearch({
  onSelectArticle,
  placeholder = "Sök i kunskapsbanken...",
  className,
}: KnowledgeSearchProps) {
  const { getAccessToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAISearch, setIsAISearch] = useState(false);
  const [selectedArticle, setSelectedArticle] =
    useState<KnowledgeArticle | null>(null);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string, useAI: boolean = false) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setIsAISearch(useAI);

      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Ingen åtkomsttoken");

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const endpoint = useAI ? "knowledge-ai-search" : "knowledge-search";

        const response = await fetch(
          `${supabaseUrl}/functions/v1/${endpoint}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ query: searchQuery }),
          },
        );

        if (!response.ok) {
          throw new Error("Sökningen misslyckades");
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [getAccessToken],
  );

  // Auto-search on debounced query
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery, false);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, performSearch]);

  // Handle AI search
  const handleAISearch = () => {
    if (query.trim()) {
      performSearch(query, true);
    }
  };

  // Handle article selection
  const handleSelectArticle = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setShowResults(false);
    onSelectArticle?.(article);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sv-SE");
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-24"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAISearch}
            disabled={!query.trim() || isSearching}
            className="h-7 px-2 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI-sök
          </Button>
        </div>
      </div>

      {/* Search results dropdown */}
      {showResults && (query.trim() || results.length > 0) && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-hidden"
        >
          {results.length === 0 && !isSearching && query.trim() ? (
            <div className="p-4 text-center text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Inga resultat hittades</p>
              <Button
                variant="link"
                size="sm"
                onClick={handleAISearch}
                className="mt-2"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Prova AI-sökning
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              {isAISearch && (
                <div className="px-3 py-2 bg-primary-50 border-b text-xs text-primary-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-drivna resultat
                </div>
              )}
              <div className="p-2 space-y-1">
                {results.map((result) => {
                  const categoryConfig =
                    CATEGORY_CONFIG[result.article.category];
                  const CategoryIcon = categoryConfig.icon;

                  return (
                    <button
                      key={result.article.id}
                      onClick={() => handleSelectArticle(result.article)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CategoryIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-sm">
                              {highlightText(result.article.title, query)}
                            </span>
                          </div>

                          {/* Highlights */}
                          {result.highlights.length > 0 && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              ...{result.highlights[0]}...
                            </p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", categoryConfig.color)}
                            >
                              {categoryConfig.label}
                            </Badge>
                            {result.article.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Article detail dialog */}
      <Dialog
        open={!!selectedArticle}
        onOpenChange={() => setSelectedArticle(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      CATEGORY_CONFIG[selectedArticle.category].color,
                    )}
                  >
                    {CATEGORY_CONFIG[selectedArticle.category].label}
                  </Badge>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(selectedArticle.updatedAt)}
                  </span>
                </div>
                <DialogTitle>{selectedArticle.title}</DialogTitle>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="prose prose-sm max-w-none">
                  {/* Simple markdown-like rendering */}
                  {selectedArticle.content.split("\n").map((paragraph, i) => {
                    if (paragraph.startsWith("# ")) {
                      return (
                        <h1 key={i} className="text-xl font-bold mt-4 mb-2">
                          {paragraph.slice(2)}
                        </h1>
                      );
                    }
                    if (paragraph.startsWith("## ")) {
                      return (
                        <h2 key={i} className="text-lg font-semibold mt-3 mb-2">
                          {paragraph.slice(3)}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith("### ")) {
                      return (
                        <h3 key={i} className="text-base font-medium mt-2 mb-1">
                          {paragraph.slice(4)}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith("- ")) {
                      return (
                        <li key={i} className="ml-4">
                          {paragraph.slice(2)}
                        </li>
                      );
                    }
                    if (paragraph.trim() === "") {
                      return <br key={i} />;
                    }
                    return (
                      <p key={i} className="my-2">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Tags */}
              {selectedArticle.tags.length > 0 && (
                <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                  <Tag className="h-4 w-4 text-gray-400" />
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
