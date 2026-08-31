import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const featureCards = [
  {
    icon: "🎯",
    title: "Honor-led reporting",
    description:
      "Let the community report losses and finds with honest details, real context, and fast visibility.",
    tag: "Integrity first",
    tone: "feature-card--iris",
  },
  {
    icon: "🧠",
    title: "Smart matching",
    description:
      "AI-assisted item clustering and proximity signals connect the right people without exposing sensitive data.",
    tag: "Fast & secure",
    tone: "feature-card--blue",
  },
  {
    icon: "🛡️",
    title: "Safe community trust",
    description:
      "Protect users with verified interactions, clear fundamentals, and a trusted in-network contact flow.",
    tag: "Built on trust",
    tone: "feature-card--emerald",
  },
]

const processSteps = [
  { number: "01", label: "Post it" },
  { number: "02", label: "Match it" },
  { number: "03", label: "Recover it" },
]

const trustPills = ["Campus-safe", "Private by design", "Community-first", "Instant updates"]

function Home() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const revealItems = document.querySelectorAll(".reveal")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
          }
        })
      },
      { threshold: 0.2 }
    )

    revealItems.forEach((item) => observer.observe(item))

    const handleScroll = () => {
      const nextProgress = Math.min(window.scrollY / 650, 1)
      setScrollProgress(nextProgress)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const motionLift = scrollProgress * 48

  return (
    <div id="Home" className="home-page-shell">
      <section className="hero-section">
        <div className="hero-copy reveal">
          <span className="eyebrow-chip">
            <span className="pulse-dot" />
            Trusted by modern communities
          </span>
          <h1>Bring lost items back home.</h1>
          <p>
            CarryFree helps students, teams, and campuses recover valuables with quick reporting,
            smarter matching, and a privacy-first trust network built for real life.
          </p>

          <div className="cta-row">
            <Link to="/report-lost" className="primary-btn">
              Report lost item
            </Link>
            <Link to="/report-found" className="secondary-btn">
              Report found item
            </Link>
          </div>

          <div className="trust-row">
            {trustPills.map((pill) => (
              <span key={pill} className="trust-pill">
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-visual reveal" style={{ transform: `translateY(${motionLift}px)` }}>
          <div className="video-screen">
            <div className="screen-topbar">
              <span className="live-pill">Live matching</span>
              <span className="mini-status">3m ago</span>
            </div>

            <div className="screen-panel">
              <div className="scan-orbit" />

              <div className="product-visual-card">
                <div className="window-top">
                  <span className="window-dot blue" />
                  <span className="window-dot yellow" />
                  <span className="window-dot green" />
                </div>

                <div className="product-header-row">
                  <span className="mini-tag">Route match</span>
                  <span className="mini-tag alt">Live</span>
                </div>

                <div className="route-map">
                  <div className="route-line" />
                  <span className="route-pin start">Campus</span>
                  <span className="route-pin end">Airport</span>
                  <div className="package-pill">Black wallet</div>
                </div>

                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Match score</span>
                    <strong>96%</strong>
                  </div>
                  <div className="summary-item">
                    <span>ETA</span>
                    <strong>12 min</strong>
                  </div>
                </div>
              </div>

              <div className="float-card float-card-left">
                <strong>2,430</strong>
                <span>Recovered this month</span>
              </div>

              <div className="float-card float-card-right">
                <span className="dot-green" />
                Match ready
              </div>
            </div>

            <div className="ticker-row">
              <span>Signal Blue</span>
              <span>Porcelain</span>
              <span>Royal Iris</span>
              <span>Emerald Ink</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip reveal">
        <div className="stat-card">
          <strong>92%</strong>
          <span>match success rate</span>
        </div>
        <div className="stat-card">
          <strong>14k+</strong>
          <span>items reported</span>
        </div>
        <div className="stat-card">
          <strong>4.9/5</strong>
          <span>community trust</span>
        </div>
        <div className="stat-card">
          <strong>24/7</strong>
          <span>item visibility</span>
        </div>
      </section>

      <section className="feature-section reveal">
        <div className="section-heading">
          <span className="section-kicker">Why it works</span>
          <h2>Designed for fast recovery and calm confidence.</h2>
        </div>

        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article key={feature.title} className={`feature-card ${feature.tone}`}>
              <div className="feature-icon-wrap">
                <span>{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="feature-tag">{feature.tag}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section reveal">
        <div className="section-heading align-left">
          <span className="section-kicker">Simple flow</span>
          <h2>From report to reunion in three steps.</h2>
        </div>

        <div className="process-grid">
          {processSteps.map((step) => (
            <div key={step.number} className="process-card">
              <span className="step-number">{step.number}</span>
              <h3>{step.label}</h3>
              <p>
                {step.number === "01" && "Add a clear description, image, and last-seen details in seconds."}
                {step.number === "02" && "Our matching logic surfaces the closest credible leads and signals in your network."}
                {step.number === "03" && "Confirm ownership, connect safely, and get your item back to the right place."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="story-band reveal">
        <div className="story-copy">
          <span className="section-kicker">Built around people</span>
          <h2>Fresh design, honest trust, and safer handoff moments.</h2>
          <p>
            We designed CarryFree to feel calm, human, and premium while keeping every step secure,
            respectful, and easy to use from any device.
          </p>
          <div className="story-checklist">
            <span>✔ Verified contact flow</span>
            <span>✔ Privacy-first reporting</span>
            <span>✔ Community-based follow-up</span>
          </div>
        </div>

        <div className="story-visual">
          <div className="mini-panel panel-large">
            <div className="mini-top">
              <span className="mini-bubble" />
              <span className="mini-bubble darker" />
              <span className="mini-bubble" />
            </div>
            <div className="chart-bars">
              <span style={{ height: "42%" }} />
              <span style={{ height: "66%" }} />
              <span style={{ height: "54%" }} />
              <span style={{ height: "82%" }} />
              <span style={{ height: "96%" }} />
            </div>
          </div>
          <div className="mini-panel panel-small">
            <p>Last found item</p>
            <strong>Black wallet</strong>
            <span>Matched 2 mins ago</span>
          </div>
        </div>
      </section>

      <section className="cta-section reveal">
        <div className="cta-card">
          <div>
            <span className="section-kicker">Ready to begin?</span>
            <h2>Keep your valuables close, even when life moves fast.</h2>
          </div>
          <div className="cta-actions">
            <Link to="/report-lost" className="primary-btn">
              Start now
            </Link>
            <Link to="/browse-items" className="secondary-btn">
              Browse items
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">CarryFree</div>
        <div className="footer-links">
          <Link to="/report-lost">Report Lost</Link>
          <Link to="/report-found">Report Found</Link>
          <Link to="/browse-items">Browse</Link>
          <Link to="/login">Login</Link>
        </div>
        <p>© 2026 CarryFree • Built for communities that care.</p>
      </footer>
    </div>
  )
}

export default Home
