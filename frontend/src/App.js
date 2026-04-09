import './App.css';
import Home from './Pages/Home';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import Profile from './Pages/Profile';
import SkillVerification from './Pages/SkillVerification';
import PersonalizedAssessment from './Pages/PersonalizedAssessment';
import StudentDashboard from './Pages/StudentDashboard';
import AdminDashboard from './Pages/AdminDashboard';
import AdminStudents from './Pages/AdminStudents';
import AdminReadiness from './Pages/AdminReadiness';
import AdminProfile from './Pages/AdminProfile';
import AdminMessages from './Pages/AdminMessages';
import AdminRoute from './components/admin/AdminRoute';
import AppLoader from './components/AppLoader';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

function AppRoutes() {
  const location = useLocation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const previousPathRef = useRef(location.pathname);

  const showShortLoader = () => {
    setIsRouteLoading(true);
    const timer = setTimeout(() => {
      setIsRouteLoading(false);
    }, 900);

    return timer;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const currentPath = location.pathname;
    previousPathRef.current = currentPath;

    const isReturningToHomeFromProfile = previousPath === '/profile' && currentPath === '/';
    const isReturningToHomeFromAdmin = previousPath.startsWith('/admin') && currentPath === '/';

    if (!isReturningToHomeFromProfile && !isReturningToHomeFromAdmin) {
      return;
    }

    const timer = showShortLoader();
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {isInitialLoading || isRouteLoading ? <AppLoader /> : null}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/skill-verification" element={<SkillVerification />} />
        <Route path="/personalized-assessment" element={<PersonalizedAssessment />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
        <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
        <Route path="/admin/readiness" element={<AdminRoute><AdminReadiness /></AdminRoute>} />
        <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
        <Route path="/features" element={<Home />} />
        <Route path="/how" element={<Home />} />
        <Route path="/stories" element={<Home />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
