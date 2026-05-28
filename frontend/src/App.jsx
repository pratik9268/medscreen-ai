import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import AuthPage        from "./pages/AuthPage";
import Unauthorized    from "./pages/Unauthorized";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute  from "./components/ProtectedRoute";

// Patient
import PatientDashboard    from "./pages/PatientDashboard";
import PatientChat         from "./pages/PatientChat";
import PatientAppointments from "./pages/PatientAppointments";
import PatientProfile      from "./pages/PatientProfile";
import PatientReports      from "./pages/PatientReports";
import BookAppointment     from "./pages/BookAppointment";

// Doctor
import DoctorDashboard         from "./pages/DoctorDashboard";
import DoctorAppointments      from "./pages/DoctorAppointments";
import DoctorAppointmentDetail from "./pages/DoctorAppointmentDetail";
import DoctorSlots             from "./pages/DoctorSlots";
import DoctorProfile           from "./pages/DoctorProfile";

// Admin
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

      {/* Patient — with sidebar */}
      <Route element={<ProtectedRoute roles={["patient"]}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/patient"                element={<PatientDashboard />} />
        <Route path="/patient/appointments"   element={<PatientAppointments />} />
        <Route path="/patient/reports"        element={<PatientReports />} />
        <Route path="/patient/profile"        element={<PatientProfile />} />
        <Route path="/patient/book/:doctorId" element={<BookAppointment />} />
      </Route>

      {/* Patient chat — full screen, no sidebar */}
      <Route path="/patient/chat" element={
        <ProtectedRoute roles={["patient"]}>
          <PatientChat />
        </ProtectedRoute>
      } />

      {/* Doctor — with sidebar */}
      <Route element={<ProtectedRoute roles={["doctor"]}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/doctor"                  element={<DoctorDashboard />} />
        <Route path="/doctor/today"            element={<DoctorAppointments />} />
        <Route path="/doctor/appointments"     element={<DoctorAppointments />} />
        <Route path="/doctor/appointments/:id" element={<DoctorAppointmentDetail />} />
        <Route path="/doctor/slots"            element={<DoctorSlots />} />
        <Route path="/doctor/profile"          element={<DoctorProfile />} />
      </Route>

      {/* Admin — with sidebar */}
      <Route element={<ProtectedRoute roles={["admin"]}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/admin"              element={<AdminDashboard />} />
        <Route path="/admin/users"        element={<AdminDashboard />} />
        <Route path="/admin/doctors"      element={<AdminDashboard />} />
        <Route path="/admin/appointments" element={<AdminDashboard />} />
        <Route path="/admin/stats"        element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}