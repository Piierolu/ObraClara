import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ProjectPage } from './pages/ProjectPage'
import { QuestionsPage } from './pages/QuestionsPage'
import { ReviewPage } from './pages/ReviewPage'

export default function App() {
  return <>
    <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="projects/:projectId/review" element={<ReviewPage />} />
        <Route path="projects/:projectId/questions" element={<QuestionsPage />} />
        <Route path="projects/:projectId/audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
}
