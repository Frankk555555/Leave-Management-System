import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "./Loading";
import React from "react";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  supervisorOnly = false,
  excludeAdmin = false,
}) => {
  const { isAuthenticated, loading, isAdmin, isSupervisor } = useAuth();

  if (loading) {
    return <Loading size="fullpage" text="กำลังโหลด..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (excludeAdmin && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (supervisorOnly && !isSupervisor) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
