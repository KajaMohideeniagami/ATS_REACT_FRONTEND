import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession, isLoggedIn } from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const sessionUser = getSession();
  if (sessionUser?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};

export default ProtectedRoute;
