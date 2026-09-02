import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReviewForm from "./ReviewForm";
import {
  addTrackingUpdate,
  createBooking,
  generateOtp,
  getMyClaims,
  getMyNotifications,
  getMyBookings,
  getMyPackages,
  getPackageMatches,
  getReceivedClaims,
  getTrackingHistory,
  getTravelerReviews,
  markAllNotificationsRead,
  markNotificationRead,
  respondToBooking,
  startTransit,
  updateClaimStatus,
  verifyDelivery,
} from "../services/carryfreeApi";
import { getCurrentUser, getValidToken } from "../services/auth";
import { apiGet } from "../services/api";

function CarryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = getValidToken();
  const currentUser = useMemo(() => getCurrentUser(), []);

  const preselectedTripId = searchParams.get("tripId") || "";
  const [preselectedTrip, setPreselectedTrip] = useState(null);

  const preselectedPackageId = searchParams.get("packageId") || "";
  const [preselectedPackage, setPreselectedPackage] = useState(null);

  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [matchResults, setMatchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [otpInputs, setOtpInputs] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [trackingHistory, setTrackingHistory] = useState({});
  const [claims, setClaims] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [reviewedBookings, setReviewedBookings] = useState(new Set());
  const [activeReviewBookingId, setActiveReviewBookingId] = useState(null);

  const loadDashboard = async (showSpinner = true) => {
    if (!token) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    if (showSpinner) {
      setLoading(true);
    }
    setError("");

    try {
      const [packageResponse, bookingResponse, notificationResponse] = await Promise.all([
        getMyPackages(token),
        getMyBookings(token),
        getMyNotifications(token, 1, 10),
      ]);

      const packageList = packageResponse.data || [];
      setPackages(packageList);
      setBookings(bookingResponse.data || []);
      setNotifications(notificationResponse.data?.notifications || []);
      setUnreadCount(notificationResponse.data?.unreadCount || 0);

      if (preselectedPackageId) {
        const matchingPkg = packageList.find((p) => p._id === preselectedPackageId);
        if (matchingPkg) {
          setSelectedPackageId(matchingPkg._id);
        }
      } else if (!selectedPackageId && packageList.length > 0) {
        setSelectedPackageId(packageList[0]._id);
      }

      // Claims are loaded separately so a failure here never blocks the rest of the dashboard
      try {
        const claimsResponse = await getReceivedClaims(token);
        setClaims(claimsResponse.data || []);
      } catch {
        // silently ignore — claims section will show empty state
      }

      try {
        const myClaimsResponse = await getMyClaims(token);
        setMyClaims(myClaimsResponse.data || []);
      } catch {
        // silently ignore — my claims section will show empty state
      }

      // Detect already-reviewed delivered sender bookings
      const deliveredSenderBookings = (bookingResponse.data || []).filter(
        (b) =>
          b.status === "delivered" &&
          String(b.senderId?._id || b.senderId) === String(currentUser?.id)
      );
      const uniqueTravelerIds = [
        ...new Set(
          deliveredSenderBookings
            .map((b) => b.tripId?.travelerId?._id || b.tripId?.travelerId)
            .filter(Boolean)
            .map(String)
        ),
      ];
      const reviewed = new Set();
      await Promise.all(
        uniqueTravelerIds.map(async (travelerId) => {
          try {
            const revRes = await getTravelerReviews(travelerId);
            const reviews = revRes.data?.reviews || [];
            for (const rev of reviews) {
              if (
                String(rev.reviewer?._id || rev.reviewer) ===
                String(currentUser?.id)
              ) {
                const bookingRef = rev.bookingId?._id || rev.bookingId;
                if (bookingRef) reviewed.add(String(bookingRef));
              }
            }
          } catch {
            // silently ignore — review check is best-effort
          }
        })
      );
      setReviewedBookings(reviewed);
    } catch (loadError) {
      setError(loadError.message || "Failed to load dashboard");
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!preselectedTripId || !token) {
      return;
    }

    const fetchTrip = async () => {
      try {
        const response = await apiGet(`/trips/${preselectedTripId}`, token);
        setPreselectedTrip(response.data || null);
      } catch {
        setPreselectedTrip(null);
      }
    };

    fetchTrip();
  }, [preselectedTripId, token]);

  useEffect(() => {
    if (!preselectedPackageId || !token) {
      return;
    }

    const fetchPackage = async () => {
      try {
        const response = await apiGet(`/packages/${preselectedPackageId}`, token);
        setPreselectedPackage(response.data || null);
      } catch {
        setPreselectedPackage(null);
      }
    };

    fetchPackage();
  }, [preselectedPackageId, token]);

  const handleFindMatches = async () => {
    if (!selectedPackageId || !token) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await getPackageMatches(selectedPackageId, token);
      setMatchResults(response.data?.matches || []);
      setMessage(`Found ${response.data?.matchCount || 0} match(es).`);
    } catch (matchError) {
      setError(matchError.message || "Failed to fetch matches");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBook = async (tripId) => {
    if (!selectedPackageId || !token) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await createBooking({ packageId: selectedPackageId, tripId }, token);
      setMessage("Booking requested successfully and payment locked.");
      setPreselectedTrip(null);
      searchParams.delete("tripId");
      setSearchParams(searchParams, { replace: true });
      await loadDashboard();
    } catch (bookingError) {
      setError(bookingError.message || "Failed to create booking");
    } finally {
      setActionLoading(false);
    }
  };

  const runBookingAction = async (fn, bookingId, successText, otpValue) => {
    if (!token) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fn(bookingId, otpValue, token);
      const demoOtp = response?.data?.demoOtp;

      if (demoOtp) {
        setMessage(`${successText} Demo OTP: ${demoOtp}`);
      } else {
        setMessage(successText);
      }

      await loadDashboard();
    } catch (actionError) {
      setError(actionError.message || "Booking action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotificationRead = async (notificationId) => {
    if (!token) {
      return;
    }

    try {
      await markNotificationRead(notificationId, token);
      await loadDashboard(false);
    } catch (notificationError) {
      setError(notificationError.message || "Failed to mark notification");
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) {
      return;
    }

    try {
      await markAllNotificationsRead(token);
      await loadDashboard(false);
    } catch (notificationError) {
      setError(notificationError.message || "Failed to mark all notifications");
    }
  };

  const loadBookingTracking = async (bookingId) => {
    if (!token) {
      return;
    }

    try {
      const response = await getTrackingHistory(bookingId, token);
      setTrackingHistory((prev) => ({ ...prev, [bookingId]: response.data || [] }));
    } catch (trackingError) {
      setError(trackingError.message || "Failed to load tracking history");
    }
  };

  const handleClaimAction = async (claimId, status) => {
    if (!token) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await updateClaimStatus(claimId, status, token);
      setMessage(`Claim ${status} successfully.`);
      await loadDashboard(false);
    } catch (claimError) {
      setError(claimError.message || `Failed to ${status} claim`);
    } finally {
      setActionLoading(false);
    }
  };

  const submitTracking = async (bookingId) => {
    if (!token) {
      return;
    }

    const payload = trackingInputs[bookingId] || {};

    try {
      await addTrackingUpdate(
        bookingId,
        {
          statusText: payload.statusText || "Location update",
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
        token
      );
      await loadBookingTracking(bookingId);
      setMessage("Tracking update sent.");
    } catch (trackingError) {
      setError(trackingError.message || "Failed to send tracking update");
    }
  };

  const myTravelerBookings = bookings.filter(
    (booking) => String(booking.travelerId) === String(currentUser?.id)
  );

  const mySenderBookings = bookings.filter(
    (booking) => String(booking.senderId) === String(currentUser?.id)
  );

  return (
    <div id="CarryDashboard" className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <span className="section-kicker">Operations desk</span>
            <h2>Carry Dashboard</h2>
          </div>
          <div className="dashboard-badges">
            <span className="dashboard-pill">Unread: {unreadCount}</span>
            <span className="dashboard-pill alt">{packages.length} packages</span>
          </div>
        </header>

        {message ? <p className="message success">{message}</p> : null}
        {error ? <p className="message error">{error}</p> : null}

        {preselectedTrip ? (
          <section className="dashboard-panel">
            <div className="panel-title-row">
              <h3>Selected Trip</h3>
              <button type="button" className="secondary-btn small-btn" onClick={() => { setPreselectedTrip(null); searchParams.delete("tripId"); setSearchParams(searchParams, { replace: true }); }}>
                Clear
              </button>
            </div>
            <div className="match-card">
              <div>
                <p className="match-route">{preselectedTrip.source?.city} → {preselectedTrip.destination?.city}</p>
                <p className="match-meta">
                  Date: {new Date(preselectedTrip.date).toLocaleDateString()} | Capacity: {preselectedTrip.availableCapacityKg}kg
                </p>
                {preselectedTrip.travelerId ? (
                  <p className="match-meta subtle">
                    Traveler: {preselectedTrip.travelerId.name || "Unknown"} ({preselectedTrip.travelerId.email || ""})
                  </p>
                ) : null}
              </div>
            </div>
            <p className="default-state" style={{ marginTop: "0.5rem" }}>
              Select your package below, then fetch matches to see if this trip is available.
            </p>
          </section>
        ) : null}

        {preselectedPackage ? (
          <section className="dashboard-panel">
            <div className="panel-title-row">
              <h3>Selected Package</h3>
              <button type="button" className="secondary-btn small-btn" onClick={() => { setPreselectedPackage(null); searchParams.delete("packageId"); setSearchParams(searchParams, { replace: true }); }}>
                Clear
              </button>
            </div>
            <div className="match-card">
              <div>
                <p className="match-route">{preselectedPackage.pickupLocation?.city} → {preselectedPackage.dropLocation?.city}</p>
                <p className="match-meta">
                  Weight: {preselectedPackage.weight}kg | Expected: {new Date(preselectedPackage.expectedDate).toLocaleDateString()} | Status: {preselectedPackage.status}
                </p>
                {preselectedPackage.senderId ? (
                  <p className="match-meta subtle">
                    Sender: {preselectedPackage.senderId.name || "Unknown"} ({preselectedPackage.senderId.email || ""})
                  </p>
                ) : null}
              </div>
            </div>
            {preselectedPackage.status === "pending" ? (
              <p className="default-state" style={{ marginTop: "0.5rem" }}>
                This package is available. Select it below to find matching trips.
              </p>
            ) : preselectedPackage.status === "matched" ? (
              <p className="default-state" style={{ marginTop: "0.5rem" }}>
                This package is already matched to a trip.
              </p>
            ) : null}
          </section>
        ) : null}

        {loading ? <p className="default-state">Loading dashboard...</p> : null}

        {!loading ? (
          <>
            <section className="dashboard-panel wide">
              <div className="panel-title-row">
                <h3>Notifications</h3>
                <button type="button" className="secondary-btn small-btn" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? <p className="default-state">No notifications yet.</p> : null}
                {notifications.map((notification) => (
                  <div key={notification._id} className="notification-item">
                    <div>
                      <p className="notif-title">{notification.title}</p>
                      <p className="notif-copy">{notification.message}</p>
                      <p className="notif-time">{new Date(notification.createdAt).toLocaleString()}</p>
                    </div>
                    {!notification.isRead ? (
                      <button type="button" className="secondary-btn small-btn" onClick={() => handleNotificationRead(notification._id)}>
                        Mark read
                      </button>
                    ) : (
                      <span className="status-badge neutral">Read</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard-panel">
              <h3>Find Matches</h3>
              <div className="action-row">
                <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)} className="modern-input select-input">
                  <option value="">Select package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.pickupLocation?.city} to {pkg.dropLocation?.city} ({pkg.status})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={handleFindMatches} disabled={!selectedPackageId || actionLoading} className="primary-btn small-btn">
                  {actionLoading ? "Working..." : "Fetch Matches"}
                </button>
              </div>

              <div className="match-list">
                {matchResults.map((match) => {
                  const isPreselected = preselectedTripId && match.trip._id === preselectedTripId;
                  return (
                    <div key={match.trip._id} className={`match-card${isPreselected ? " highlighted" : ""}`}>
                      <div>
                        <p className="match-route">
                          {match.trip.source?.city} to {match.trip.destination?.city}
                          {isPreselected ? " (selected)" : ""}
                        </p>
                        <p className="match-meta">
                          Score: {match.score} | Date: {new Date(match.trip.date).toLocaleDateString()} | Capacity: {match.trip.availableCapacityKg}kg
                        </p>
                      </div>
                      <button type="button" className="secondary-btn small-btn" onClick={() => handleBook(match.trip._id)} disabled={actionLoading}>
                        {isPreselected ? "Book this trip" : "Book traveler"}
                      </button>
                    </div>
                  );
                })}

                {matchResults.length === 0 ? <p className="default-state">No matches fetched yet.</p> : null}
              </div>
            </section>

            <section className="dashboard-panel">
              <h3>My Sender Bookings</h3>
              <div className="booking-list">
                {mySenderBookings.map((booking) => {
                  const isDelivered = booking.status === "delivered";
                  const bookingId = String(booking._id);
                  const isReviewed = reviewedBookings.has(bookingId);
                  const isReviewing = activeReviewBookingId === bookingId;
                  const traveler =
                    booking.tripId?.travelerId || {};

                  return (
                    <div key={booking._id} className="booking-card">
                      <p className="booking-route">
                        {booking.packageId?.pickupLocation?.city} to{" "}
                        {booking.packageId?.dropLocation?.city}
                      </p>
                      <p className="booking-meta">
                        Status: {booking.status} | Payment:{" "}
                        {booking.paymentStatus}
                      </p>

                      {isDelivered && !isReviewed && !isReviewing && (
                        <button
                          type="button"
                          className="secondary-btn small-btn"
                          onClick={() => setActiveReviewBookingId(bookingId)}
                          disabled={actionLoading}
                        >
                          Leave Review
                        </button>
                      )}

                      {isDelivered && isReviewed && (
                        <span className="status-badge found">Reviewed ✓</span>
                      )}

                      {isReviewing && (
                        <ReviewForm
                          bookingId={bookingId}
                          travelerName={traveler.name || "Traveler"}
                          onSubmitted={() => {
                            setReviewedBookings((prev) =>
                              new Set(prev).add(bookingId)
                            );
                            setActiveReviewBookingId(null);
                            setMessage("Review submitted successfully.");
                          }}
                        />
                      )}

                      {booking.status === "in-transit" ? (
                        <button
                          type="button"
                          className="secondary-btn small-btn"
                          onClick={() =>
                            runBookingAction(
                              (id, _otp, authToken) =>
                                generateOtp(id, authToken),
                              booking._id,
                              "OTP generated."
                            )
                          }
                          disabled={actionLoading}
                        >
                          Generate OTP
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {mySenderBookings.length === 0 ? (
                  <p className="default-state">No sender bookings yet.</p>
                ) : null}
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="panel-title-row">
                <h3>My Lost & Found Claims</h3>
                <span className="dashboard-pill alt">{myClaims.length} total</span>
              </div>
              <div className="booking-list">
                {myClaims.length === 0 ? <p className="default-state">You haven't submitted any lost & found claim requests yet.</p> : null}
                {myClaims.map((claim) => {
                  const lostItem = claim.lostItem || {};
                  const foundItem = claim.foundItem || {};
                  const finder = claim.finder || {};

                  return (
                    <div key={claim._id} className="booking-card claim-card">
                      <div className="claim-card-header">
                        <div>
                          <p className="booking-route">{lostItem.title || "Lost item"} ↔ {foundItem.title || "Found item"}</p>
                          <p className="booking-meta">
                            Finder: {finder.name || "Unknown"} ({finder.email || "No email provided"})
                          </p>
                          <p className="booking-meta">My Message: {claim.message}</p>
                          <p className="booking-meta">
                            <span className={`status-badge ${claim.status === "pending" ? "neutral" : claim.status === "approved" ? "found" : "lost"}`}>
                              {claim.status}
                            </span>
                            {' '}{new Date(claim.createdAt).toLocaleString()}
                          </p>
                          {claim.status === "approved" ? (
                            <p className="booking-meta success-text">
                              <strong>Approved:</strong> The finder confirmed this is a match! Please contact the finder at {finder.email || "their email"} to arrange item return/pickup.
                            </p>
                          ) : null}
                          {claim.status === "rejected" ? (
                            <p className="booking-meta error-text">
                              <strong>Rejected:</strong> The finder determined this item does not match their found item.
                            </p>
                          ) : null}
                          {claim.status === "pending" ? (
                            <p className="booking-meta subtle">
                              <strong>Pending:</strong> Awaiting review by the finder.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>


            <section className="dashboard-panel">
              <div className="panel-title-row">
                <h3>Lost & Found Claims</h3>
                <span className="dashboard-pill alt">{claims.length} total</span>
              </div>
              <div className="booking-list">
                {claims.length === 0 ? <p className="default-state">No claims received yet. When someone claims an item you found, it will appear here.</p> : null}
                {claims.map((claim) => {
                  const lostItem = claim.lostItem || {};
                  const foundItem = claim.foundItem || {};
                  const claimant = claim.claimant || {};

                  return (
                    <div key={claim._id} className="booking-card claim-card">
                      <div className="claim-card-header">
                        <div>
                          <p className="booking-route">{lostItem.title || "Lost item"} ↔ {foundItem.title || "Found item"}</p>
                          <p className="booking-meta">
                            Claimant: {claimant.name || "Unknown"} ({claimant.email || ""})
                          </p>
                          <p className="booking-meta">Message: {claim.message}</p>
                          <p className="booking-meta">
                            <span className={`status-badge ${claim.status === "pending" ? "neutral" : claim.status === "approved" ? "found" : "lost"}`}>
                              {claim.status}
                            </span>
                            {' '}{new Date(claim.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {claim.status === "pending" ? (
                        <div className="action-row compact">
                          <button type="button" className="secondary-btn small-btn success" onClick={() => handleClaimAction(claim._id, "approved")} disabled={actionLoading}>
                            Approve
                          </button>
                          <button type="button" className="secondary-btn small-btn danger" onClick={() => handleClaimAction(claim._id, "rejected")} disabled={actionLoading}>
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="dashboard-panel">
              <h3>My Traveler Bookings</h3>
              <div className="booking-list">
                {myTravelerBookings.map((booking) => (
                  <div key={booking._id} className="booking-card">
                    <p className="booking-route">{booking.tripId?.source?.city} to {booking.tripId?.destination?.city}</p>
                    <p className="booking-meta">Status: {booking.status} | Payment: {booking.paymentStatus}</p>

                    <div className="action-row compact">
                      {booking.status === "requested" ? (
                        <>
                          <button type="button" className="secondary-btn small-btn success" onClick={() => runBookingAction((id, _otp, authToken) => respondToBooking(id, "accept", authToken), booking._id, "Booking accepted")} disabled={actionLoading}>
                            Accept
                          </button>
                          <button type="button" className="secondary-btn small-btn danger" onClick={() => runBookingAction((id, _otp, authToken) => respondToBooking(id, "reject", authToken), booking._id, "Booking rejected")} disabled={actionLoading}>
                            Reject
                          </button>
                        </>
                      ) : null}

                      {booking.status === "accepted" ? (
                        <button type="button" className="secondary-btn small-btn" onClick={() => runBookingAction((id, _otp, authToken) => startTransit(id, authToken), booking._id, "Marked in-transit")} disabled={actionLoading}>
                          Start Transit
                        </button>
                      ) : null}

                      {booking.status === "in-transit" ? (
                        <>
                          <input type="text" placeholder="Status note" value={trackingInputs[booking._id]?.statusText || ""} onChange={(event) => setTrackingInputs((prev) => ({ ...prev, [booking._id]: { ...(prev[booking._id] || {}), statusText: event.target.value } }))} className="modern-input compact-input" />
                          <input type="number" placeholder="Lat" value={trackingInputs[booking._id]?.latitude || ""} onChange={(event) => setTrackingInputs((prev) => ({ ...prev, [booking._id]: { ...(prev[booking._id] || {}), latitude: event.target.value } }))} className="modern-input compact-input" />
                          <input type="number" placeholder="Lng" value={trackingInputs[booking._id]?.longitude || ""} onChange={(event) => setTrackingInputs((prev) => ({ ...prev, [booking._id]: { ...(prev[booking._id] || {}), longitude: event.target.value } }))} className="modern-input compact-input" />
                          <button type="button" className="secondary-btn small-btn" onClick={() => submitTracking(booking._id)} disabled={actionLoading}>
                            Update Tracking
                          </button>
                          <input type="text" placeholder="Enter OTP" value={otpInputs[booking._id] || ""} onChange={(event) => setOtpInputs((prev) => ({ ...prev, [booking._id]: event.target.value }))} className="modern-input compact-input" />
                          <button type="button" className="secondary-btn small-btn" onClick={() => runBookingAction(verifyDelivery, booking._id, "Delivery verified", otpInputs[booking._id])} disabled={actionLoading}>
                            Verify Delivery
                          </button>
                          <button type="button" className="secondary-btn small-btn" onClick={() => loadBookingTracking(booking._id)}>
                            View Tracking
                          </button>
                        </>
                      ) : null}
                    </div>

                    {(trackingHistory[booking._id] || []).length > 0 ? (
                      <div className="tracking-box">
                        <p className="tracking-title">Recent Tracking Updates</p>
                        {(trackingHistory[booking._id] || []).slice(0, 3).map((entry) => (
                          <p key={entry._id} className="tracking-item">
                            {entry.statusText || "Update"}
                            {entry.latitude != null && entry.longitude != null ? ` (${entry.latitude}, ${entry.longitude})` : ""}
                            {` at ${new Date(entry.createdAt).toLocaleString()}`}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {myTravelerBookings.length === 0 ? <p className="default-state">No traveler bookings yet.</p> : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default CarryDashboard;
