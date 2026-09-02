import { useState } from "react";
import { createTrip } from "../services/carryfreeApi";
import { getValidToken } from "../services/auth";

const initialState = {
  sourceCity: "",
  sourceLat: "",
  sourceLng: "",
  destCity: "",
  destLat: "",
  destLng: "",
  date: "",
  capacityKg: "",
  notes: "",
};

function PostTrip() {
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
      setError("Please login to post a trip");
      setLoading(false);
      return;
    }

    try {
      await createTrip(
        {
          source: {
            city: formData.sourceCity,
            lat: Number(formData.sourceLat),
            lng: Number(formData.sourceLng),
          },
          destination: {
            city: formData.destCity,
            lat: Number(formData.destLat),
            lng: Number(formData.destLng),
          },
          date: formData.date,
          capacityKg: Number(formData.capacityKg),
          notes: formData.notes,
        },
        token
      );
      setMessage("Trip posted successfully");
      setFormData(initialState);
    } catch (submitError) {
      setError(submitError.message || "Failed to post trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="PostTrip" className="studio-page">
      <div className="studio-shell">
        <aside className="studio-side">
          <span className="section-kicker">Trip posting</span>
          <h2>Open your route and let the right packages meet you.</h2>
          <ul>
            <li>Share route clarity and capacity</li>
            <li>Keep timing and notes realistic</li>
            <li>Match with senders faster and safer</li>
          </ul>
        </aside>

        <div className="studio-card">
          <div className="card-header-row">
            <div>
              <span className="mini-label">Traveler profile</span>
              <h3>Post Trip</h3>
            </div>
            <span className="status-badge found">Open</span>
          </div>

          <form className="studio-form" onSubmit={handleSubmit}>
            <div className="field-row three-up">
              <div className="field-group">
                <label className="field-label">Source City</label>
                <input type="text" name="sourceCity" value={formData.sourceCity} onChange={handleChange} className="modern-input" placeholder="e.g. Mumbai" required />
              </div>
              <div className="field-group">
                <label className="field-label">Source Latitude</label>
                <input type="number" step="any" name="sourceLat" value={formData.sourceLat} onChange={handleChange} className="modern-input" placeholder="e.g. 19.076" required />
              </div>
              <div className="field-group">
                <label className="field-label">Source Longitude</label>
                <input type="number" step="any" name="sourceLng" value={formData.sourceLng} onChange={handleChange} className="modern-input" placeholder="e.g. 72.877" required />
              </div>
            </div>

            <div className="field-row three-up">
              <div className="field-group">
                <label className="field-label">Destination City</label>
                <input type="text" name="destCity" value={formData.destCity} onChange={handleChange} className="modern-input" placeholder="e.g. Delhi" required />
              </div>
              <div className="field-group">
                <label className="field-label">Destination Latitude</label>
                <input type="number" step="any" name="destLat" value={formData.destLat} onChange={handleChange} className="modern-input" placeholder="e.g. 28.613" required />
              </div>
              <div className="field-group">
                <label className="field-label">Destination Longitude</label>
                <input type="number" step="any" name="destLng" value={formData.destLng} onChange={handleChange} className="modern-input" placeholder="e.g. 77.209" required />
              </div>
            </div>

            <div className="field-row two-up">
              <div className="field-group">
                <label className="field-label">Travel Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className="modern-input" required />
              </div>
              <div className="field-group">
                <label className="field-label">Capacity (kg)</label>
                <input type="number" min="0.1" step="0.1" name="capacityKg" value={formData.capacityKg} onChange={handleChange} className="modern-input" required />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Notes</label>
              <input type="text" name="notes" value={formData.notes} onChange={handleChange} className="modern-input" placeholder="Optional travel notes" />
            </div>

            {message ? <p className="message success">{message}</p> : null}
            {error ? <p className="message error">{error}</p> : null}

            <button type="submit" className="primary-btn auth-submit" disabled={loading}>{loading ? "Submitting..." : "Post Trip"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostTrip;
