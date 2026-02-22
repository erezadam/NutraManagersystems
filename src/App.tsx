import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import GlobalSearchPage from './pages/GlobalSearchPage';
import VitaminsPage from './pages/VitaminsPage';
import VitaminEditPage from './pages/VitaminEditPage';
import DiseasesPage from './pages/DiseasesPage';
import DiseaseEditPage from './pages/DiseaseEditPage';
import DeficiencySymptomsPage from './pages/DeficiencySymptomsPage';
import FoodsPage from './pages/FoodsPage';
import ArticlesPage from './pages/ArticlesPage';
import ArticleEditPage from './pages/ArticleEditPage';
import EffectsCasesPage from './pages/EffectsCasesPage';
import UserManagementPage from './pages/UserManagementPage';
import PageNotFoundPage from './pages/PageNotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/Vitamins" replace />} />
          <Route path="/GlobalSearch" element={<GlobalSearchPage />} />
          <Route path="/Vitamins" element={<VitaminsPage />} />
          <Route path="/VitaminEdit" element={<VitaminEditPage />} />
          <Route path="/Diseases" element={<DiseasesPage />} />
          <Route path="/DiseaseEdit" element={<DiseaseEditPage />} />
          <Route path="/DeficiencySymptoms" element={<DeficiencySymptomsPage />} />
          <Route path="/Foods" element={<FoodsPage />} />
          <Route path="/Articles" element={<ArticlesPage />} />
          <Route path="/ArticleEdit" element={<ArticleEditPage />} />
          <Route path="/EffectsCases" element={<EffectsCasesPage />} />
          <Route path="/UserManagement" element={<UserManagementPage />} />
          <Route path="*" element={<PageNotFoundPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
