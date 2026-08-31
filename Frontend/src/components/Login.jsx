import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { apiPost } from "../services/api"
import { setToken } from "../services/auth"

function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const [formData, setFormData] = useState({
        institutionType: "",
        institutionName: "",
        email: "",
        password: "",
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [authMessage, setAuthMessage] = useState(location.state?.authMessage || "")

    useEffect(() => {
        setAuthMessage(location.state?.authMessage || "")
    }, [location.state])

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((previous) => ({ ...previous, [name]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError("")
        setAuthMessage("")

        try {
            const response = await apiPost("/auth/login", {
                email: formData.email,
                password: formData.password,
            })

            setToken(response.token)
            navigate("/carry-dashboard")
        } catch (submitError) {
            setError(submitError.message || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div id="Login" className="auth-page">
            <div className="auth-shell">
                <div className="auth-visual">
                    <div className="auth-brand-block">
                        <span className="eyebrow-chip">
                            <span className="pulse-dot" />
                            Community trust network
                        </span>
                        <h1>Welcome back to a safer way to reconnect.</h1>
                        <p>
                            Sign in to manage reports, recover items, and stay in sync with matches, bookings,
                            and traveler updates.
                        </p>
                    </div>
                    <div className="insight-stack">
                        <div className="mini-insight">
                            <strong>4.9/5</strong>
                            <span>Trust score</span>
                        </div>
                        <div className="mini-insight alt">
                            <strong>14k+</strong>
                            <span>Cases resolved</span>
                        </div>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-heading">
                        <span className="section-kicker">Access portal</span>
                        <h2>Join With Honor</h2>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="field-group">
                            <label className="field-label">Institution Type</label>
                            <select id="institution-type" name="institutionType" value={formData.institutionType} onChange={handleChange} className="modern-input select-input">
                                <option value="">Choose your institution type</option>
                                <option value="college">🎓 College/University</option>
                                <option value="office">🏢 Corporate Office</option>
                                <option value="school">🏫 School</option>
                            </select>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Institution Name</label>
                            <input id="institution-name" name="institutionName" value={formData.institutionName} onChange={handleChange} className="modern-input" placeholder="Type your institution name" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Official Email Address</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="modern-input" placeholder="your.email@institution.edu" />
                            <p className="field-hint">Use your official institutional email for verification</p>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Password</label>
                            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} className="modern-input" placeholder="Enter password" />
                        </div>

                        {authMessage ? <p className="message warning">{authMessage}</p> : null}
                        {error ? <p className="message error">{error}</p> : null}

                        <button type="submit" className="primary-btn auth-submit" disabled={loading}>
                            {loading ? "Signing In..." : "Join CarryFree Community"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>New to CarryFree? <Link to="/register">Create Account</Link></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login