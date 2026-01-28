import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerList } from "@/features/customers/CustomerList";
import { CustomerDetail } from "@/features/customers/CustomerDetail";

export function CustomersPage() {
  return (
    <Routes>
      <Route
        index
        element={
          <AppShell title="Kunder">
            <CustomerList />
          </AppShell>
        }
      />
      <Route path=":customerId/*" element={<CustomerDetail />} />
    </Routes>
  );
}
