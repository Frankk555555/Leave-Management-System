import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/common/Toast";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PageLoader from "./components/common/PageLoader";
import "./index.css";

// Eager load Login (first page users see)
import Login from "./pages/Login";

// Lazy load all other pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LeaveRequest = lazy(() => import("./pages/LeaveRequest"));
const LeaveHistory = lazy(() => import("./pages/LeaveHistory"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const TeamCalendar = lazy(() => import("./pages/TeamCalendar"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const HolidayManagement = lazy(() => import("./pages/HolidayManagement"));
const LeaveTypeManagement = lazy(() => import("./pages/LeaveTypeManagement"));
const Reports = lazy(() => import("./pages/Reports"));
const Profile = lazy(() => import("./pages/Profile"));
const LeaveForms = lazy(() => import("./pages/LeaveForms"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const LeaveRegulations = lazy(() => import("./pages/LeaveRegulations"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-request"
                element={
                  <ProtectedRoute>
                    <LeaveRequest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-history"
                element={
                  <ProtectedRoute>
                    <LeaveHistory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/team-calendar"
                element={
                  <ProtectedRoute>
                    <TeamCalendar />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute adminOnly>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/holidays"
                element={
                  <ProtectedRoute adminOnly>
                    <HolidayManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-types"
                element={
                  <ProtectedRoute adminOnly>
                    <LeaveTypeManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/forms"
                element={
                  <ProtectedRoute>
                    <LeaveForms />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/leaves"
                element={
                  <ProtectedRoute adminOnly>
                    <LeaveManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/regulations"
                element={
                  <ProtectedRoute>
                    <LeaveRegulations />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
