import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { lazy, Suspense, useState, useEffect } from "react"
import Loader from "./components/Loader"

const Home = lazy(() => import("./components/Home"))
const Navbar = lazy(() => import("./components/Navbar"))
const ReportLost = lazy(() => import("./components/ReportLost"))
const ReportFound = lazy(() => import("./components/ReportFound"))
const BrowseItems = lazy(() => import("./components/BrowseItems"))
const Login = lazy(() => import("./components/Login"))
const Register = lazy(() => import("./components/Register"))

function App() {
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (initialLoading) {
    return <Loader />
  }

  return (
  <Router>
      <Suspense fallback={<Loader />}>
        <div className="z-3 fixed-top">
          <Navbar />
        </div>
        <div className="pt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report-lost" element={<ReportLost />} />
            <Route path="/report-found" element={<ReportFound />} />
            <Route path="/browse-items" element={<BrowseItems />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </Suspense>
    </Router>
  )
}

export default App
