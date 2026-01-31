import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/Layout';
import { Dashboard, Predictions, Sequences, SequenceDetail, MapPage } from './pages';

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/sequences" element={<Sequences />} />
            <Route path="/sequences/:id" element={<SequenceDetail />} />
            <Route path="/map" element={<MapPage />} />

            {/* Placeholders for future features */}
            <Route path="/research" element={
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-4xl mb-4">📚</span>
                <p>Research Portal coming soon</p>
              </div>
            } />
            <Route path="/api-docs" element={
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-4xl mb-4">📖</span>
                <p>API Documentation coming soon</p>
              </div>
            } />
            <Route path="/settings" element={
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-4xl mb-4">⚙️</span>
                <p>Settings Panel coming soon</p>
              </div>
            } />

            {/* 404 Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
