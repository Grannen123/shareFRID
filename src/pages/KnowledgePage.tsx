import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { KnowledgeList } from "@/features/knowledge/KnowledgeList";
import { ArticleView } from "@/features/knowledge/ArticleView";
import { ArticleEditor } from "@/features/knowledge/ArticleEditor";

export function KnowledgePage() {
  return (
    <Routes>
      <Route
        index
        element={
          <AppShell title="Kunskapsbank">
            <KnowledgeList />
          </AppShell>
        }
      />
      <Route
        path="new"
        element={
          <AppShell title="Ny artikel">
            <ArticleEditor />
          </AppShell>
        }
      />
      <Route
        path=":articleId"
        element={
          <AppShell title="Artikel">
            <ArticleView />
          </AppShell>
        }
      />
      <Route
        path=":articleId/edit"
        element={
          <AppShell title="Redigera artikel">
            <ArticleEditor />
          </AppShell>
        }
      />
    </Routes>
  );
}
