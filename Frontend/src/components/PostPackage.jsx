import { useState } from "react";
import { createPackage } from "../services/carryfreeApi";
import { getValidToken } from "../services/auth";

const initialState = {
  pickupLocation: "",
  dropLocation: "",
  expectedDate: "",
  weight: "",
  receiverName: "",
  receiverPhone: "",
  description: "",
  paymentAmount: "",
};

function PostPackage() {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const token = getValidToken();
    if (!token) {
      setError("Please login to post a package");
      setLoading(false);
      return;
    }

    try {
      await createPackage(
        {
          ...formData,
          weight: Number(formData.weight),
          paymentAmount: Number(formData.paymentAmount || 0),
        },
        token
      );

      setMessage("Package posted successfully");
      setFormData(initialState);
    } catch (submitError) {
      setError(submitError.message || "Failed to post package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="PostPackage" className="studio-page">
      <div className="studio-shell">
        <aside className="studio-side">
          <span className="section-kicker">Package posting</span>
          <h2>Set the route, trust the flow, and move faster.</h2>
          <ul>
            <li>Keep pickup and drop details exact</li>
            <li>Share realistic timing and weight</li>
            <li>Give travelers confidence before booking</li>
          </ul>
        </aside>

        <div className="studio-card">
          <div className="card-header-row">
            <div>
              <span className="mini-label">Delivery request</span>
              <h3>Post Package</h3>
            </div>
            <span className="status-badge found">Ready</span>
          </div>

          <form className="studio-form" onSubmit={handleSubmit}>
            <div className="field-row two-up">
              <div className="field-group">
                <label className="field-label">Pickup Location</label>
                <input type="text" name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} className="modern-input" required />
              </div>
              <div className="field-group">
                <label className="field-label">Drop Location</label>
                <input type="text" name="dropLocation" value={formData.dropLocation} onChange={handleChange} className="modern-input" required />
              </div>
            </div>

            <div className="field-row two-up">
              <div className="field-group">
                <label className="field-label">Expected Delivery Date</label>
                <input type="date" name="expectedDate" value={formData.expectedDate} onChange={handleChange} className="modern-input" required />
              </div>
              <div className="field-group">
                <label className="field-label">Weight (kg)</label>
                <input type="number" min="0.1" step="0.1" name="weight" value={formData.weight} onChange={handleChange} className="modern-input" required />
              </div>
            </div>

            <div className="field-row two-up">
              <div className="field-group">
                <label className="field-label">Receiver Name</label>
                <input type="text" name="receiverName" value={formData.receiverName} onChange={handleChange} className="modern-input" />
              </div>
              <div className="field-group">
                <label className="field-label">Receiver Phone</label>
                <input type="text" name="receiverPhone" value={formData.receiverPhone} onChange={handleChange} className="modern-input" />
              </div>
            </div>

            <div className="field-row two-up">
              <div className="field-group">
                <label className="field-label">Simulated Payment Amount</label>
                <input type="number" min="0" step="1" name="paymentAmount" value={formData.paymentAmount} onChange={handleChange} className="modern-input" placeholder="Optional" />
              </div>
              <div className="field-group">
                <label className="field-label">Description</label>
                <input type="text" name="description" value={formData.description} onChange={handleChange} className="modern-input" placeholder="Package notes" />
              </div>
            </div>

            {message ? <p className="message success">{message}</p> : null}
            {error ? <p className="message error">{error}</p> : null}
            <button type="submit" className="primary-btn auth-submit" disabled={loading}>{loading ? "Submitting..." : "Post Package"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostPackage;
