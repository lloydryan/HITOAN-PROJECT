import { Navigate, Route, Routes } from "react-router-dom";
import RoleProtectedRoute from "./RoleProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import DashboardPage from "../pages/admin/DashboardPage";
import MenuPage from "../pages/admin/MenuPage";
import CostsPage from "../pages/admin/CostsPage";
import ActivityLogsPage from "../pages/admin/ActivityLogsPage";
import UsersPage from "../pages/admin/UsersPage";
import VoidRequestsPage from "../pages/admin/VoidRequestsPage";
import CreateOrderPage from "../pages/crew/CreateOrderPage";
import MyOrdersPage from "../pages/crew/MyOrdersPage";
import QueuePage from "../pages/kitchen/QueuePage";
import CashierOrdersPage from "../pages/cashier/OrdersPage";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "crew") return <Navigate to="/crew/orders/new" replace />;
  if (user.role === "kitchen") return <Navigate to="/kitchen/queue" replace />;
  return <Navigate to="/cashier/orders" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        element={
          <RoleProtectedRoute
            allowedRoles={["admin", "crew", "kitchen", "cashier"]}
          />
        }
      >
        <Route element={<AppLayout />}>
          <Route element={<RoleProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/menu" element={<MenuPage />} />
            <Route path="/admin/costs" element={<CostsPage />} />
            <Route path="/admin/logs" element={<ActivityLogsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/void-requests" element={<VoidRequestsPage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={["crew"]} />}>
            <Route path="/crew/orders/new" element={<CreateOrderPage />} />
            <Route path="/crew/orders" element={<MyOrdersPage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={["kitchen"]} />}>
            <Route path="/kitchen/queue" element={<QueuePage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={["cashier"]} />}>
            <Route path="/cashier/orders/new" element={<CreateOrderPage />} />
            <Route path="/cashier/orders" element={<CashierOrdersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
