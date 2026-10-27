
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import AdminDashboard from "./Admin";
import ShopkeeperDashboard from "./Shopkeeper";
import CustomerPage from "./Customer";
import CartPage from "./CartPage";
import ResetPassword from "./ResetPassword";
import CustomerLogin from "./CustomerLogin";
import ProductDetails from "./ProductDetails";
import "./App.css";

const API_URL = "http://localhost:5000/api/shops";

function HomePage() {
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    address: "",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchShops() {
    setLoading(true);

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Unable to fetch shops");
      }

      setShops(data);
    } catch (error) {
      console.error("Fetch shops error:", error);
      setMessage("Unable to load shops. Check backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchShops();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const cleanShopName = formData.shopName.trim();
    const cleanOwnerName = formData.ownerName.trim();
    const cleanPhone = formData.phone.trim();
    const cleanAddress = formData.address.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanShopName ||
      !cleanOwnerName ||
      !cleanPhone ||
      !cleanAddress ||
      !cleanEmail ||
      !password
    ) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      setMessage("Enter a valid 10-digit phone number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopName: cleanShopName,
          ownerName: cleanOwnerName,
          phone: cleanPhone,
          address: cleanAddress,
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Shop registration failed");
      }

      setMessage(
        "Shop registered successfully! Please wait for admin approval."
      );

      setFormData({
        shopName: "",
        ownerName: "",
        phone: "",
        address: "",
      });

      setEmail("");
      setPassword("");

      await fetchShops();
    } catch (error) {
      console.error("Registration error:", error);
      setMessage(error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="form-card">
        <h2>Register Your Shop</h2>

        <p className="subtitle">
          Join LocalShop to list your products.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="shopName">Shop Name</label>
          <input
            id="shopName"
            name="shopName"
            value={formData.shopName}
            onChange={handleChange}
            placeholder="Enter shop name"
            required
          />

          <label htmlFor="ownerName">Owner Name</label>
          <input
            id="ownerName"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            placeholder="Enter owner name"
            required
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={formData.phone}
            onChange={handleChange}
            placeholder="10-digit phone number"
            required
          />

          <label htmlFor="address">Shop Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter shop address"
            rows={3}
            required
          />

          <label htmlFor="email">Shopkeeper Email ID</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email address"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Create Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button type="submit" disabled={saving}>
            {saving ? "Registering..." : "Register Shop"}
          </button>
        </form>

        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="shops-section">
        <h2>Approved Shops</h2>

        {loading ? (
          <p>Loading shops...</p>
        ) : shops.length === 0 ? (
          <p>No approved shops available yet.</p>
        ) : (
          <div className="shops-grid">
            {shops
              .filter((shop) => shop.status === "approved")
              .map((shop) => (
                <article className="shop-card" key={shop._id}>
                  <h3>{shop.shopName}</h3>
                  <p>
                    <strong>Owner:</strong> {shop.ownerName}
                  </p>
                  <p>
                    <strong>Phone:</strong> {shop.phone}
                  </p>
                  <p>
                    <strong>Address:</strong> {shop.address}
                  </p>
                  <span className="status">{shop.status}</span>
                </article>
              ))}
          </div>
        )}
      </section>
    </>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isCustomerPage =
    location.pathname === "/customer" ||
    location.pathname.startsWith("/product/");

  return (
    <div className="app">
      {!isCustomerPage && (
        <header className="header">
          <div>
            <h1>Shopify</h1><br/>
            <p>Discover and register local shops</p>
          </div>

          <nav className="page-nav">
            <button
              type="button"
              onClick={() => navigate("/")}
            >
              Shop Registration
            </button>

            <button
              type="button"
              onClick={() => navigate("/shopkeeper")}
            >
              Shopkeeper Login
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin")}
            >
              Admin
            </button>

            <button
              type="button"
              onClick={() => navigate("/customer")}
            >
              Customer
            </button>

            <button
              type="button"
              onClick={() => navigate("/customer-login")}
            >
              Customer Login
            </button>
          </nav>
        </header>
      )}
{/* 
      {isCustomerPage && (
        <header className="header customer-header">
          <div>
            <h1>Shopify</h1>
            <p>Discover products from nearby local shops</p>
          </div>
        </header>
      )} */}

      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/shopkeeper"
            element={<ShopkeeperDashboard />}
          />

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/customer-login"
            element={<CustomerLogin />}
          />

          <Route
            path="/customer"
            element={<CustomerPage />}
          />

          <Route
            path="/product/:id"
            element={<ProductDetails />}
          />
          <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

          <Route path="/cart" element={<CartPage />} />

          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
