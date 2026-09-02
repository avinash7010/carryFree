import { useEffect, useMemo, useState } from "react"
import { getPublicPackages } from "../services/carryfreeApi"
import { apiGet } from "../services/api"

const toRelativeDate = (dateValue) => {
    if (!dateValue) return "Unknown"
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return "Unknown"
    const now = new Date()
    const diffMs = date - now
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "Past"
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    return `In ${diffDays} days`
}

const statusBadgeClass = (status) => {
    if (status === "pending") return "found"
    if (status === "matched") return "neutral"
    if (status === "in-transit") return "found"
    if (status === "delivered") return "found"
    return "lost"
}

const statusLabel = (status) => {
    if (status === "pending") return "Available"
    if (status === "matched") return "Matched"
    if (status === "in-transit") return "In Transit"
    if (status === "delivered") return "Delivered"
    if (status === "cancelled") return "Cancelled"
    return status
}

function BrowsePackages() {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [statusFilter, setStatusFilter] = useState("")
    const [cityFilter, setCityFilter] = useState("")
    const [maxWeight, setMaxWeight] = useState("")

    const [selectedPackageId, setSelectedPackageId] = useState("")
    const [detailPackage, setDetailPackage] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState("")

    useEffect(() => {
        const loadPackages = async () => {
            setLoading(true)
            setError("")

            try {
                const response = await getPublicPackages()
                setPackages(response.data || [])
            } catch (loadError) {
                setError(loadError.message || "Failed to load packages")
            } finally {
                setLoading(false)
            }
        }

        loadPackages()
    }, [])

    useEffect(() => {
        if (!selectedPackageId) {
            setDetailPackage(null)
            return
        }

        const fetchDetail = async () => {
            setDetailLoading(true)
            setDetailError("")
            setDetailPackage(null)

            try {
                const response = await apiGet(`/packages/${selectedPackageId}`)
                setDetailPackage(response.data || null)
            } catch (fetchError) {
                setDetailError(fetchError.message || "Failed to load package details")
            } finally {
                setDetailLoading(false)
            }
        }

        fetchDetail()
    }, [selectedPackageId])

    const cityOptions = useMemo(() => {
        const values = new Set()
        packages.forEach((pkg) => {
            if (pkg.pickupLocation?.city) values.add(pkg.pickupLocation.city)
            if (pkg.dropLocation?.city) values.add(pkg.dropLocation.city)
        })
        return Array.from(values).sort()
    }, [packages])

    const filteredPackages = useMemo(() => {
        return packages.filter((pkg) => {
            const statusMatch = statusFilter ? pkg.status === statusFilter : true

            const cityMatch = cityFilter
                ? pkg.pickupLocation?.city?.toLowerCase().includes(cityFilter.toLowerCase()) ||
                  pkg.dropLocation?.city?.toLowerCase().includes(cityFilter.toLowerCase())
                : true

            const weightMatch = maxWeight
                ? Number(maxWeight) >= 0 && pkg.weight <= Number(maxWeight)
                : true

            return statusMatch && cityMatch && weightMatch
        })
    }, [packages, statusFilter, cityFilter, maxWeight])

    const closeDetail = () => {
        setSelectedPackageId("")
        setDetailPackage(null)
        setDetailError("")
    }

    return (
        <div id="BrowsePackages" className="marketplace-page">
            <div className="marketplace-shell">
                <div className="marketplace-header">
                    <div>
                        <span className="section-kicker">Delivery demand</span>
                        <h2>Browse Packages</h2>
                    </div>
                    <div className="marketplace-badges">
                        <span>{filteredPackages.length} packages</span>
                        <span>{packages.length} total</span>
                    </div>
                </div>

                <div className="filter-grid">
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="modern-input select-input"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Available</option>
                        <option value="matched">Matched</option>
                        <option value="in-transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                    </select>
                    <select
                        value={cityFilter}
                        onChange={(event) => setCityFilter(event.target.value)}
                        className="modern-input select-input"
                    >
                        <option value="">All Cities</option>
                        {cityOptions.map((city) => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Max weight (kg)"
                        value={maxWeight}
                        onChange={(event) => setMaxWeight(event.target.value)}
                        className="modern-input"
                    />
                </div>

                <div className="items-list">
                    {loading ? <p className="default-state">Loading packages...</p> : null}
                    {error ? <p className="message error">{error}</p> : null}

                    {!loading && !error && filteredPackages.length === 0 ? (
                        <p className="default-state">No packages found for the selected filters.</p>
                    ) : null}

                    {!loading && !error && filteredPackages.map((pkg) => (
                        <div key={pkg._id} className={`market-card ${pkg.status === "pending" ? "found" : ""}`}>
                            <div className="item-header">
                                <span className={`item-status ${statusBadgeClass(pkg.status)}`}>
                                    {statusLabel(pkg.status)}
                                </span>
                                <span className="item-time">{toRelativeDate(pkg.expectedDate)}</span>
                            </div>
                            <h3>{pkg.pickupLocation?.city} → {pkg.dropLocation?.city}</h3>
                            <div className="item-meta">
                                <span><strong>Weight:</strong> {pkg.weight}kg</span>
                                <span><strong>Expected:</strong> {pkg.expectedDate ? new Date(pkg.expectedDate).toLocaleDateString() : "N/A"}</span>
                                {pkg.senderId ? (
                                    <span><strong>Sender:</strong> {pkg.senderId.name || "Unknown"} ({pkg.senderId.rating ?? 0}★, {pkg.senderId.completedDeliveries ?? 0} deliveries)</span>
                                ) : null}
                                {pkg.matchedTrip ? (
                                    <span><strong>Matched trip:</strong> {pkg.matchedTrip.source?.city} → {pkg.matchedTrip.destination?.city}</span>
                                ) : null}
                            </div>

                            <div className="item-actions">
                                <button
                                    type="button"
                                    className="secondary-btn small-btn found-btn"
                                    onClick={() => setSelectedPackageId(pkg._id)}
                                >
                                    View Package Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedPackageId ? (
                <div className="modal-overlay" onClick={closeDetail}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="panel-title-row">
                            <h3>Package Details</h3>
                            <button type="button" className="secondary-btn small-btn" onClick={closeDetail}>
                                Close
                            </button>
                        </div>

                        {detailLoading ? <p className="default-state">Loading package details...</p> : null}
                        {detailError ? <p className="message error">{detailError}</p> : null}

                        {!detailLoading && !detailError && detailPackage ? (
                            <div>
                                <div className="match-card">
                                    <div>
                                        <p className="match-route">
                                            {detailPackage.pickupLocation?.city} → {detailPackage.dropLocation?.city}
                                        </p>
                                        <p className="match-meta">
                                            Weight: {detailPackage.weight}kg | Expected: {detailPackage.expectedDate ? new Date(detailPackage.expectedDate).toLocaleDateString() : "N/A"} | Status: {detailPackage.status}
                                        </p>
                                        {detailPackage.paymentStatus ? (
                                            <p className="match-meta">
                                                Payment: {detailPackage.paymentStatus}
                                            </p>
                                        ) : null}
                                        {detailPackage.createdAt ? (
                                            <p className="match-meta subtle">
                                                Posted: {new Date(detailPackage.createdAt).toLocaleDateString()}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                {detailPackage.senderId ? (
                                    <div className="match-card" style={{ marginTop: "0.75rem" }}>
                                        <div>
                                            <p className="match-meta">
                                                <strong>Sender:</strong> {detailPackage.senderId.name || "Unknown"}
                                            </p>
                                            {detailPackage.senderId.rating != null ? (
                                                <p className="match-meta">
                                                    Rating: {detailPackage.senderId.rating}★ | Deliveries: {detailPackage.senderId.completedDeliveries ?? 0}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}

                                {detailPackage.matchedTrip ? (
                                    <div className="match-card" style={{ marginTop: "0.75rem" }}>
                                        <div>
                                            <p className="match-route">
                                                Matched trip: {detailPackage.matchedTrip.source?.city} → {detailPackage.matchedTrip.destination?.city}
                                            </p>
                                            <p className="match-meta">
                                                Date: {detailPackage.matchedTrip.date ? new Date(detailPackage.matchedTrip.date).toLocaleDateString() : "N/A"} | Capacity: {detailPackage.matchedTrip.availableCapacityKg}kg
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default BrowsePackages
