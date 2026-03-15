import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("ProtectedRoute must be used within an AuthProvider.");
  }

  const { user } = authContext;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
