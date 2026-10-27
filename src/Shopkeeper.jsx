
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Shopkeeper.css";

const API = "http://localhost:5000/api";
const SERVER_URL = "http://localhost:5000";

function getImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  return `${SERVER_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

function ShopkeeperDashboard() {
  const navigate = useNavigate();
  const [token, setToken] = useState(
    () => sessionStorage.getItem("shopkeeperToken") || ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
const [forgotEmail, setForgotEmail] = useState("");
const [forgotMessage, setForgotMessage] = useState("");
const [forgotLoading, setForgotLoading] = useState(false);
  const [shopName, setShopName] = useState("");
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
const [bulkImages, setBulkImages] = useState([]);
const [bulkMessage, setBulkMessage] = useState("");
const [bulkErrors, setBulkErrors] = useState([]);
const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [activePage, setActivePage] = useState("products");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [shopLocation, setShopLocation] = useState({
    latitude: "",
    longitude: "",
  });

  const [locationLoading, setLocationLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    image: "",
    price: "",
    stock: ""
  });

  function clearSelectedImage() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedFile(null);
    setImagePreview("");
  }

  function resetForm() {
    clearSelectedImage();
    setForm({
      name: "",
      description: "",
      image: "",
      price: "",
      stock: ""
    });
    setEditingId("");
  }

  function logout() {
    sessionStorage.removeItem("shopkeeperToken");
    setToken("");
    setProducts([]);
    setShopName("");
    setPassword("");
    setEmail("");
    setMessage("");
    setActivePage("products");
    resetForm();
  }

  async function login(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      const response = await fetch(`${API}/auth/shopkeeper-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      sessionStorage.removeItem("adminToken");
      sessionStorage.setItem("shopkeeperToken", data.token);
      setShopName(data.shop?.shopName || "");
      setPassword("");
      setToken(data.token);
      setMessage("Login successful!");
    } catch (error) {
      setMessage(error.message || "Unable to log in");
    } finally {
      setBusy(false);
    }
  }

  
