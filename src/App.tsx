import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Placeholder för framtida sidor
function Dashboard() {
  return (
    <div className="min-h-screen bg-cream p-8">
      <h1 className="text-3xl font-bold text-charcoal mb-4">Grannfrid 2.0</h1>
      <p className="text-ash">Dashboard kommer snart...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: 'font-body',
        }}
      />
    </BrowserRouter>
  );
}

export default App;
