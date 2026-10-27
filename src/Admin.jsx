import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

function AdminDashboard() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("adminToken") || ""
  );

  const [email, setEmail] = useState("admin@localshop.test");
  const [password, setPassword] = useState("");
  const [shops, setShops] = useState([]);
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetCodes, setResetCodes] = useState({});
  const [visibleCodes, setVisibleCodes] = useState({});

  async function login(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      sessionStorage.removeItem("shopkeeperToken");
      sessionStorage.setItem("adminToken", data.token);
      setToken(data.token);
      setPassword("");
      setMessage("Login successful!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    sessionStorage.removeItem("adminToken");
    setToken("");
    setShops([]);
    setPassword("");
    setResetCodes({});
    setVisibleCodes({});
    setMessage("");
  }

  async function fetchShops() {
    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API}/admin/shops?status=${status}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load shops");
      }

      setShops(data.shops || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchShops();
  }, [token, status]);

  async function updateShop(shopId, newStatus) {
    setBusyId(shopId);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/admin/shops/${shopId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Update failed");
      }

      setMessage(data.message || "Shop status updated.");
      await fetchShops();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId("");
    }
  }

  async function generateResetCode(shopId) {
    const confirmed = window.confirm(
      "Generate a password reset code for this shopkeeper? Any existing reset code may become invalid."
    );

    if (!confirmed) return;

    setBusyId(shopId);
    setMessage("");
    setResetCodes((previous) => {
      const next = { ...previous };
      delete next[shopId];
      return next;
    });

    try {
      // This endpoint must be implemented in the backend.
      const response = await fetch(
        `${API}/admin/shops/${shopId}/reset-password-code`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to generate reset code"
        );
      }

      if (!data.resetCode) {
        throw new Error("The server did not return a reset code.");
      }

      setResetCodes((previous) => ({
        ...previous,
        [shopId]: data.resetCode
      }));

      setVisibleCodes((previous) => ({
        ...previous,
        [shopId]: true
      }));

      setMessage(
        "Reset code generated. Share it privately with the verified shopkeeper."
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId("");
    }
  }

  async function copyResetCode(shopId) {
    const code = resetCodes[shopId];
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setMessage("Reset code copied. Share it privately.");
    } catch {
      setMessage("Copy failed. Select and copy the reset code manually.");
    }
  }

  if (!token) {
    return (
      <section className="form-card">
        <h2>Admin Login</h2>
        <p className="subtitle">
          Sign in to manage shop registrations.
        </p>

        <form onSubmit={login}>
          <label htmlFor="adminEmail">Email</label>
          <input
            id="adminEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="adminPassword">Password</label>
          <input
            id="adminPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        {message && <p role="status">{message}</p>}
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-heading">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Review shop registrations and manage shopkeepers.</p>
        </div>

        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>

      <label htmlFor="shopStatus">Filter shops</label>
      <select
        id="shopStatus"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      {message && <p role="status">{message}</p>}

      {loading ? (
        <p>Loading shops...</p>
      ) : shops.length === 0 ? (
        <p>No {status} shops found.</p>
      ) : (
        <div className="shops-grid">
          {shops.map((shop) => (
            <article className="shop-card" key={shop._id}>
              <h3>{shop.shopName}</h3>
              <p><strong>Owner:</strong> {shop.ownerName}</p>
              <p><strong>Phone:</strong> {shop.phone}</p>
              <p><strong>Address:</strong> {shop.address}</p>
              <p><strong>Status:</strong> {shop.status}</p>

              <div className="admin-actions">
                {shop.status !== "approved" && (
                  <button
                    type="button"
                    disabled={busyId === shop._id}
                    onClick={() => updateShop(shop._id, "approved")}
                  >
                    Approve
                  </button>
                )}

                {shop.status !== "rejected" && (
                  <button
                    type="button"
                    className="reject-button"
                    disabled={busyId === shop._id}
                    onClick={() => updateShop(shop._id, "rejected")}
                  >
                    Reject
                  </button>
                )}

                {shop.status === "approved" && (
                  <button
                    type="button"
                    disabled={busyId === shop._id}
                    onClick={() => generateResetCode(shop._id)}
                  >
                    {busyId === shop._id
                      ? "Please wait..."
                      : "Generate Reset Code"}
                  </button>
                )}
              </div>

              {resetCodes[shop._id] && (
                <div className="reset-code-panel">
                  <p>
                    <strong>Temporary reset code</strong>
                  </p>

                  <p>
                    Expires in 15 minutes. Share it privately.
                  </p>

                  <input
                    type={visibleCodes[shop._id] ? "text" : "password"}
                    value={resetCodes[shop._id]}
                    readOnly
                    aria-label={`Reset code for ${shop.shopName}`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCodes((previous) => ({
                        ...previous,
                        [shop._id]: !previous[shop._id]
                      }))
                    }
                  >
                    {visibleCodes[shop._id] ? "Hide Code" : "Show Code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => copyResetCode(shop._id)}
                  >
                    Copy Code
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;