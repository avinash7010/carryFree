import Robo from '../assets/robo.png';
import { Link } from "react-router-dom"

function Home() {
    return (
        <div id="Home" className="d-flex flex-column w-90 mx-4 mx-md-2 mb-2 px-4 py-2 rounded border border-primary">
            <div className="home d-none d-lg-flex">
                <div className="mx-4 text-center home-in">
                    <h1 className="h1 display-3 fw-bold">Never Lose Track Again</h1>
                    <p className="fw-medium text-center">CarryFree connects you with your lost items across colleges, offices, and schools. Built on trust, powered by community honor. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic, delectus. Velit eos accusamus, autem optio nihil recusandae doloremque consequuntur consequatur animi eaque nobis id similique?</p>
                    <div className="py-4 px-5 dw">
                        <span className="spinner-grow spinner-grow-sm mt-1 me-2 bg-warning" aria-hidden="true"></span>
                        <span className="me-3">Trusted Community</span>
                        <span className="spinner-grow spinner-grow-sm mt-1 me-2 bg-danger" aria-hidden="true"></span>
                        <span className="me-3">Honor-Based System</span>
                        <span className="spinner-grow spinner-grow-sm mt-1 me-2 bg-primary" aria-hidden="true"></span>
                        <span>Secure Connections</span>
                    </div>
                    <div className="d-flex gap-3 my-4">
                        <Link to="/report-lost" className="btn btn-primary btn-lg px-4 py-3">
                            🔍 Report Lost Item
                        </Link>
                        <Link to="report-found" className="btn btn-outline-primary btn-lg px-4 py-3">
                            ✨ Report Found Item
                        </Link>
                    </div>
                </div>
                <div className="robo-wrapper">
                    <img src={Robo} alt="robo" className="robo-img" />
                </div>
            </div>

            <div className="home d-flex d-lg-none flex-column position-relative">
                <h1 className="h1 display-4 display-md-1 fw-bold text-center mt-3 text-primary">Never Lose Track Again</h1>
                <div className="robo-wrapper">
                    <img src={Robo} alt="robo" className="robo-img ms-5" />
                </div>
                <div className="text-center home-in">
                    <p className="fw-medium text-center">CarryFree connects you with your lost items across colleges, offices, and schools. Built on trust, powered by community honor. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic, delectus. Velit eos accusamus, autem optio nihil recusandae doloremque consequuntur consequatur animi eaque nobis id similique?</p>
                    <div className="w-100 dw d-flex flex-column gap-3 align-items-center">
                        <span className="px-3 py-2 border border-primary border-2 w-100 bg-primary-subtle">
                            <span className="spinner-grow spinner-grow-sm me-2 bg-warning" aria-hidden="true"></span>
                            <span>Trusted Community</span>
                        </span>
                        <span className="px-3 py-2 border border-primary border-2 w-100 bg-primary-subtle">
                            <span className="spinner-grow spinner-grow-sm me-2 bg-danger" aria-hidden="true"></span>
                            <span>Honor-Based System</span>
                        </span>
                        <span className="px-3 py-2 border border-primary border-2 w-100 bg-primary-subtle">
                            <span className="spinner-grow spinner-grow-sm me-2 bg-primary" aria-hidden="true"></span>
                            <span>Secure Connections</span>
                        </span>
                    </div>
                    <div className="d-flex gap-3 my-4">
                        <Link to="/report-lost" className="btn btn-primary btn-lg px-4 py-3">
                            🔍 Report Lost Item
                        </Link>
                        <Link to="report-found" className="btn btn-outline-primary btn-lg px-4 py-3">
                            ✨ Report Found Item
                        </Link>
                    </div>
                </div>
            </div>

            <div className="features-section">
                <div className="container">
                    <h3 className="section-title">How CarryFree Works</h3>
                    <p className="section-description">A community built on trust, integrity, and mutual respect</p>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon-wrapper purple-to-blue">
                                <span className="feature-icon">🎯</span>
                            </div>
                            <h4 className="feature-card-title">Honor-Based Reporting</h4>
                            <p className="feature-card-description">Report lost or found items with complete honesty. Our
                                community thrives on truthful, detailed descriptions and genuine intentions.</p>
                            <div className="feature-tag-wrapper">
                                <span className="feature-tag purple-tag">Integrity First</span>
                            </div>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-wrapper blue-to-green">
                                <span className="feature-icon">🤖</span>
                            </div>
                            <h4 className="feature-card-title">Intelligent Matching</h4>
                            <p className="feature-card-description">Advanced algorithms match lost and found items while
                                maintaining privacy. Only verified community members can access contact information.</p>
                            <div className="feature-tag-wrapper">
                                <span className="feature-tag blue-tag">Smart & Secure</span>
                            </div>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-wrapper green-to-purple">
                                <span className="feature-icon">🛡️</span>
                            </div>
                            <h4 className="feature-card-title">Trusted Connections</h4>
                            <p className="feature-card-description">Connect with fellow community members through our secure
                                system. Every interaction is logged and protected by our honor code commitment.</p>
                            <div className="feature-tag-wrapper">
                                <span className="feature-tag green-tag">Community Trust</span>
                            </div>
                        </div>
                    </div>

                    <div className="honor-code-section border border-primary border-3 bg-primary-subtle">
                        <div className="honor-code-content">
                            <div className="honor-code-icon-wrapper d-flex align-items-center justify-content-center bg-primary">
                                <span className="honor-code-icon">⚖️</span>
                            </div>
                            <h4 className="honor-code-title">Our Community Honor Code</h4>
                            <p className="honor-code-description">
                                Every CarryFree member pledges to act with honesty, respect, and integrity. We believe that
                                lost items should be returned to their rightful owners, and found items should be reported
                                promptly. Together, we build a community where trust prevails.
                            </p>
                            <div className="honor-code-tags d-flex justify-content-center flex-wrap">
                                <span className="honor-tag bg-white border border-primary border-1">🤝 Honest Reporting</span>
                                <span className="honor-tag bg-white border border-primary border-1">🔒 Privacy Respect</span>
                                <span className="honor-tag bg-white border border-primary border-1">⚡ Prompt Action</span>
                                <span className="honor-tag bg-white border border-primary border-1">💝 Community Care</span>
                            </div>
                        </div>
                    </div>

                    <footer className="bg-primary-subtle border-top border-primary mt-5 pt-5 px-5">
                        <div className="container">

                            <div className="row text-start mb-4">
                                <div className="col-12">
                                    <h5 className="fw-bold text-primary">CarryFree</h5>
                                    <p className="text-secondary">
                                        A community-driven platform to report and find lost items inside institutions.
                                        Connect, report, and reunite with your belongings easily.
                                    </p>
                                </div>
                            </div>

                            <div className="row text-start">
                                <div className="col-md-3 mb-4">
                                    <h6 className="fw-bold text-primary">Quick Links</h6>
                                    <ul className="list-unstyled">
                                        <li><Link to="/" className="text-decoration-none text-secondary ql">Home</Link></li>
                                        <li><Link to="/report-lost" className="text-decoration-none text-secondary ql">Report Lost</Link></li>
                                        <li><Link to="/report-found" className="text-decoration-none text-secondary ql">Report Found</Link></li>
                                        <li><Link to="/browse-items" className="text-decoration-none text-secondary ql">Browse Items</Link></li>
                                        <li><Link to="/login" className="text-decoration-none text-secondary ql">Login</Link></li>
                                    </ul>
                                </div>

                                <div className="col-md-3 mb-4">
                                    <h6 className="fw-bold text-primary">Resources</h6>
                                    <ul className="list-unstyled">
                                        <li><a href="#" className="text-decoration-none text-secondary ql">FAQs</a></li>
                                        <li><a href="#" className="text-decoration-none text-secondary ql">Community Guidelines</a></li>
                                        <li><a href="#" className="text-decoration-none text-secondary ql">Help Center</a></li>
                                        <li><a href="#" className="text-decoration-none text-secondary ql">Support</a></li>
                                    </ul>
                                </div>

                                <div className="col-md-3 mb-4">
                                    <h6 className="fw-bold text-primary">Contact Us</h6>
                                    <p className="text-secondary mb-1"><i className="bi bi-geo-alt-fill text-primary"></i> Chennai, Tamil Nadu, India</p>
                                    <p className="text-secondary mb-1"><i className="bi bi-envelope-fill text-primary"></i> support@carryfree.com</p>
                                    <p className="text-secondary mb-1"><i className="bi bi-telephone-fill text-primary"></i> +91 98765 43210</p>
                                </div>

                                <div className="col-md-3 mb-4">
                                    <h6 className="fw-bold text-primary">Follow Us</h6>
                                    <div className="d-flex gap-3">
                                        <a href="#" className="text-primary fs-4"><i className="bi bi-facebook"></i></a>
                                        <a href="#" className="text-primary fs-4"><i className="bi bi-twitter"></i></a>
                                        <a href="#" className="text-primary fs-4"><i className="bi bi-instagram"></i></a>
                                        <a href="#" className="text-primary fs-4"><i className="bi bi-linkedin"></i></a>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center border-top border-primary pt-3 pb-2 mt-3">
                                <p className="mb-0 text-secondary">
                                    © 2025 CarryFree. All Rights Reserved. | Made with ❤️ by Artist
                                </p>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default Home