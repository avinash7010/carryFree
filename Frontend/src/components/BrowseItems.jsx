function BrowseItems() {
    return (
        <div id="ReportLost" className="d-flex flex-column w-90 mx-4 mx-md-2 mb-2 px-4 py-2 rounded border border-primary">
            <div className="d-flex flex-column w-100 px-3 py-2 rounded align-items-center justify-content-center gap-3">
                <h2 className="h2 display-6 fw-bold text-center my-1 gap-1">Browse Lost & Found Items</h2>
                <div className="filter-grid d-flex w-100 px-3 py-3 rounded gap-2 flex-no-wrap border border-2 border-primary bg-primary-subtle">
                    <select className="filter-select form-select form-control px-4 py-2 border border-primary text-primary border-2 w-100">
                        <option value="">All Categories</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="accessories">Accessories</option>
                        <option value="books">Books</option>
                        <option value="keys">Keys</option>
                    </select>
                    <select className="filter-select form-select form-control px-4 py-2 border border-primary text-primary border-2 w-100">
                        <option value="">All Locations</option>
                        <option value="library">Library</option>
                        <option value="cafeteria">Cafeteria</option>
                        <option value="classroom">Classroom</option>
                        <option value="gym">Gym</option>
                    </select>
                    <select className="filter-select form-select form-control px-4 py-2 border border-primary text-primary border-2 w-100">
                        <option value="">Lost & Found</option>
                        <option value="lost">Lost Items</option>
                        <option value="found">Found Items</option>
                    </select>
                    <input type="text" placeholder="Search items..." className="filter-input form-control px-4 py-2 border border-primary text-primary border-2 w-100" />
                </div>


                <div className="items-list d-flex w-100 gap-3 my-2 px-3 py-3 rounded bg-primary-subtle flex-wrap border border-2 border-primary">
                    <div className="item-card-lost item-card bg-white d-flex flex-column gap-2 p-4 border border-2 rounded">
                        <div className="item-header d-flex justify-content-between align-items-center my-2">
                            <span className="item-status bg-danger-subtle text-danger rounded-pill px-3 fw-bold py-1">Lost</span>
                            <span className="item-time">2 days ago</span>
                        </div>
                        <h3 className="item-name h3 fw-bold">iPhone 13 Pro</h3>
                        <p className="item-description">Blue color, cracked screen protector, has a clear case with stickers</p>
                        <div className="item-details d-flex flex-column gap-1 align-items-start">
                            <p><strong>Last seen:</strong> Library 3rd Floor</p>
                            <p><strong>Brand:</strong> Apple</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 mt-2 w-100">
                            I Found This Item
                        </button>
                    </div>
                    <div className="item-card-found item-card bg-white d-flex flex-column gap-2 p-4 border border-2 rounded">
                        <div className="item-header d-flex justify-content-between align-items-center my-2">
                            <span className="item-status bg-success-subtle text-success rounded-pill px-3 fw-bold py-1">Lost</span>
                            <span className="item-time">2 days ago</span>
                        </div>
                        <h3 className="item-name h3 fw-bold">iPhone 13 Pro</h3>
                        <p className="item-description">Blue color, cracked screen protector, has a clear case with stickers</p>
                        <div className="item-details d-flex flex-column gap-1 align-items-start">
                            <p><strong>Last seen:</strong> Library 3rd Floor</p>
                            <p><strong>Brand:</strong> Apple</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 mt-2 w-100">
                            I Found This Item
                        </button>
                    </div>
                    <div className="item-card-lost item-card bg-white d-flex flex-column gap-2 p-4 border border-2 rounded">
                        <div className="item-header d-flex justify-content-between align-items-center my-2">
                            <span className="item-status bg-danger-subtle text-danger rounded-pill px-3 fw-bold py-1">Lost</span>
                            <span className="item-time">2 days ago</span>
                        </div>
                        <h3 className="item-name h3 fw-bold">iPhone 13 Pro</h3>
                        <p className="item-description">Blue color, cracked screen protector, has a clear case with stickers</p>
                        <div className="item-details d-flex flex-column gap-1 align-items-start">
                            <p><strong>Last seen:</strong> Library 3rd Floor</p>
                            <p><strong>Brand:</strong> Apple</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 mt-2 w-100">
                            I Found This Item
                        </button>
                    </div>
                    <div className="item-card-lost item-card bg-white d-flex flex-column gap-2 p-4 border border-2 rounded">
                        <div className="item-header d-flex justify-content-between align-items-center my-2">
                            <span className="item-status bg-danger-subtle text-danger rounded-pill px-3 fw-bold py-1">Lost</span>
                            <span className="item-time">2 days ago</span>
                        </div>
                        <h3 className="item-name h3 fw-bold">iPhone 13 Pro</h3>
                        <p className="item-description">Blue color, cracked screen protector, has a clear case with stickers</p>
                        <div className="item-details d-flex flex-column gap-1 align-items-start">
                            <p><strong>Last seen:</strong> Library 3rd Floor</p>
                            <p><strong>Brand:</strong> Apple</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 mt-2 w-100">
                            I Found This Item
                        </button>
                    </div>
                    <div className="item-card-found item-card bg-white d-flex flex-column gap-2 p-4 border border-2 rounded">
                        <div className="item-header d-flex justify-content-between align-items-center my-2">
                            <span className="item-status bg-success-subtle text-success rounded-pill px-3 fw-bold py-1">Lost</span>
                            <span className="item-time">2 days ago</span>
                        </div>
                        <h3 className="item-name h3 fw-bold">iPhone 13 Pro</h3>
                        <p className="item-description">Blue color, cracked screen protector, has a clear case with stickers</p>
                        <div className="item-details d-flex flex-column gap-1 align-items-start">
                            <p><strong>Last seen:</strong> Library 3rd Floor</p>
                            <p><strong>Brand:</strong> Apple</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 mt-2 w-100">
                            I Found This Item
                        </button>
                    </div>
                    <div className="item-card-lost item-card bg-white d-flex flex-column gap-2 p-4 border border-2 rounded">
                        <div className="item-header d-flex justify-content-between align-items-center my-2">
                            <span className="item-status bg-danger-subtle text-danger rounded-pill px-3 fw-bold py-1">Lost</span>
                            <span className="item-time">2 days ago</span>
                        </div>
                        <h3 className="item-name h3 fw-bold">iPhone 13 Pro</h3>
                        <p className="item-description">Blue color, cracked screen protector, has a clear case with stickers</p>
                        <div className="item-details d-flex flex-column gap-1 align-items-start">
                            <p><strong>Last seen:</strong> Library 3rd Floor</p>
                            <p><strong>Brand:</strong> Apple</p>
                        </div>
                        <button className="btn btn-primary px-4 py-2 mt-2 w-100">
                            I Found This Item
                        </button>
                    </div>                    
                </div>
            </div>
        </div>
    );
}

export default BrowseItems