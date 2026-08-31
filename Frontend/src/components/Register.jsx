import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { apiPost } from "../services/api"
import { setToken } from "../services/auth"

function Register() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        institutionType: "",
        institutionName: "",
        name: "",
        email: "",
        phone: "",
        role: "sender",
        password: "",
        confirmPassword: "",
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((previous) => ({ ...previous, [name]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError("")

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            await apiPost("/auth/register", {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            })

            const loginResponse = await apiPost("/auth/login", {
                email: formData.email,
                password: formData.password,
            })

            setToken(loginResponse.token)
            navigate("/carry-dashboard")
        } catch (submitError) {
            setError(submitError.message || "Registration failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div id="Register" className="auth-page">
            <div className="auth-shell">
                <div className="auth-visual">
                    <div className="auth-brand-block">
                        <span className="eyebrow-chip">
                            <span className="pulse-dot" />
                            Start with trust
                        </span>
                        <h1>Build a safer network around every handoff.</h1>
                        <p>
                            Create your account to report, track, and coordinate recovery across your campus or community.
                        </p>
                    </div>
                    <div className="insight-stack">
                        <div className="mini-insight">
                            <strong>24/7</strong>
                            <span>visibility</span>
                        </div>
                        <div className="mini-insight alt">
                            <strong>1 min</strong>
                            <span>setup flow</span>
                        </div>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-heading">
                        <span className="section-kicker">Create account</span>
                        <h2>Register On CarryFree</h2>
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
                            <label className="field-label">Full Name</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="modern-input" placeholder="Your full name" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Official Email Address</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="modern-input" placeholder="your.email@institution.edu" />
                            <p className="field-hint">Use your official institutional email for verification</p>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Phone Number</label>
                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="modern-input" placeholder="+1 (555) 123-4567" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Role</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="modern-input select-input" required>
                                <option value="sender">Sender</option>
                                <option value="traveler">Traveler</option>
                                <option value="receiver">Receiver</option>
                            </select>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Password</label>
                            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} className="modern-input" placeholder="Create password" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={6} className="modern-input" placeholder="Re-enter password" />
                        </div>

                        {error ? <p className="message error">{error}</p> : null}

                        <button type="submit" className="primary-btn auth-submit" disabled={loading}>
                            {loading ? "Creating Account..." : "Create CarryFree Community"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Already have an account? <Link to="/login">Login</Link></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
