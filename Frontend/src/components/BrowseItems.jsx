import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiGet } from "../services/api"

const toRelativeTime = (dateValue) => {
    const date = new Date(dateValue)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
        return "Today"
    }

    if (diffDays === 1) {
        return "1 day ago"
    }

    return `${diffDays} days ago`
}

function BrowseItems() {
    const navigate = useNavigate()
    const [lostItems, setLostItems] = useState([])
    const [foundItems, setFoundItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [categoryFilter, setCategoryFilter] = useState("")
    const [locationFilter, setLocationFilter] = useState("")
    const [typeFilter, setTypeFilter] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const loadItems = async () => {
            setLoading(true)
            setError("")

            try {
                const [lostResponse, foundResponse] = await Promise.all([
                    apiGet("/lost-items"),
                    apiGet("/found-items"),
                ])

                setLostItems((lostResponse.data || []).map((item) => ({ ...item, itemType: "lost" })))
                setFoundItems((foundResponse.data || []).map((item) => ({ ...item, itemType: "found" })))
            } catch (loadError) {
                setError(loadError.message || "Failed to load items")
            } finally {
                setLoading(false)
            }
        }

        loadItems()
    }, [])

    const allItems = useMemo(() => [...lostItems, ...foundItems], [lostItems, foundItems])

    const locationOptions = useMemo(() => {
        const values = new Set(allItems.map((item) => item.location).filter(Boolean))
        return Array.from(values)
    }, [allItems])

    const filteredItems = useMemo(() => {
        return allItems.filter((item) => {
            const categoryMatch = categoryFilter ? item.category === categoryFilter : true
            const locationMatch = locationFilter ? item.location === locationFilter : true
            const typeMatch = typeFilter ? item.itemType === typeFilter : true

            const title = (item.title || "").toLowerCase()
            const description = (item.description || "").toLowerCase()
            const query = searchQuery.trim().toLowerCase()
            const searchMatch = query ? title.includes(query) || description.includes(query) : true

            return categoryMatch && locationMatch && typeMatch && searchMatch
        })
    }, [allItems, categoryFilter, locationFilter, typeFilter, searchQuery])

    return (
        <div id="BrowseItems" className="marketplace-page">
            <div className="marketplace-shell">
                <div className="marketplace-header">
                    <div>
                        <span className="section-kicker">Find the trail</span>
                        <h2>Browse Lost & Found Items</h2>
                    </div>
                    <div className="marketplace-badges">
                        <span>{allItems.length} active listings</span>
                        <span>{lostItems.length} lost</span>
                        <span>{foundItems.length} found</span>
                    </div>
                </div>

                <div className="filter-grid">
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="modern-input select-input">
                        <option value="">All Categories</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="accessories">Accessories</option>
                        <option value="books">Books</option>
                        <option value="keys">Keys</option>
                        <option value="other">Other</option>
                    </select>
                    <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="modern-input select-input">
                        <option value="">All Locations</option>
                        {locationOptions.map((location) => (
                            <option key={location} value={location}>{location}</option>
                        ))}
                    </select>
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="modern-input select-input">
                        <option value="">Lost & Found</option>
                        <option value="lost">Lost Items</option>
                        <option value="found">Found Items</option>
                    </select>
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} type="text" placeholder="Search items..." className="modern-input" />
                </div>

                <div className="items-list">
                    {loading ? <p className="default-state">Loading items...</p> : null}
                    {error ? <p className="message error">{error}</p> : null}

                    {!loading && !error && filteredItems.length === 0 ? (
                        <p className="default-state">No items found for the selected filters.</p>
                    ) : null}

                    {!loading && !error && filteredItems.map((item) => {
                        const isLost = item.itemType === "lost"

                        return (
                            <div key={`${item.itemType}-${item._id}`} className={`market-card ${isLost ? "lost" : "found"}`}>
                                {item.image ? (
                                    <img className="market-card-image" src={item.image} alt={item.title || "Item"} />
                                ) : null}
                                <div className="item-header">
                                    <span className={`item-status ${isLost ? "lost" : "found"}`}>
                                        {isLost ? "Lost" : "Found"}
                                    </span>
                                    <span className="item-time">{toRelativeTime(item.createdAt)}</span>
                                </div>
                                <h3>{item.title}</h3>
                                <p className="item-description">{item.description}</p>
                                <div className="item-meta">
                                    <span><strong>{isLost ? "Last seen" : "Found at"}:</strong> {item.location}</span>
                                    <span><strong>Category:</strong> {item.category}</span>
                                    {item.color ? <span><strong>Color:</strong> {item.color}</span> : null}
                                    {!isLost && item.phone ? <span className="phone-display"><strong>📞 Contact:</strong> {item.phone}</span> : null}
                                </div>

                                <div className="item-actions">
                                    {!isLost && item.phone ? (
                                        <button type="button" className="secondary-btn small-btn contact-btn" onClick={() => window.alert(
                                            `📞 Contact Information\n\nItem: ${item.title}\nFound by: ${item.createdBy?.name || 'the finder'}\n📱 Phone: ${item.phone}\n\n💡 Tip: Call or WhatsApp them!`
                                        )}>
                                            📞 Contact Owner
                                        </button>
                                    ) : null}
                                    {!isLost && !item.phone ? (
                                        <span className="no-contact-hint">Phone not provided</span>
                                    ) : null}
                                    {isLost ? (
                                        <button type="button" className="secondary-btn small-btn found-btn" onClick={() => navigate(`/report-found?lostItem=${item._id}&title=${encodeURIComponent(item.title || '')}&category=${encodeURIComponent(item.category || '')}&color=${encodeURIComponent(item.color || '')}&location=${encodeURIComponent(item.location || '')}&description=${encodeURIComponent(item.description || '')}`)}>
                                            ✅ I Found This!
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default BrowseItems
