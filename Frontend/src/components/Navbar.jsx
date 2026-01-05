import { Link, useLocation } from "react-router-dom"

function Navbar() {
  const location = useLocation()

  return (
    <div className="d-flex w-90 navbar mx-4 mx-md-2 my-3 px-4 py-2 rounded border border-primary">
      <Link className="navbar-brand fs-3" to="/">CarryFree</Link>
      <div className="d-lg-flex d-none" role="group" aria-label="Basic radio toggle button group">
        <Link to="/" className={`btn nav-item mx-2 ${location.pathname === "/" ? "btn-primary" : "btn-outline-primary"}`} >
          Home
        </Link>

        <Link to="/report-lost" className={`btn nav-item mx-2 ${location.pathname === "/report-lost" ? "btn-primary" : "btn-outline-primary"}`} >
          Report Lost
        </Link>

        <Link to="/report-found" className={`btn nav-item mx-2 ${location.pathname === "/report-found" ? "btn-primary" : "btn-outline-primary"}`} >
          Report Found
        </Link>
        <Link to="/browse-items" className={`btn nav-item mx-2 ${location.pathname === "/browse-items" ? "btn-primary" : "btn-outline-primary"}`} >
          Browse Items
        </Link>
      </div>

      <Link to="/login" className="btn btn-primary nav-item d-lg-flex d-none">
        Login <i className="bi bi-box-arrow-in-right"></i>
      </Link>

      <div className="dropdown d-lg-none d-flex">
        <button className="dropdown-toggle border border-primary border-2 btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <i className="bi bi-list fs-5"></i>
        </button>
        <div className="dropdown-menu dropdown-menu-end px-2 py-2 mt-2 border border-primary border-2">
          <input type="radio" className="btn-check" name="btnradio" id="home" autoComplete="off" checked={location.pathname === "/"} readOnly />
          <Link to="/" className="dropdown-item nav-item px-3 py-2 mb-2 bg-primary-subtle border border-2 border-primary rounded" htmlFor="home">
            Home
          </Link>

          <input type="radio" className="btn-check" name="btnradio" id="reportLost" autoComplete="off" checked={location.pathname === "/report-lost"} readOnly />
          <Link to="/report-lost" className="nav-item dropdown-item px-3 py-2 mb-2 bg-primary-subtle border border-2 border-primary rounded" htmlFor="reportLost">
            Report Lost
          </Link>

          <input type="radio" className="btn-check" name="btnradio" id="reportFound" autoComplete="off" checked={location.pathname === "/report-found"} readOnly />
          <Link to="/report-found" className="nav-item dropdown-item px-3 py-2 mb-2 bg-primary-subtle border border-2 border-primary rounded" htmlFor="reportFound">
            Report Found
          </Link>

          <input type="radio" className="btn-check" name="btnradio" id="browseItems" autoComplete="off" checked={location.pathname === "/browse-items"} readOnly />
          <Link to="/browse-items" className="nav-item dropdown-item px-3 py-2 mb-2 bg-primary-subtle border border-2 border-primary rounded" htmlFor="browseItems">
            Browse Items
          </Link>

          <Link to="/login" className="bg-primary-subtle nav-item dropdown-item px-3 py-2 border border-2 border-primary rounded">
            Login <i className="bi bi-box-arrow-in-right"></i>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Navbar
