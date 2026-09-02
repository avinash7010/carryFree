import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { apiGet } from "../services/api"
import { getValidToken, getCurrentUser } from "../services/auth"

function Profile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentUser = getCurrentUser()
  const isOwnProfile = currentUser && currentUser.id === id

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = getValidToken()
        const path = isOwnProfile ? "/users/me" : `/users/${id}`
        const data = await apiGet(path, token)
        setProfile(data.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProfile()
    }
  }, [id, isOwnProfile])

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-error">{error}</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-error">Profile not found</div>
      </div>
    )
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="profile-identity">
            <h1>{profile.name}</h1>
            <span className="profile-role">{profile.role}</span>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="stat-value">{profile.rating ?? 0}</span>
            <span className="stat-label">Rating</span>
          </div>
          <div className="profile-stat">
            <span className="stat-value">{profile.totalReviews ?? 0}</span>
            <span className="stat-label">Reviews</span>
          </div>
          <div className="profile-stat">
            <span className="stat-value">{profile.completedDeliveries ?? 0}</span>
            <span className="stat-label">Deliveries</span>
          </div>
        </div>

        {isOwnProfile && profile.email && (
          <div className="profile-detail">
            <span className="detail-label">Email</span>
            <span className="detail-value">{profile.email}</span>
          </div>
        )}

        {memberSince && (
          <div className="profile-detail">
            <span className="detail-label">Member since</span>
            <span className="detail-value">{memberSince}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
