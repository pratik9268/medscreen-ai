import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, Calendar, FileText,
  Users, Settings, LogOut, ChevronLeft, ChevronRight,
  Stethoscope, Shield, Clock, BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useState } from "react";

const NAV = {
  patient: [
    { to: "/patient",             icon: LayoutDashboard, label: "Dashboard"     },
    { to: "/patient/chat",        icon: MessageSquare,   label: "Pre-Screening" },
    { to: "/patient/appointments",icon: Calendar,        label: "Appointments"  },
    { to: "/patient/reports",     icon: FileText,        label: "My Reports"    },
    { to: "/patient/profile",     icon: Settings,        label: "Profile"       },
  ],
  doctor: [
    { to: "/doctor",              icon: LayoutDashboard, label: "Dashboard"     },
    { to: "/doctor/today",        icon: Clock,           label: "Today"         },
    { to: "/doctor/appointments", icon: Calendar,        label: "Appointments"  },
    { to: "/doctor/patients",     icon: Users,           label: "Patients"      },
    { to: "/doctor/slots",        icon: Settings,        label: "My Schedule"   },
  ],
  admin: [
    { to: "/admin",               icon: LayoutDashboard, label: "Dashboard"     },
    { to: "/admin/users",         icon: Users,           label: "Users"         },
    { to: "/admin/doctors",       icon: Stethoscope,     label: "Doctors"       },
    { to: "/admin/appointments",  icon: Calendar,        label: "Appointments"  },
    { to: "/admin/stats",         icon: BarChart3,       label: "Analytics"     },
  ],
};

const ROLE_LABEL = { patient: "Patient Portal", doctor: "Doctor Portal", admin: "Admin Panel" };
const ROLE_ICON  = { patient: MessageSquare, doctor: Stethoscope, admin: Shield };

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate  = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const links = NAV[role] || [];
  const RoleIcon = ROLE_ICON[role] || LayoutDashboard;

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-white dark:bg-gray-900
                 border-r border-gray-100 dark:border-gray-800 overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                        flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
          <RoleIcon size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="overflow-hidden">
              <p className="font-display font-bold text-gray-900 dark:text-white text-sm leading-none">MedScreen AI</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ROLE_LABEL[role]}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to.split("/").length <= 2}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`
            }>
            <Icon size={18} className="shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2`}>
        <div className={`flex ${collapsed ? "justify-center" : "items-center gap-3 px-2"}`}>
          <ThemeToggle />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="overflow-hidden min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={handleLogout}
          className={`sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30
                      hover:text-red-600 ${collapsed ? "justify-center px-2" : ""}`}>
          <LogOut size={18} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <motion.button
        onClick={() => setCollapsed(c => !c)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                   bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                   flex items-center justify-center shadow-sm z-10
                   text-gray-500 hover:text-brand-600 transition-colors">
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </motion.button>
    </motion.aside>
  );
}
