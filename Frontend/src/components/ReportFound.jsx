import { useState } from "react"
import { apiPost } from "../services/api"
import { getValidToken } from "../services/auth"

function ReportFound() {
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        color: "",
        dateFound: "",
        location: "",
        description: "",
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((previous) => ({ ...previous, [name]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setMessage("")
        setError("")

        const token = getValidToken()
        if (!token) {
            setError("Please login before reporting found items")
            setLoading(false)
            return
        }

        try {
            await apiPost("/found-items", formData, token)
            setMessage("Found item reported successfully")
            setFormData({
                title: "",
                category: "",
                color: "",
                dateFound: "",
                location: "",
                description: "",
            })
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
                </div>
            </div>
        </div>
    )
}

export default ReportFound
