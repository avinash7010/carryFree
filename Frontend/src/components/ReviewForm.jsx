import { useState } from "react";
import { submitReview } from "../services/carryfreeApi";
import { getValidToken } from "../services/auth";

function ReviewForm({ bookingId, travelerName, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const displayRating = hoverRating || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5.");
      return;
    }

    const token = getValidToken();
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await submitReview({ bookingId, rating, comment: comment.trim() }, token);
      setSuccess(true);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="review-card">
        <p className="review-success">
          Review submitted for {travelerName}. Thank you!
        </p>
      </div>
    );
  }

  return (
    <div className="review-card">
      <p className="review-prompt">
        Review {travelerName} for this delivery
      </p>

      <form onSubmit={handleSubmit} className="review-form">
        <div className="star-row">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= displayRating ? "filled" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
          {displayRating > 0 && (
            <span className="rating-label">{displayRating}/5</span>
          )}
        </div>

        <textarea
          className="review-textarea"
          placeholder="Write a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={500}
        />

        {error && <p className="review-error">{error}</p>}

        <button
          type="submit"
          className="primary-btn small-btn"
          disabled={loading || rating < 1}
        >
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}

export default ReviewForm;
