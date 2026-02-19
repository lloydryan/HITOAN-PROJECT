import { Navigate, Outlet } from "react-router-dom";
import { UserRole } from "../types";
import { useAuth } from "../hooks/useAuth";
import LoadingScreen from "../components/LoadingScreen";

interface Props {
  allowedRoles: UserRole[];
}

export default function RoleProtectedRoute({ allowedRoles }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
