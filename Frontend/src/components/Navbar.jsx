import { useEffect, useState, useCallback } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { clearToken, getToken, getValidToken, getCurrentUser } from "../services/auth"
import { apiGet } from "../services/api"

const navItems = [
  { to: "/", label: "Home" },
  { to: "/report-lost", label: "Report Lost" },
  { to: "/report-found", label: "Report Found" },
  { to: "/post-package", label: "Post Package" },
  { to: "/post-trip", label: "Post Trip" },
  { to: "/browse-trips", label: "Browse Trips" },
  { to: "/browse-packages", label: "Browse Packages" },
  { to: "/carry-dashboard", label: "Dashboard" },
  { to: "/notifications", label: "Notifications", isNotifications: true },
  { to: "/my-items", label: "My Items" },
  { to: "/browse-items", label: "Browse Items" },
]

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getValidToken()))
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("carryfree-theme")
    return savedTheme ? savedTheme === "dark" : false
  })
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    const token = getValidToken()
    if (!token) {
      setUnreadCount(0)
      return
    }
    try {
      const response = await apiGet("/notifications/my?page=1&limit=1", token)
      setUnreadCount(response.data?.unreadCount || 0)
    } catch {
      // silent — badge stays at last known count
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    const checkAndSyncAuth = () => {
      const rawToken = getToken()
      const validToken = getValidToken()
      const loggedIn = Boolean(validToken)
      const sessionExpired = Boolean(rawToken) && !loggedIn
      setIsLoggedIn(loggedIn)

      if (!loggedIn && ![ "/login", "/register" ].includes(location.pathname)) {
        navigate("/login", {
          replace: true,
          state: sessionExpired
            ? { authMessage: "Session expired. Please login again." }
            : undefined,
        })
      }
    }

    checkAndSyncAuth()

    const intervalId = setInterval(checkAndSyncAuth, 30000)
    window.addEventListener("storage", checkAndSyncAuth)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("storage", checkAndSyncAuth)
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    document.body.dataset.theme = darkMode ? "dark" : "light"
    localStorage.setItem("carryfree-theme", darkMode ? "dark" : "light")
  }, [darkMode])

  const handleLogout = () => {
    clearToken()
    setIsLoggedIn(false)
    setUnreadCount(0)
    navigate("/login")
  }

  return (
    <header className="topbar-wrap">
      <div className="navbar-shell">
        <Link className="brand-mark" to="/">
          <span className="brand-icon">CF</span>
          CarryFree
        </Link>

        <nav className="nav-links d-none d-lg-flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-pill ${location.pathname === item.to ? "nav-pill-active" : ""}`}
            >
              {item.label}
              {item.isNotifications && isLoggedIn && unreadCount > 0 ? (
                <span className="nav-badge">{unreadCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="nav-actions d-none d-lg-flex">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label="Toggle dark mode"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <i className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-fill"}`} />
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>

          {isLoggedIn ? (
            <>
              {currentUser && (
                <Link to={`/profile/${currentUser.id}`} className="profile-btn">
                  Profile
                </Link>
              )}
              <button type="button" onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}
        </div>

        <div className="dropdown d-lg-none d-flex">
          <button
            className="mobile-menu-btn"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-list fs-5"></i>
          </button>
          <div className="dropdown-menu dropdown-menu-end mobile-menu-panel">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`mobile-menu-item ${location.pathname === item.to ? "active" : ""}`}
              >
                {item.label}
                {item.isNotifications && isLoggedIn && unreadCount > 0 ? (
                  <span className="nav-badge mobile">{unreadCount}</span>
                ) : null}
              </Link>
            ))}

            <button
              type="button"
              className="mobile-menu-item theme-item"
              onClick={() => setDarkMode((prev) => !prev)}
            >
              <span>{darkMode ? "Light mode" : "Dark mode"}</span>
            </button>

            {isLoggedIn ? (
              <>
                {currentUser && (
                  <Link to={`/profile/${currentUser.id}`} className="mobile-menu-item">
                    Profile
                  </Link>
                )}
                <button type="button" onClick={handleLogout} className="mobile-menu-item danger-item">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="mobile-menu-item active">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
