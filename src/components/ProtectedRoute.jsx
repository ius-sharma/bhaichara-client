import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles, redirectTo = "/login" }) => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("ProtectedRoute must be used within an AuthProvider.");
  }

  const { user } = authContext;

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = user?.role;

    if (!allowedRoles.includes(userRole)) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
