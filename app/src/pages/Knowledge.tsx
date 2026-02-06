import { useState } from "react";
import { Search, Plus, BookOpen, Tag, Clock } from "lucide-react";
import { Button, Input, Card, CardContent, Badge } from "@/components/ui";
import { formatRelativeDate, cn } from "@/lib/utils";

// Mock knowledge articles
const mockArticles = [
  {
    id: "1",
    title: "Handbok: Störningsärenden steg för steg",
    excerpt:
      "En komplett guide för hur vi hanterar störningsärenden från första anmälan till avslut. Inkluderar mallar för varningsbrev...",
    category: "Processer",
    tags: ["störning", "handbok", "process"],
    updatedAt: new Date().toISOString(),
    isPublished: true,
  },
  {
    id: "2",
    title: "Mall: Första varningsbrev vid störning",
    excerpt:
      "Standardmall för första varningsbrev. Anpassad efter senaste praxis från hyresnämnden. Använd tillsammans med...",
    category: "Mallar",
    tags: ["mall", "störning", "brev"],
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    isPublished: true,
  },
  {
    id: "3",
    title: "Juridik: Andrahandsuthyrning och plattformar",
    excerpt:
      "Sammanfattning av rättsläget gällande otillåten andrahandsuthyrning via Airbnb och liknande plattformar...",
    category: "Juridik",
    tags: ["juridik", "andrahand", "airbnb"],
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    isPublished: true,
  },
  {
    id: "4",
    title: "Checklista: Ny kund onboarding",
    excerpt:
      "Steg-för-steg checklista för onboarding av nya kunder. Inkluderar avtalsgranskning, kontaktinformation...",
    category: "Processer",
    tags: ["onboarding", "checklista", "kund"],
    updatedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    isPublished: true,
  },
  {
    id: "5",
    title: "Mall: Månadsrapport till kund",
    excerpt:
      "Mall för månadsrapport som skickas till kunder. Innehåller sektioner för sammanfattning, pågående ärenden...",
    category: "Mallar",
    tags: ["mall", "rapport", "kund"],
    updatedAt: new Date(Date.now() - 86400000 * 21).toISOString(),
    isPublished: true,
  },
];

const categories = [
  { name: "Alla", count: mockArticles.length },
  {
    name: "Processer",
    count: mockArticles.filter((a) => a.category === "Processer").length,
  },
  {
    name: "Mallar",
    count: mockArticles.filter((a) => a.category === "Mallar").length,
  },
  {
    name: "Juridik",
    count: mockArticles.filter((a) => a.category === "Juridik").length,
  },
];

function ArticleCard({ article }: { article: (typeof mockArticles)[0] }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <Badge variant="outline">{article.category}</Badge>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(article.updatedAt)}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{article.title}</h3>
          <p className="text-sm text-gray-500 line-clamp-2">
            {article.excerpt}
          </p>
          <div className="flex flex-wrap gap-1">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Alla");

  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesCategory =
      selectedCategory === "Alla" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kunskapsbank</h1>
          <p className="text-gray-500">
            Mallar, processer och juridisk vägledning
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ny artikel
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          placeholder="Sök i kunskapsbanken..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Categories Sidebar */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Kategorier
          </h2>
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                selectedCategory === category.name
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {category.name}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selectedCategory === category.name
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-600",
                )}
              >
                {category.count}
              </span>
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="lg:col-span-3">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Inga artiklar hittades</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
