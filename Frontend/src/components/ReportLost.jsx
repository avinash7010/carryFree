import { useState } from "react"
import { apiPost } from "../services/api"
import { getValidToken } from "../services/auth"
import { createClaim, getLostItemMatches } from "../services/carryfreeApi"

const emptyForm = {
    title: "",
    category: "",
    color: "",
    dateLost: "",
    location: "",
    phone: "",
    description: "",
}

const formatDate = (dateValue) => {
    if (!dateValue) {
        return "Not provided"
    }

    const date = new Date(dateValue)
    return Number.isNaN(date.getTime())
        ? dateValue
        : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function ReportLost() {
    const [formData, setFormData] = useState(emptyForm)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const [matches, setMatches] = useState([])
    const [matchesLoading, setMatchesLoading] = useState(false)
    const [matchesError, setMatchesError] = useState("")
    const [createdLostItemId, setCreatedLostItemId] = useState(null)
    const [claimingFoundItemId, setClaimingFoundItemId] = useState(null)
    const [claimedFoundItemId, setClaimedFoundItemId] = useState(null)
    const [claimMessage, setClaimMessage] = useState("")
    const [claimLoading, setClaimLoading] = useState(false)
    const [claimError, setClaimError] = useState("")

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((previous) => ({ ...previous, [name]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setMessage("")
        setError("")
        setMatches([])
        setMatchesError("")

        const token = getValidToken()
        if (!token) {
            setError("Please login before reporting lost items")
            setLoading(false)
            return
        }

        try {
            const response = await apiPost("/lost-items", formData, token)
            const createdLostItem = response.data
            const lostItemId = createdLostItem?._id || createdLostItem?.id
            setCreatedLostItemId(lostItemId)

            setMessage("Lost item reported successfully")
            setFormData(emptyForm)

            if (!lostItemId) {
                setMatchesError("Your report was created successfully, but matches could not be loaded right now")
                return
            }

            setMatchesLoading(true)

            try {
                const matchResponse = await getLostItemMatches(lostItemId, token)
                setMatches(matchResponse.data?.matches || [])
            } catch (matchError) {
                setMatchesError("Your report was created successfully, but matches could not be loaded right now")
            } finally {
                setMatchesLoading(false)
            }
        } catch (submitError) {
            setError(submitError.message || "Failed to report lost item")
        } finally {
            setLoading(false)
        }
    }

    const handleClaimSubmit = async (foundItemId) => {
        const token = getValidToken()
        if (!token || !createdLostItemId || !foundItemId) {
            return
        }

        setClaimLoading(true)
        setClaimError("")

        try {
            await createClaim({
                lostItemId: createdLostItemId,
                foundItemId,
                message: claimMessage,
            }, token)
            setClaimedFoundItemId(foundItemId)
            setClaimingFoundItemId(null)
            setClaimMessage("")
        } catch (claimErr) {
            setClaimError(claimErr.message || "Failed to submit claim")
        } finally {
            setClaimLoading(false)
        }
    }

    return (
        <div id="ReportLost" className="studio-page">
            <div className="studio-shell">
                <aside className="studio-side">
                    <span className="section-kicker">Lost item</span>
                    <h2>Tell the story clearly so the right person finds it.</h2>
                    <ul>
                        <li>Describe unique markers and last-seen place</li>
                        <li>Keep details specific and honest</li>
                        <li>Increase the chance of a fast match</li>
                    </ul>
                </aside>

                <div className="studio-card">
                    <div className="card-header-row">
                        <div>
                            <span className="mini-label">File a report</span>
                            <h3>Report Lost Item</h3>
                        </div>
                        <span className="status-badge lost">Active</span>
                    </div>

                    <form className="studio-form" onSubmit={handleSubmit}>
                        <div className="field-row two-up">
                            <div className="field-group">
                                <label htmlFor="LostItemName" className="field-label">Item Name</label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className="modern-input" id="LostItemName" placeholder="Enter item name" required />
                            </div>
                            <div className="field-group">
                                <label className="field-label">Category</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="modern-input select-input" required>
                                    <option value="">Select category</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="clothing">Clothing</option>
                                    <option value="accessories">Accessories</option>
                                    <option value="books">Books</option>
                                    <option value="keys">Keys</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="field-row two-up">
                            <div className="field-group">
                                <label htmlFor="LostColor" className="field-label">Color</label>
                                <input type="text" name="color" value={formData.color} onChange={handleChange} className="modern-input" id="LostColor" placeholder="e.g., Black, Blue, Red" required />
                            </div>
                            <div className="field-group">
                                <label htmlFor="DateLost" className="field-label">Date Lost</label>
                                <input type="date" name="dateLost" value={formData.dateLost} onChange={handleChange} id="DateLost" className="modern-input" required />
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Last Seen Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="modern-input" placeholder="e.g., Library 2nd Floor, Cafeteria, Room 205" required />
                        </div>

                        <div className="field-group">
                            <label className="field-label">📱 Phone Number <span className="optional-label">(Optional)</span></label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="modern-input" placeholder="Optional - for contact if item is found" />
                            <p className="field-hint">Optional - provide a number so the finder can reach you directly.</p>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Detailed Description</label>
                            <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="modern-input" placeholder="Any specific identifiers, scratches, stickers, or unique features..." required></textarea>
                        </div>

                        {message ? <p className="message success">{message}</p> : null}
                        {error ? <p className="message error">{error}</p> : null}
                        <button type="submit" className="primary-btn auth-submit" disabled={loading}>{loading ? "Submitting..." : "Submit Report"}</button>
                    </form>

                    {matchesLoading ? (
                        <section className="matches-panel" aria-live="polite">
                            <div className="panel-title-row">
                                <div>
                                    <span className="mini-label">Potential matches</span>
                                    <h3>Checking Found Items</h3>
                                </div>
                            </div>
                            <p className="default-state">Looking for items that may match your lost item...</p>
                        </section>
                    ) : null}

                    {matchesError ? <p className="message warning">{matchesError}</p> : null}

                    {!matchesLoading && !matchesError && matches.length === 0 && message ? (
                        <section className="matches-panel" aria-live="polite">
                            <div className="panel-title-row">
                                <div>
                                    <span className="mini-label">Potential matches</span>
                                    <h3>No Potential Matches Yet</h3>
                                </div>
                            </div>
                            <p className="default-state">These items may match your lost item. No potential matches are available right now.</p>
                        </section>
                    ) : null}

                    {!matchesLoading && matches.length > 0 ? (
                        <section className="matches-panel" aria-live="polite">
                            <div className="panel-title-row">
                                <div>
                                    <span className="mini-label">Potential matches</span>
                                    <h3>Potential Matches</h3>
                                </div>
                                <span className="status-badge neutral">{matches.length} found</span>
                            </div>
                            <p className="matches-intro">These items may match your lost item.</p>

                            <div className="matches-list">
                                {matches.map((match) => {
                                    const foundItem = match.foundItem || {}

                                    return (
                                        <article key={foundItem._id || `${foundItem.title}-${match.score}`} className="potential-match-card">
                                            {foundItem.image ? (
                                                <img className="match-found-image" src={foundItem.image} alt={foundItem.title || "Found item"} />
                                            ) : null}
                                            <div className="match-card-content">
                                                <div className="match-card-heading">
                                                    <div>
                                                        <span className="item-status found">Found item</span>
                                                        <h4>{foundItem.title || "Untitled found item"}</h4>
                                                    </div>
                                                    <div className="match-score" aria-label={`Match score ${match.score}`}>
                                                        <strong>{match.score}</strong>
                                                        <span>{String(match.level || "").replace(/_/g, " ")}</span>
                                                    </div>
                                                </div>
                                                <div className="item-meta match-item-meta">
                                                    <span><strong>Category:</strong> {foundItem.category || "Not provided"}</span>
                                                    <span><strong>Found at:</strong> {foundItem.location || "Not provided"}</span>
                                                    <span><strong>Date found:</strong> {formatDate(foundItem.dateFound)}</span>
                                                    {foundItem.color ? <span><strong>Color:</strong> {foundItem.color}</span> : null}
                                                </div>
                                                {match.reasons?.length > 0 ? (
                                                    <div className="match-reasons">
                                                        <strong>Why it may match</strong>
                                                        <ul>
                                                            {match.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                                                        </ul>
                                                    </div>
                                                ) : null}

                                                {foundItem.status === "found" ? (
                                                    <div className="claim-action-area">
                                                        {claimedFoundItemId === foundItem._id ? (
                                                            <p className="message success">Claim submitted! The finder will review your request.</p>
                                                        ) : claimingFoundItemId === foundItem._id ? (
                                                            <div className="claim-form-inline">
                                                                <label className="field-label">Verify this is your item</label>
                                                                <textarea
                                                                    rows="2"
                                                                    className="modern-input"
                                                                    placeholder="Describe how you can prove this is yours (serial number, unique markings, etc.)"
                                                                    value={claimMessage}
                                                                    onChange={(e) => setClaimMessage(e.target.value)}
                                                                />
                                                                {claimError ? <p className="message error">{claimError}</p> : null}
                                                                <div className="claim-form-actions">
                                                                    <button type="button" className="primary-btn small-btn" disabled={claimLoading || !claimMessage.trim()} onClick={() => handleClaimSubmit(foundItem._id)}>
                                                                        {claimLoading ? "Submitting..." : "Submit Claim"}
                                                                    </button>
                                                                    <button type="button" className="secondary-btn small-btn" onClick={() => { setClaimingFoundItemId(null); setClaimMessage(""); setClaimError(""); }} disabled={claimLoading}>
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button type="button" className="primary-btn small-btn claim-btn" onClick={() => { setClaimingFoundItemId(foundItem._id); setClaimError(""); }}>
                                                                Claim This Item
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default ReportLost