function handleForgotPassword() {
  setForgotMessage(
    "Email password reset is unavailable. Please contact the administrator to get a temporary reset code."
  );
}


  async function fetchProducts() {


    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(`${API}/products/my-products`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error(data.message || "Please log in again");
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load products");
      }

      setProducts(data.products || []);
    } catch (error) {
      setMessage(error.message || "Unable to load products");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkUpload(event) {
  event.preventDefault();

  if (!bulkFile) {
    setBulkMessage("Please select an Excel or CSV file.");
    return;
  }

  setBulkLoading(true);
  setBulkMessage("");
  setBulkErrors([]);

  try {
    const formData = new FormData();
    formData.append("productsFile", bulkFile);

    bulkImages.forEach((image) => {
      formData.append("images", image);
    });

    const response = await fetch(`${API}/products/bulk-upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Bulk upload failed.");
    }

    setBulkMessage(data.message || "Products uploaded successfully!");
    setBulkErrors(data.errors || []);
    setBulkFile(null);
    setBulkImages([]);

    await fetchProducts();
  } catch (error) {
    setBulkMessage(error.message || "Unable to upload products.");
  } finally {
    setBulkLoading(false);
  }
}

  const fetchShopLocation = async () => {
  try {
    const response = await fetch(
      `${API}/shopkeeper/my-shop/location`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.shop) {
      setShopLocation({
        latitude: data.shop.latitude ?? "",
        longitude: data.shop.longitude ?? "",
      });
    } else {
      setMessage(data.message || "Unable to load shop location");
    }
  } catch (error) {
    setMessage("Unable to connect to server");
  }
};

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    setMessage("GPS location is not supported by this browser");
    return;
  }

  setLocationLoading(true);
  setMessage("");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setShopLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setLocationLoading(false);
      setMessage("GPS location detected. Click Save Location.");
    },
    (error) => {
      setLocationLoading(false);

      if (error.code === 1) {
        setMessage("Please allow location access in your browser");
      } else {
        setMessage("Unable to get GPS location. Please try again.");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
};


const saveShopLocation = async () => {
  const latitude = Number(shopLocation.latitude);
  const longitude = Number(shopLocation.longitude);

  if (
    shopLocation.latitude === "" ||
    shopLocation.longitude === "" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    setMessage("Please enter valid latitude and longitude.");
    return;
  }

  if (latitude < -90 || latitude > 90) {
    setMessage("Latitude must be between -90 and 90.");
    return;
  }

  if (longitude < -180 || longitude > 180) {
    setMessage("Longitude must be between -180 and 180.");
    return;
  }

  setLocationLoading(true);
  setMessage("");

  try {
    const response = await fetch(
      `${API}/shopkeeper/my-shop/location`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to save location");
    }

    setShopLocation({
      latitude: data.shop.latitude,
      longitude: data.shop.longitude,
    });

    setMessage("Shop location saved successfully!");
  } catch (error) {
    setMessage(error.message || "Unable to save location");
  } finally {
    setLocationLoading(false);
  }
};


  useEffect(() => {
    if (token) {
    fetchProducts();
    fetchShopLocation();
  }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please choose a JPG, PNG, WEBP or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  function openAddProduct() {
    resetForm();
    setMessage("");
    setActivePage("add");
  }

  async function uploadImage() {
    if (!selectedFile) return form.image;

    const imageData = new FormData();
    imageData.append("image", selectedFile);

    const response = await fetch(`${API}/products/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: imageData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Image upload failed");
    }

    return data.image;
  }

  async function saveProduct(event) {
    event.preventDefault();
    setMessage("");

    if (!form.name.trim() || form.price === "" || form.stock === "") {
      setMessage("Please fill all required fields.");
      return;
    }

    if (
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0 ||
      !Number.isInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      setMessage("Enter a valid price and stock quantity.");
      return;
    }

    setBusy(true);

    try {
      // Upload the selected local image first.
      const imagePath = await uploadImage();

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image: imagePath || "",
        price: Number(form.price),
        stock: Number(form.stock)
      };

      const response = await fetch(
        editingId
          ? `${API}/products/${editingId}`
          : `${API}/products`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error(data.message || "Please log in again");
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to save product");
      }

      resetForm();
      setActivePage("products");
      setMessage(data.message || "Product saved successfully!");
      await fetchProducts();
    } catch (error) {
      setMessage(error.message || "Unable to save product");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(product) {
    resetForm();

    setEditingId(product._id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      image: product.image || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? "")
    });

    setImagePreview(product.image ? getImageUrl(product.image) : "");
    setMessage("");
    setActivePage("add");
  }

  async function deleteProduct(productId) {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setMessage("");
    setBusy(true);

    try {
      const response = await fetch(`${API}/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error(data.message || "Please log in again");
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete product");
      }

      setMessage(data.message || "Product deleted successfully!");
      await fetchProducts();
    } catch (error) {
      setMessage(error.message || "Unable to delete product");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <section className="sk-login">
        <form className="sk-login-card" onSubmit={login}>
          <h2>Shopkeeper Login</h2>
          <p>Sign in to manage your shop.</p>

          <label htmlFor="shopEmail">Email</label>
          <input
            id="shopEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />

          
          <label htmlFor="shopPassword">Password</label>
          <input
            id="shopPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {/* Add Forgot Password link here */}
          <div style={{ textAlign: "right", margin: "8px 0 16px" }}>
            <button
              type="button"
              className="sk-forgot-link"
              onClick={() => {
                setShowForgotPassword(true);
                setForgotEmail(email);
                setForgotMessage("");
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button className="sk-primary" type="submit" disabled={busy}>
            {busy ? "Logging in..." : "Login"}
          </button>
          
          {showForgotPassword && (
            <div className="sk-forgot-panel">
              <h3>Reset Your Password</h3>
              <p>Enter your registered shopkeeper email address.</p>

              
          <div className="sk-forgot-fields">
            <label htmlFor="forgotEmail">Registered Email</label>
            <input
              id="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              autoComplete="email"
              placeholder="Enter your email"
              required
            />

            <button
              type="button"
              className="sk-primary"
              onClick={handleForgotPassword}
            >
              Get Reset Instructions
            </button>
          </div>


              {forgotMessage && (
                <p role="status" aria-live="polite">
                  {forgotMessage}
                </p>
              )}

              <button
                type="button"
                className="sk-primary"
                onClick={() => navigate("/reset-password")}
              >
                Enter Reset Code
              </button>

              <button
                type="button"
                className="sk-forgot-link"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotMessage("");
                }}
              >
                Back to Login
              </button>
            </div>
          )}

          {message && <p role="status">{message}</p>}
        </form>
      </section>
    );
  }

  return (
    <div className="sk-dashboard ">
      <aside className="sk-sidebar">
        <div className="sk-brand">
          <span className="sk-brand-icon">S</span>
          <span>Shopify</span>
        </div>

        <div className="sk-shop-label">MY SHOP</div>
        <div className="sk-shop-name">{shopName || "My Shop"}</div>

        <button
          type="button"
          className={`sk-nav-button ${activePage === "products" ? "active" : ""}`}
          onClick={() => {
            setActivePage("products");
            setMessage("");
          }}
        >
          <span className="sk-nav-icon">▦</span>
          My Products
          <span className="sk-count">{products.length}</span>
        </button>

        <button
          type="button"
          className={`sk-nav-button sk-add-button ${activePage === "add" && !editingId ? "active" : ""}`}
          onClick={openAddProduct}
        >
          <span className="sk-plus">+</span>
          Add Product
        </button>
        <button
          type="button"
          className={`sk-nav-button ${
            activePage === "bulk" ? "active" : ""
          }`}
          onClick={() => {
            setActivePage("bulk");
            setMessage("");
            setBulkMessage("");
          }}
        >
          <span className="sk-nav-icon">⇧</span>
          Bulk Upload Products
        </button>
        <button
          type="button"
          className={`sk-nav-button ${activePage === "location" ? "active" : ""}`}
          onClick={() => {
            setActivePage("location");
            setMessage("");
          }}
        >
          <span className="sk-nav-icon">⌖</span>
          My Shop Location
        </button>

        <div className="sk-sidebar-bottom">
          <div className="sk-profile">
            <div className="sk-avatar">
              {(shopName || "S").charAt(0).toUpperCase()}
            </div>
            <div className="sk-profile-text">
              <strong>Shopkeeper</strong>
              <span>Store Manager</span>
            </div>
          </div>

          <button className="sk-logout" type="button" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="sk-main">
        <header className="sk-topbar">
          <div>
            <div className="sk-breadcrumb">
              Dashboard / {activePage === "location" ? "My Shop Location" : activePage === "add" ? (editingId ? "Edit Product" : "Add Product") : "Products"}
            </div>
            <h1>
              {activePage === "location"
                ? "My Shop Location"
                : activePage === "add"
                  ? editingId
                    ? "Edit Product"
                    : "Add New Product"
                  : "My Products"}
            </h1>
          </div>

          {activePage === "products" && (
            <button
              className="sk-primary sk-top-add"
              type="button"
              onClick={openAddProduct}
            >
              + Add Product
            </button>
          )}
        </header>

        {message && (
          <div className="sk-message" role="status">
            <span>{message}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {activePage === "bulk" ? (
  <section className="sk-content">
    <div className="sk-section-heading">
      <div>
        <h2>Bulk Product Upload</h2>
        <p>Upload multiple products using Excel or CSV.</p>
      </div>
    </div>

    <form className="sk-product-form" onSubmit={handleBulkUpload}>
      <label htmlFor="bulkFile">Excel or CSV file *</label>
      <input
        id="bulkFile"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(event) =>
          setBulkFile(event.target.files?.[0] || null)
        }
        required
      />

      <label htmlFor="bulkImages">Product images</label>
      <input
        id="bulkImages"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(event) =>
          setBulkImages(Array.from(event.target.files || []))
        }
      />

      <small>
        Excel-ல் imageFile column இருக்க வேண்டும்.
        அந்த column-ல் உள்ள பெயர்களும் image filenames-உம் பொருந்த வேண்டும்.
      </small>

      {bulkMessage && (
        <p role="status">{bulkMessage}</p>
      )}

      {bulkErrors.length > 0 && (
        <ul>
          {bulkErrors.map((error, index) => (
            <li key={index}>
              {typeof error === "string"
                ? error
                : JSON.stringify(error)}
            </li>
          ))}
        </ul>
      )}

      <div className="sk-form-actions">
        <button
          type="button"
          className="sk-secondary"
          onClick={() => {
            setActivePage("products");
            setBulkMessage("");
          }}
          disabled={bulkLoading}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="sk-primary"
          disabled={bulkLoading || !bulkFile}
        >
          {bulkLoading ? "Uploading..." : "Upload Products"}
        </button>
      </div>
    </form>
  </section>
) : activePage === "location" ? (
          <section className="sk-content">
            <div className="sk-section-heading">
              <div>
                <h2>My Shop Location</h2>
                <p>Save your shop's GPS location so nearby customers can find your products.</p>
              </div>
            </div>

            <div className="sk-product-form">
              <p>
                Click the button below while you are at your shop. Allow location access
                in your browser when prompted.
              </p>

              <button
                type="button"
                className="sk-primary"
                onClick={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? "Getting Location..." : "Use Current GPS Location"}
              </button>

              
              <label htmlFor="shopLatitude">Latitude</label>
              <input
                id="shopLatitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={shopLocation.latitude}
                onChange={(event) =>
                  setShopLocation((previous) => ({
                    ...previous,
                    latitude: event.target.value,
                  }))
                }
                placeholder="Enter latitude"
              />

              <label htmlFor="shopLongitude">Longitude</label>
              <input
                id="shopLongitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={shopLocation.longitude}
                onChange={(event) =>
                  setShopLocation((previous) => ({
                    ...previous,
                    longitude: event.target.value,
                  }))
                }
                placeholder="Enter longitude"
              />


              <div className="sk-form-actions">
                <button
                  type="button"
                  className="sk-secondary"
                  onClick={() => {
                    setActivePage("products");
                    setMessage("");
                  }}
                  disabled={locationLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="sk-primary"
                  onClick={saveShopLocation}
                  disabled={locationLoading || shopLocation.latitude === "" || shopLocation.longitude === ""}
                >
                  {locationLoading ? "Saving..." : "Save Location"}
                </button>
              </div>
            </div>
          </section>
        ) : activePage === "products" ? (
          <section className="sk-content">
            <div className="sk-section-heading">
              <div>
                <h2>Product Inventory</h2>
                <p>View and manage all your shop products.</p>
              </div>
              <span className="sk-total">{products.length} products</span>
            </div>

            {loading ? (
              <div className="sk-empty">Loading your products...</div>
            ) : products.length === 0 ? (
              <div className="sk-empty">
                <div className="sk-empty-icon">＋</div>
                <h3>No products yet</h3>
                <p>Click the + Add Product button to add your first product.</p>
                <button type="button" className="sk-primary" onClick={openAddProduct}>
                  + Add Your First Product
                </button>
              </div>
            ) : (
              <div className="sk-table-wrap">
                <table className="sk-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Image</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <div className="sk-product-name">
                            <div className="sk-product-icon">
                              {product.name?.charAt(0).toUpperCase() || "P"}
                            </div>
                            <div>
                              <strong>{product.name}</strong>
                              <span>{product.description || "No description"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name || "Product"}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                              style={{
                                width: "70px",
                                height: "60px",
                                objectFit: "cover",
                                borderRadius: "8px",
                                border: "1px solid #eee"
                              }}
                            />
                          ) : (
                            <span>No image</span>
                          )}
                        </td>
                        <td className="sk-price">
                          ₹{Number(product.price || 0).toFixed(2)}
                        </td>
                        <td>{product.stock}</td>
                        <td>
                          <span className={`sk-stock ${Number(product.stock) > 0 ? "in-stock" : "out-stock"}`}>
                            {Number(product.stock) > 0 ? "In stock" : "Out of stock"}
                          </span>
                        </td>
                        <td>
                          <div className="sk-actions">
                            <button type="button" disabled={busy} onClick={() => startEdit(product)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="sk-delete"
                              disabled={busy}
                              onClick={() => deleteProduct(product._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="sk-content">
            <form className="sk-product-form" onSubmit={saveProduct}>
              <div className="sk-form-heading">
                <h2>{editingId ? "Update product details" : "Product details"}</h2>
                <p>Enter the product information below.</p>
              </div>

              <label htmlFor="productName">Product name *</label>
              <input
                id="productName"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={120}
                placeholder="e.g. Rice Bag"
              />

              <label htmlFor="productDescription">Description</label>
              <textarea
                id="productDescription"
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={1000}
                rows={4}
                placeholder="Enter product details"
              />

              <label htmlFor="productImage">Product Image</label>
              <input
                id="productImage"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                disabled={busy}
              />
              <small>JPG, PNG, WEBP or GIF. Maximum 5 MB.</small>

              {imagePreview && (
                <div style={{ margin: "12px 0 20px" }}>
                  <p>Image Preview</p>
                  <img
                    src={imagePreview.startsWith("blob:") ? imagePreview : getImageUrl(imagePreview)}
                    alt="Product preview"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    style={{
                      width: "180px",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ddd"
                    }}
                  />
                  <div>
                    <button
                      type="button"
                      className="sk-secondary"
                      disabled={busy}
                      onClick={() => {
                        clearSelectedImage();
                        setForm((previous) => ({ ...previous, image: "" }));
                      }}
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              )}

              <div className="sk-form-row">
                <div>
                  <label htmlFor="productPrice">Price (₹) *</label>
                  <input
                    id="productPrice"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="productStock">Stock quantity *</label>
                  <input
                    id="productStock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={handleChange}
                    required
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="sk-form-actions">
                <button
                  type="button"
                  className="sk-secondary"
                  disabled={busy}
                  onClick={() => {
                    resetForm();
                    setActivePage("products");
                    setMessage("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="sk-primary" disabled={busy}>
                  {busy
                    ? selectedFile
                      ? "Uploading image..."
                      : "Saving..."
                    : editingId
                      ? "Update Product"
                      : "Save Product"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default ShopkeeperDashboard;
