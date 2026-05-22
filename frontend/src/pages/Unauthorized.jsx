import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { role }  = useAuth();
  const home      = role ? `/${role}` : "/login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
          <ShieldOff size={28} className="text-red-500" />
        </div>
        <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You don't have permission to view this page.
        </p>
        <button onClick={() => navigate(home)}
          className="btn-primary flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Go Back
        </button>
      </motion.div>
    </div>
  );
}
