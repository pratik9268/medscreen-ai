import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Auth
import AuthPage       from "./pages/AuthPage";
import Unauthorized   from "./pages/Unauthorized";

// Layout
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute  from "./components/ProtectedRoute";

// Patient pages
import PatientDashboard    from "./pages/PatientDashboard";
import PatientChat         from "./pages/PatientChat";
import PatientAppointments from "./pages/PatientAppointments";
import PatientProfile      from "./pages/PatientProfile";

// Doctor pages
import DoctorDashboard         from "./pages/DoctorDashboard";
import DoctorAppointments      from "./pages/DoctorAppointments";
import DoctorAppointmentDetail from "./pages/DoctorAppointmentDetail";
import DoctorSlots             from "./pages/DoctorSlots";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";

function RoleHome() {
  const { role } = useAuth();
  if (role === "doctor") return <Navigate to="/doctor"  replace />;
  if (role === "admin")  return <Navigate to="/admin"   replace />;
  return <Navigate to="/patient" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"        element={<AuthPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/"             element={<RoleHome />} />

      {/* Patient routes */}
      <Route element={<ProtectedRoute roles={["patient"]}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/patient"              element={<PatientDashboard />} />
        <Route path="/patient/appointments" element={<PatientAppointments />} />
        <Route path="/patient/profile"      element={<PatientProfile />} />
      </Route>

      {/* Patient chat — full screen, no sidebar */}
      <Route path="/patient/chat" element={
        <ProtectedRoute roles={["patient"]}>
          <PatientChat />
        </ProtectedRoute>
      } />

      {/* Doctor routes */}
      <Route element={<ProtectedRoute roles={["doctor"]}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/doctor"                       element={<DoctorDashboard />} />
        <Route path="/doctor/today"                 element={<DoctorAppointments />} />
        <Route path="/doctor/appointments"          element={<DoctorAppointments />} />
        <Route path="/doctor/appointments/:id"      element={<DoctorAppointmentDetail />} />
        <Route path="/doctor/slots"                 element={<DoctorSlots />} />
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute roles={["admin"]}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/admin"             element={<AdminDashboard />} />
        <Route path="/admin/users"       element={<AdminDashboard />} />
        <Route path="/admin/doctors"     element={<AdminDashboard />} />
        <Route path="/admin/appointments" element={<AdminDashboard />} />
        <Route path="/admin/stats"       element={<AdminDashboard />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}