import { useState } from "react"
import { apiPost } from "../services/api"
import { getValidToken } from "../services/auth"
import { getFoundItemMatches } from "../services/carryfreeApi"

const emptyForm = {
    title: "",
    category: "",
    color: "",
    dateFound: "",
    location: "",
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

function ReportFound() {
    const [formData, setFormData] = useState(emptyForm)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const [matches, setMatches] = useState([])
    const [matchesLoading, setMatchesLoading] = useState(false)
    const [matchesError, setMatchesError] = useState("")

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
            setError("Please login before reporting found items")
            setLoading(false)
            return
        }

        try {
            const response = await apiPost("/found-items", formData, token)
            const createdFoundItem = response.data
            const foundItemId = createdFoundItem?._id || createdFoundItem?.id

            setMessage("Found item reported successfully")
            setFormData(emptyForm)

            if (!foundItemId) {
                setMatchesError("Your report was created successfully, but possible lost-item matches could not be loaded right now")
                return
            }

            setMatchesLoading(true)

            try {
                const matchResponse = await getFoundItemMatches(foundItemId, token)
                setMatches(matchResponse.data?.matches || [])
            } catch (matchError) {
                setMatchesError("Your report was created successfully, but possible lost-item matches could not be loaded right now")
            } finally {
                setMatchesLoading(false)
            }
        } catch (submitError) {
            setError(submitError.message || "Failed to report found item")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div id="ReportFound" className="studio-page">
            <div className="studio-shell">
                <aside className="studio-side">
                    <span className="section-kicker">Found item</span>
                    <h2>Give the owner the best possible clue.</h2>
                    <ul>
                        <li>Highlight the exact place and time</li>
                        <li>Call out unique details and conditions</li>
                        <li>Keep the handoff chain clear and safe</li>
                    </ul>
                </aside>

                <div className="studio-card">
                    <div className="card-header-row">
                        <div>
                            <span className="mini-label">Good deed report</span>
                            <h3>Report Found Item</h3>
                        </div>
                        <span className="status-badge found">Ready</span>
                    </div>

                    <form className="studio-form" onSubmit={handleSubmit}>
                        <div className="field-row two-up">
                            <div className="field-group">
                                <label htmlFor="FoundItemName" className="field-label">Item Name</label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className="modern-input" id="FoundItemName" placeholder="Enter item name" required />
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
                                <label htmlFor="FoundColor" className="field-label">Item Color</label>
                                <input type="text" name="color" value={formData.color} onChange={handleChange} className="modern-input" id="FoundColor" placeholder="What is the color of it?" required />
                            </div>
                            <div className="field-group">
                                <label htmlFor="DateFound" className="field-label">Date Found</label>
                                <input type="date" name="dateFound" value={formData.dateFound} onChange={handleChange} id="DateFound" className="modern-input" required />
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Found Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="modern-input" placeholder="Where did you find it?" required />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Detailed Description</label>
                            <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="modern-input" placeholder="Describe in detail - scratches, stickers, or unique features..." required></textarea>
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
                                    <h3>Checking Lost Items</h3>
                                </div>
                            </div>
                            <p className="default-state">Looking for lost items that may match this found item...</p>
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
                            <p className="default-state">These are possible lost-item matches. No potential matches are available right now.</p>
                        </section>
                    ) : null}

                    {!matchesLoading && matches.length > 0 ? (
                        <section className="matches-panel" aria-live="polite">
                            <div className="panel-title-row">
                                <div>
                                    <span className="mini-label">Potential matches</span>
                                    <h3>Potential Matches</h3>
                                </div>
                                <span className="status-badge neutral">{matches.length} possible</span>
                            </div>
                            <p className="matches-intro">These are possible lost-item matches.</p>

                            <div className="matches-list">
                                {matches.map((match) => {
                                    const lostItem = match.lostItem || {}

                                    return (
                                        <article key={lostItem._id || `${lostItem.title}-${match.score}`} className="potential-match-card">
                                            {lostItem.image ? (
                                                <img className="match-found-image" src={lostItem.image} alt={lostItem.title || "Lost item"} />
                                            ) : null}
                                            <div className="match-card-content">
                                                <div className="match-card-heading">
                                                    <div>
                                                        <span className="item-status lost">Lost item</span>
                                                        <h4>{lostItem.title || "Untitled lost item"}</h4>
                                                    </div>
                                                    <div className="match-score" aria-label={`Match score ${match.score}`}>
                                                        <strong>{match.score}</strong>
                                                        <span>{String(match.level || "").replace(/_/g, " ")}</span>
                                                    </div>
                                                </div>
                                                <div className="item-meta match-item-meta">
                                                    <span><strong>Category:</strong> {lostItem.category || "Not provided"}</span>
                                                    <span><strong>Last seen at:</strong> {lostItem.location || "Not provided"}</span>
                                                    <span><strong>Date lost:</strong> {formatDate(lostItem.dateLost)}</span>
                                                    {lostItem.color ? <span><strong>Color:</strong> {lostItem.color}</span> : null}
                                                </div>
                                                {match.reasons?.length > 0 ? (
                                                    <div className="match-reasons">
                                                        <strong>Why it may match</strong>
                                                        <ul>
                                                            {match.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                                                        </ul>
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

export default ReportFound
