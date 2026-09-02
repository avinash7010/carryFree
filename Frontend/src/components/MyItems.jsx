import { useEffect, useState } from "react"
import { getMyLostItems, getMyFoundItems } from "../services/carryfreeApi"
import { getValidToken } from "../services/auth"

const toRelativeTime = (dateValue) => {
    const date = new Date(dateValue)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return "Today"
    if (diffDays === 1) return "1 day ago"
    return `${diffDays} days ago`
}

const formatDate = (dateValue) => {
    if (!dateValue) return null
    const date = new Date(dateValue)
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

const statusLabel = (itemType, status) => {
    if (itemType === "lost") {
        if (status === "claimed") return "Claimed"
        return "Lost"
    }
    if (status === "returned") return "Returned"
    return "Found"
}

function MyItems() {
    const [activeTab, setActiveTab] = useState("lost")
    const [lostItems, setLostItems] = useState([])
    const [foundItems, setFoundItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const loadMyItems = async () => {
            const token = getValidToken()
            if (!token) {
                setError("Session expired. Please login again.")
                setLoading(false)
                return
            }

            setLoading(true)
            setError("")

            try {
                const [lostResponse, foundResponse] = await Promise.all([
                    getMyLostItems(token),
                    getMyFoundItems(token),
                ])
                setLostItems(lostResponse.data || [])
                setFoundItems(foundResponse.data || [])
            } catch (loadError) {
                setError(loadError.message || "Failed to load your items")
            } finally {
                setLoading(false)
            }
        }

        loadMyItems()
    }, [])

    const items = activeTab === "lost" ? lostItems : foundItems
    const isLost = activeTab === "lost"

    return (
        <div id="MyItems" className="marketplace-page">
            <div className="marketplace-shell">
                <div className="marketplace-header">
                    <div>
                        <span className="section-kicker">Your reports</span>
                        <h2>My Items</h2>
                    </div>
                    <div className="marketplace-badges">
                        <span>{lostItems.length} lost</span>
                        <span>{foundItems.length} found</span>
                    </div>
                </div>

                <div className="my-items-tabs">
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === "lost" ? "active" : ""}`}
                        onClick={() => setActiveTab("lost")}
                    >
                        My Lost Items
                        {lostItems.length > 0 ? <span className="tab-count">{lostItems.length}</span> : null}
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === "found" ? "active" : ""}`}
                        onClick={() => setActiveTab("found")}
                    >
                        My Found Items
                        {foundItems.length > 0 ? <span className="tab-count">{foundItems.length}</span> : null}
                    </button>
                </div>

                {loading ? <p className="default-state">Loading your items...</p> : null}
                {error ? <p className="message error">{error}</p> : null}

                {!loading && !error && items.length === 0 ? (
                    <div className="empty-state-card">
                        <p className="empty-state-title">
                            {isLost ? "No lost items reported yet." : "No found items reported yet."}
                        </p>
                        <p className="empty-state-copy">
                            {isLost
                                ? "When you report a lost item, it will appear here."
                                : "When you report a found item, it will appear here."}
                        </p>
                    </div>
                ) : null}

                {!loading && !error && items.length > 0 ? (
                    <div className="items-list">
                        {items.map((item) => {
                            const itemStatus = statusLabel(activeTab, item.status)
                            const isClaimed = item.status === "claimed" || item.status === "returned"

                            return (
                                <div key={item._id} className={`market-card ${isLost ? "lost" : "found"}`}>
                                    {item.image ? (
                                        <img className="market-card-image" src={item.image} alt={item.title || "Item"} />
                                    ) : null}
                                    <div className="item-header">
                                        <span className={`item-status ${isLost ? "lost" : "found"}`}>
                                            {itemStatus}
                                        </span>
                                        <span className="item-time">{toRelativeTime(item.createdAt)}</span>
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p className="item-description">{item.description}</p>
                                    <div className="item-meta">
                                        <span><strong>{isLost ? "Last seen" : "Found at"}:</strong> {item.location}</span>
                                        <span><strong>Category:</strong> {item.category}</span>
                                        {item.color ? <span><strong>Color:</strong> {item.color}</span> : null}
                                        {item.phone ? <span><strong>Phone:</strong> {item.phone}</span> : null}
                                        {isLost && item.dateLost ? <span><strong>Date lost:</strong> {formatDate(item.dateLost)}</span> : null}
                                        {!isLost && item.dateFound ? <span><strong>Date found:</strong> {formatDate(item.dateFound)}</span> : null}
                                    </div>
                                    {isClaimed ? (
                                        <div className="item-actions">
                                            <span className="status-badge neutral">
                                                {item.status === "claimed" ? "Claim approved" : "Returned to owner"}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default MyItems
