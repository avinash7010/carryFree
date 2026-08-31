import { Navigate, useLocation } from "react-router-dom"
import { getValidToken } from "../services/auth"

function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = getValidToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
