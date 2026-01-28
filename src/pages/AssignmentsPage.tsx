import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AssignmentList } from "@/features/assignments/AssignmentList";
import { AssignmentDetail } from "@/features/assignments/AssignmentDetail";

export function AssignmentsPage() {
  return (
    <Routes>
      <Route
        index
        element={
          <AppShell title="Uppdrag">
            <AssignmentList />
          </AppShell>
        }
      />
      <Route path=":assignmentId/*" element={<AssignmentDetail />} />
    </Routes>
  );
}
