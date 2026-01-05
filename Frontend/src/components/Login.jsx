import { Link } from "react-router-dom"

function Login() {
    return (
        <div id="Login" className="d-flex flex-column w-90 mx-4 mx-md-2 mb-2 px-4 py-2 rounded border border-primary align-items-center justify-content-center">
            <div className="d-flex flex-column w-50 w-lg-100 px-5 py-5 mt-4 rounded align-items-center justify-content-center gap-3 bg-primary-subtle">
                <h2 className="h2 display-6 fw-bold text-center my-1 gap-1">🎓 Join With Honor</h2>
                <form className="login-form d-flex flex-column w-100 gap-3 my-2">
                    <div className="form-grid d-flex flex-column gap-2 py-1 px-2">
                        <label className="form-label">Institution Type</label>
                        <select id="institution-type" className="form-select rounded px-4 py-3 w-100 border border-primary text-primary border-2">
                            <option value="">Choose your institution type</option>
                            <option value="college">🎓 College/University</option>
                            <option value="office">🏢 Corporate Office</option>
                            <option value="school">🏫 School</option>
                        </select>
                    </div>

                    <div id="institution-name-container" className="form-grid d-flex flex-column gap-2 py-1 px-2">
                        <label className="form-label">Institution Name</label>
                        <select id="institution-name" className="form-select rounded px-4 py-3 w-100 border border-primary text-primary border-2">
                            <option value="">Select your institution</option>
                        </select>
                    </div>

                    <div className="form-grid d-flex flex-column gap-2 py-1 px-2">
                        <label className="form-label">Official Email Address</label>
                        <input type="email" id="email" required className="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" placeholder="your.email@institution.edu" />
                        <p className="form-hint">Use your official institutional email for verification</p>
                    </div>

                    <div className="form-grid d-flex flex-column gap-2 py-1 px-2">
                        <label className="form-label">Phone Number</label>
                        <input type="tel" id="phone" required class="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" placeholder="+1 (555) 123-4567" />
                    </div>

                    <button type="submit" class="btn btn-primary btn-lg px-5 py-2 align-self-center mt-4">
                        Join CarryFree Community
                    </button>
                </form>

                <div className="login-footer d-flex text-center gap-2">
                    <p>New to CarryFree? <Link to="/register" className="text-primary text-decoration-underline">Create Account</Link></p>
                </div>
            </div>
        </div>
    )
}

export default Login