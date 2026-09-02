import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from "../services/carryfreeApi"
import { getValidToken } from "../services/auth"

const resolveNotificationLink = (notification) => {
  const { type, metadata } = notification
  if (!metadata) return null

  switch (type) {
    case "booking_requested":
    case "booking_accepted":
    case "booking_rejected":
    case "booking_confirmed":
    case "in_transit":
    case "otp_generated":
    case "delivered":
    case "payment_released":
    case "payment_locked":
      return "/carry-dashboard"

    case "claim_received":
    case "claim_approved":
    case "claim_rejected":
      return "/my-items"

    case "lost_found_potential_match":
      return "/browse-items"

    case "review_posted":
      return metadata.travelerId ? `/profile/${metadata.travelerId}` : null

    default:
      return null
  }
}

function Notifications() {
  const navigate = useNavigate()
  const token = getValidToken()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const limit = 15

  const loadNotifications = useCallback(async (pageNum) => {
    if (!token) {
      setError("Session expired. Please login again.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await getMyNotifications(token, pageNum, limit)
      const data = response.data || {}
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      const total = Math.ceil((data.notifications?.length || 0) / limit)
      setTotalPages(Math.max(1, total))
      if (pageNum === 1 && (data.notifications || []).length === limit) {
        setTotalPages(pageNum + 1)
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadNotifications(page)
  }, [page, loadNotifications])

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId, token)
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silent — UI stays as-is
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification._id)
    }
    const link = resolveNotificationLink(notification)
    if (link) {
      navigate(link)
    }
  }

  return (
    <div id="Notifications" className="marketplace-page">
      <div className="marketplace-shell">
        <div className="marketplace-header">
          <div>
            <span className="section-kicker">Activity feed</span>
            <h2>Notifications</h2>
          </div>
          <div className="marketplace-badges">
            <span>{unreadCount} unread</span>
            {unreadCount > 0 ? (
              <button type="button" className="secondary-btn small-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>
        </div>

        {loading ? <p className="default-state">Loading notifications...</p> : null}
        {error ? <p className="message error">{error}</p> : null}

        {!loading && !error && notifications.length === 0 ? (
          <p className="default-state">No notifications yet.</p>
        ) : null}

        {!loading && !error && notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((notification) => {
              const link = resolveNotificationLink(notification)
              return (
                <div
                  key={notification._id}
                  className={`notification-item${!notification.isRead ? " unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={link ? { cursor: "pointer" } : undefined}
                >
                  <div>
                    <p className="notif-title">{notification.title}</p>
                    <p className="notif-copy">{notification.message}</p>
                    <p className="notif-time">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                  {!notification.isRead ? (
                    <button
                      type="button"
                      className="secondary-btn small-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkRead(notification._id)
                      }}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="status-badge neutral">Read</span>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}

        {!loading && !error && (totalPages > 1 || page > 1) ? (
          <div className="action-row" style={{ justifyContent: "center", marginTop: "1rem" }}>
            <button
              type="button"
              className="secondary-btn small-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="dashboard-pill">Page {page}</span>
            <button
              type="button"
              className="secondary-btn small-btn"
              disabled={notifications.length < limit}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Notifications
