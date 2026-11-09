import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout, RequireProfile } from './components/AppLayout';
import { PublicLayout } from './components/PublicLayout';
import { Landing } from './pages/public/Landing';
import { BlogIndex, BlogPostPage } from './pages/public/Blog';
import { Guide72 } from './pages/public/Guide72';
import { TestPage } from './pages/public/TestPage';
import { Privacy } from './pages/public/Privacy';
import { Contact } from './pages/public/Contact';
import { NotFound } from './pages/public/NotFound';
import { Logo } from './components/Icon';

const Onboarding = lazy(() => import('./pages/app/Onboarding'));
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const Camino = lazy(() => import('./pages/app/Camino'));
const ModulePage = lazy(() => import('./pages/app/ModulePage'));
const ExercisePage = lazy(() => import('./pages/app/ExercisePage'));
const Pausa = lazy(() => import('./pages/app/Pausa'));
const Espacio = lazy(() => import('./pages/app/Espacio'));
const Perfil = lazy(() => import('./pages/app/Perfil'));
const Limites = lazy(() => import('./pages/app/Limites'));
const HoyDificil = lazy(() => import('./pages/app/HoyDificil'));
const Asistente = lazy(() => import('./pages/app/Asistente'));
const Cerebro = lazy(() => import('./pages/app/Cerebro'));
const CerebroTema = lazy(() => import('./pages/app/CerebroTema'));
const Biblioteca = lazy(() => import('./pages/app/Biblioteca'));
const Admin = lazy(() => import('./pages/app/Admin'));

function Loading() {
  return (
    <div className="empty" aria-busy="true" style={{ paddingTop: '20vh' }}>
      <Logo size={40} />
      <p>Cargando…</p>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="blog" element={<BlogIndex />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="guia-72-horas" element={<Guide72 />} />
          <Route path="test" element={<TestPage />} />
          <Route path="vsl" element={<Navigate to="/test" replace />} />
          <Route path="privacidad" element={<Privacy />} />
          <Route path="contacto" element={<Contact />} />
          <Route path="cerebro" element={<Cerebro />} />
          <Route path="cerebro/:id" element={<CerebroTema />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="bienvenida" element={<Onboarding />} />
        <Route path="app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="camino" element={<Camino />} />
          <Route path="camino/modulo/:id" element={<ModulePage />} />
          <Route path="camino/ejercicio/:id" element={<ExercisePage />} />
          <Route path="pausa" element={<Pausa />} />
          <Route
            path="espacio"
            element={
              <RequireProfile>
                <Espacio />
              </RequireProfile>
            }
          />
          <Route path="perfil" element={<Perfil />} />
          <Route path="limites" element={<Limites />} />
          <Route path="dificil" element={<HoyDificil />} />
          <Route
            path="asistente"
            element={
              <RequireProfile>
                <Asistente />
              </RequireProfile>
            }
          />
          <Route path="cerebro" element={<Cerebro />} />
          <Route path="cerebro/:id" element={<CerebroTema />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
