import { useState } from "react"
import { apiPost } from "../services/api"
import { getValidToken } from "../services/auth"

function ReportLost() {
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        color: "",
        dateLost: "",
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
            setError("Please login before reporting lost items")
            setLoading(false)
            return
        }

        try {
            await apiPost("/lost-items", formData, token)
            setMessage("Lost item reported successfully")
            setFormData({
                title: "",
                category: "",
                color: "",
                dateLost: "",
                location: "",
                description: "",
            })
        } catch (submitError) {
            setError(submitError.message || "Failed to report lost item")
        } finally {
            setLoading(false)
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
                            <label className="field-label">Detailed Description</label>
                            <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="modern-input" placeholder="Any specific identifiers, scratches, stickers, or unique features..." required></textarea>
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

export default ReportLost
