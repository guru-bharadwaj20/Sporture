import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "./storage";

interface ProtectedRouteProps {
  children: ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): ReactElement => {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
