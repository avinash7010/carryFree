import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { lazy, Suspense, useState, useEffect } from "react"
import "./App.css"
import Loader from "./components/Loader"
import ProtectedRoute from "./components/ProtectedRoute"
import GuestRoute from "./components/GuestRoute"

const Home = lazy(() => import("./components/Home"))
const Navbar = lazy(() => import("./components/Navbar"))
const ReportLost = lazy(() => import("./components/ReportLost"))
const ReportFound = lazy(() => import("./components/ReportFound"))
const BrowseItems = lazy(() => import("./components/BrowseItems"))
const PostPackage = lazy(() => import("./components/PostPackage"))
const PostTrip = lazy(() => import("./components/PostTrip"))
const CarryDashboard = lazy(() => import("./components/CarryDashboard"))
const BrowseTrips = lazy(() => import("./components/BrowseTrips"))
const MyItems = lazy(() => import("./components/MyItems"))
const Login = lazy(() => import("./components/Login"))
const Register = lazy(() => import("./components/Register"))
const Profile = lazy(() => import("./components/Profile"))

function App() {
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (initialLoading) {
    return <Loader />
  }

  return (
    <Router>
      <Suspense fallback={<Loader />}>
        <div className="app-shell">
          <Navbar />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/report-lost" element={<ProtectedRoute><ReportLost /></ProtectedRoute>} />
              <Route path="/report-found" element={<ProtectedRoute><ReportFound /></ProtectedRoute>} />
              <Route path="/browse-items" element={<BrowseItems />} />
              <Route path="/post-package" element={<ProtectedRoute><PostPackage /></ProtectedRoute>} />
              <Route path="/post-trip" element={<ProtectedRoute><PostTrip /></ProtectedRoute>} />
              <Route path="/browse-trips" element={<BrowseTrips />} />
              <Route path="/carry-dashboard" element={<ProtectedRoute><CarryDashboard /></ProtectedRoute>} />
              <Route path="/my-items" element={<ProtectedRoute><MyItems /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            </Routes>
          </main>
        </div>
      </Suspense>
    </Router>
  )
}

export default App
