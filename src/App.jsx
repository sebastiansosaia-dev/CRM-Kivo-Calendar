import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Notificaciones from './pages/Notificaciones';
import Analytics from './pages/Analytics';
import Canceled from './pages/Canceled';
import Notas from './pages/Notas';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './components/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/notificaciones" element={<Notificaciones />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/pipeline" element={<Navigate to="/notificaciones" replace />} />
              <Route path="/canceled" element={<Canceled />} />
              <Route path="/notas" element={<Notas />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
