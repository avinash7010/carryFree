import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getOpenTrips } from "../services/carryfreeApi"
import { getValidToken } from "../services/auth"

const toRelativeDate = (dateValue) => {
    const date = new Date(dateValue)
    const now = new Date()
    const diffMs = date - now
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        return "Past"
    }

    if (diffDays === 0) {
        return "Today"
    }

    if (diffDays === 1) {
        return "Tomorrow"
    }

    return `In ${diffDays} days`
}

function BrowseTrips() {
    const navigate = useNavigate()
    const [trips, setTrips] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [cityFilter, setCityFilter] = useState("")
    const [dateFilter, setDateFilter] = useState("")
    const [minCapacity, setMinCapacity] = useState("")

    useEffect(() => {
        const loadTrips = async () => {
            setLoading(true)
            setError("")

            try {
                const response = await getOpenTrips()
                setTrips(response.data || [])
            } catch (loadError) {
                setError(loadError.message || "Failed to load trips")
            } finally {
                setLoading(false)
            }
        }

        loadTrips()
    }, [])

    const cityOptions = useMemo(() => {
        const values = new Set()
        trips.forEach((trip) => {
            if (trip.source?.city) values.add(trip.source.city)
            if (trip.destination?.city) values.add(trip.destination.city)
        })
        return Array.from(values).sort()
    }, [trips])

    const filteredTrips = useMemo(() => {
        return trips.filter((trip) => {
            const cityMatch = cityFilter
                ? trip.source?.city?.toLowerCase().includes(cityFilter.toLowerCase()) ||
                  trip.destination?.city?.toLowerCase().includes(cityFilter.toLowerCase())
                : true

            const dateMatch = dateFilter
                ? new Date(trip.date).toISOString().split("T")[0] === dateFilter
                : true

            const capacityMatch = minCapacity
                ? trip.availableCapacityKg >= Number(minCapacity)
                : true

            return cityMatch && dateMatch && capacityMatch
        })
    }, [trips, cityFilter, dateFilter, minCapacity])

    return (
        <div id="BrowseTrips" className="marketplace-page">
            <div className="marketplace-shell">
                <div className="marketplace-header">
                    <div>
                        <span className="section-kicker">Open routes</span>
                        <h2>Browse Open Trips</h2>
                    </div>
                    <div className="marketplace-badges">
                        <span>{filteredTrips.length} trips</span>
                        <span>{trips.length} total</span>
                    </div>
                </div>

                <div className="filter-grid">
                    <input
                        type="text"
                        placeholder="Search by city..."
                        value={cityFilter}
                        onChange={(event) => setCityFilter(event.target.value)}
                        className="modern-input"
                    />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                        className="modern-input"
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Min capacity (kg)"
                        value={minCapacity}
                        onChange={(event) => setMinCapacity(event.target.value)}
                        className="modern-input"
                    />
                </div>

                <div className="items-list">
                    {loading ? <p className="default-state">Loading trips...</p> : null}
                    {error ? <p className="message error">{error}</p> : null}

                    {!loading && !error && filteredTrips.length === 0 ? (
                        <p className="default-state">No trips found for the selected filters.</p>
                    ) : null}

                    {!loading && !error && filteredTrips.map((trip) => (
                        <div key={trip._id} className="market-card found">
                            <div className="item-header">
                                <span className="item-status found">Open</span>
                                <span className="item-time">{toRelativeDate(trip.date)}</span>
                            </div>
                            <h3>{trip.source?.city} → {trip.destination?.city}</h3>
                            <div className="item-meta">
                                <span><strong>Date:</strong> {new Date(trip.date).toLocaleDateString()}</span>
                                <span><strong>Capacity:</strong> {trip.availableCapacityKg}kg / {trip.capacityKg}kg</span>
                                {trip.travelerId ? (
                                    <span><strong>Traveler:</strong> {trip.travelerId.name || "Unknown"}</span>
                                ) : null}
                            </div>
                            {trip.notes ? <p className="item-description">{trip.notes}</p> : null}

                            <div className="item-actions">
                                {getValidToken() ? (
                                    <button
                                        type="button"
                                        className="secondary-btn small-btn found-btn"
                                        onClick={() => navigate(`/carry-dashboard?tripId=${trip._id}`)}
                                    >
                                        Book this trip
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="secondary-btn small-btn"
                                        onClick={() => navigate("/login")}
                                    >
                                        Login to book
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default BrowseTrips
