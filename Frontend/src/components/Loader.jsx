function Loader() {
  return (
    <div className="loader-screen" aria-live="polite" aria-label="Loading CarryFree">
      <div className="loader-visual" aria-hidden="true">
        <div className="loader-orbit loader-orbit-one" />
        <div className="loader-orbit loader-orbit-two" />
        <div className="loader-badge">CF</div>
      </div>

      <div className="loader-text">
        <span className="loader-text-main">CarryFree</span>
        <span className="loader-text-sub">Preparing your next ride</span>
      </div>
    </div>
  )
}

export default Loader
