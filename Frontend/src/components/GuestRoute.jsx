import { Navigate } from "react-router-dom"
import { getValidToken } from "../services/auth"

function GuestRoute({ children }) {
  const token = getValidToken()

  if (token) {
    return <Navigate to="/carry-dashboard" replace />
  }

  return children
}

export default GuestRoute
