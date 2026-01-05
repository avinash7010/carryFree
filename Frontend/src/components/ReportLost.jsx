function ReportLost() {
    return (
        <div id="ReportLost" className="d-flex flex-column w-90 mx-4 mx-md-2 mb-2 px-4 py-2 rounded border border-primary">
            <div className="d-flex flex-column w-100 px-3 py-2 rounded align-items-center justify-content-center gap-3">
                <h2 className="h2 display-6 fw-bold text-center my-1 gap-1">Report Lost Item</h2>
                <form className="d-flex flex-column w-75 w-lg-100 gap-3 my-2">
                    <div className="d-flex w-100 gap-4">
                        <div className="form-group d-flex flex-column gap-1 align-items-start w-50">
                            <label htmlFor="LostItemName" className="form-label fw-semibold">Item Name</label>
                            <input type="text" className="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" id="LostItemName" placeholder="Enter item name" required />
                        </div>
                        <div className="form-group d-flex flex-column gap-1 align-items-start w-50">
                            <label className="form-label fw-semibold">Category</label>
                            <select className="form-select rounded px-4 py-3 w-100 border border-primary text-primary border-2">
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
                    <div className="d-flex w-100 gap-4">
                        <div className="form-group d-flex flex-column gap-1 align-items-start w-50">
                            <label htmlFor="LostColor" className="form-label fw-semibold">Color</label>
                            <input type="text" className="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" id="LostColor" placeholder="e.g., Black, Blue, Red" required />
                        </div>
                        <div className="form-group d-flex flex-column gap-1 align-items-start w-50">
                            <label htmlFor="DateLost" className="form-label fw-semibold">Date Lost</label>
                            <input type="date" id="DateLost" required className="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" />
                        </div>
                    </div>
                    <div className="d-flex w-100 gap-4">
                        <div className="form-group d-flex flex-column gap-1 align-items-start w-100">
                            <label className="form-label fw-semibold">Last Seen Location</label>
                            <input type="text" className="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" placeholder="e.g., Library 2nd Floor, Cafeteria, Room 205" required />
                        </div>
                    </div>
                    <div className="d-flex w-100 gap-4">
                        <div className="form-group d-flex flex-column gap-1 align-items-start w-100">
                            <label className="form-label fw-semibold">Detailed Description</label>
                            <textarea rows="4" className="form-control rounded px-4 py-3 w-100 border border-primary text-primary border-2" placeholder="Any specific identifiers, scratches, stickers, or unique features..."></textarea>
                        </div>
                    </div>
                    <div className="d-flex flex-column w-100 gap-2">
                        <label for="LostImg" className="form-label fw-semibold">Lost thing reference image</label>
                        <input class="form-control form-control-lg px-4 py-3 w-100 border border-primary text-primary border-2" id="LostImg" type="file" accept="image/*" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg px-5 py-2 align-self-center mt-4">Submit Report</button>
                </form>
            </div>
        </div>
    )
}

export default ReportLost
