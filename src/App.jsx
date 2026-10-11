import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Landing from '@/pages/Landing';
import GlobalMap from '@/pages/GlobalMap';
import RegionDashboard from '@/pages/RegionDashboard';
import HistoricalComparison from '@/pages/HistoricalComparison';
import AIForecast from '@/pages/AIForecast';
import RegionComparison from '@/pages/RegionComparison';
import Greenery from '@/pages/Greenery';
import EcoAnalystChat from '@/pages/EcoAnalystChat';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<GlobalMap />} />
        <Route path="/dashboard" element={<RegionDashboard />} />
        <Route path="/history" element={<HistoricalComparison />} />
        <Route path="/forecast" element={<AIForecast />} />
        <Route path="/compare" element={<RegionComparison />} />
        <Route path="/greenery" element={<Greenery />} />
        <Route path="/eco-analyst" element={<EcoAnalystChat />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AppRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App