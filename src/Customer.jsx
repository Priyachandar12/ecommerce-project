
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";
const SERVER_URL = "http://localhost:5000";

const getImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${SERVER_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

function CustomerPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigate = useNavigate();
  const [locationMessage, setLocationMessage] = useState(
    "Allow location access to find nearby shops."
  );

  async function fetchProducts(searchText = "", coords = location) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (searchText.trim()) {
        params.set("search", searchText.trim());
      }

      if (coords) {
        params.set("lat", String(coords.latitude));
        params.set("lng", String(coords.longitude));
      }

      const response = await fetch(
        `${API}/products?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load products.");
      }

      const items = Array.isArray(data)
        ? data
        : data.products || [];

      setProducts(items);

      if (coords && data.locationProvided === false) {
        setLocationMessage(
          "Location was not received by the server. Please try again."
        );
      }
    } catch (err) {
      console.error("Customer products error:", err);
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts("", null);
  }, []);

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Your browser does not support location services."
      );
      return;
    }

    setLocationLoading(true);
    setLocationMessage("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocation(coords);
        setLocationMessage("Location detected successfully.");

        await fetchProducts(search, coords);
        setLocationLoading(false);
      },
      (err) => {
        console.error("Customer location error:", err);

        const messages = {
          1: "Location permission denied. Please allow location access in your browser.",
          2: "Your location is unavailable. Please try again.",
          3: "Location request timed out. Please try again.",
        };

        setLocationMessage(
          messages[err.code] || "Unable to get your location."
        );
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function handleSearchChange(value) {
    setSearch(value);
    fetchProducts(value, location);
  }

  const sortedProducts = [...products].sort((a, b) => {
    const aDistance = a.distanceKm;
    const bDistance = b.distanceKm;

    if (typeof aDistance === "number" && typeof bDistance === "number") {
      return aDistance - bDistance;
    }

    if (typeof aDistance === "number") return -1;
    if (typeof bDistance === "number") return 1;

    return 0;
  });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Shopify</h1><br/>
        <p style={styles.subtitle}>
          Discover products from your nearby local shops
        </p>

        <button
          type="button"
          style={{
            ...styles.locationButton,
            opacity: locationLoading ? 0.7 : 1,
          }}
          onClick={getCurrentLocation}
          disabled={locationLoading}
        >
          {locationLoading
            ? "Getting Location..."
            : location
            ? "📍 Refresh My Location"
            : "📍 Use My Location"}
        </button>

        <p style={styles.locationMessage}>{locationMessage}</p>
      </header>

      <input
        style={styles.search}
        type="text"
        placeholder="Search products, e.g. rice..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      <div style={styles.sectionHeader}>
        <h2 style={styles.heading}>Explore Products</h2>
        {location && (
          <span style={styles.nearbyLabel}>
            📍 Nearby products first
          </span>
        )}
      </div>

      {loading && <p>Loading products...</p>}

      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && sortedProducts.length === 0 && (
        <p>No products found. Try another search.</p>
      )}

      <div style={styles.grid}>
        {sortedProducts.map((product) => {
          const name = product.name || product.productName || "Product";
          const shopName =
            product.shop?.shopName || product.shopName || "Local Shop";
          const image =
            product.image ||
            product.imageUrl ||
            product.images?.[0];

          const distance = product.distanceKm;
          const hasDistance =
            typeof distance === "number" &&
            Number.isFinite(distance);

          return (
            <article
                key={product._id}
                style={{ ...styles.card, cursor: "pointer" }}
                onClick={() =>
                  navigate(`/product/${product._id}`, {
                    state: {
                      product,
                      customerLocation: location,
                    },
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    navigate(`/product/${product._id}`, {
                      state: {
                        product,
                        customerLocation: location,
                      },
                    });
                  }
                }}
                role="link"
                tabIndex={0}
                aria-label={`View details for ${name}`}
              >
              {image ? (
                <img
                  src={getImageUrl(image)}
                  alt={name}
                  style={styles.image}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div style={styles.imagePlaceholder}>No Image</div>
              )}

              <div style={styles.details}>
                <h3 style={styles.productName}>{name}</h3>

                {product.description && (
                  <p style={styles.description}>
                    {product.description}
                  </p>
                )}

                <p style={styles.shop}>🏪 {shopName}</p>

                {product.shop?.address && (
                  <p style={styles.address}>
                    {product.shop.address}
                  </p>
                )}

                {location && (
                  <p style={styles.distance}>
                    📍{" "}
                    {hasDistance
                      ? distance < 1
                        ? `${Math.round(distance * 1000)} m away`
                        : `${distance.toFixed(2)} km away`
                      : "Distance unavailable"}
                  </p>
                )}

                <p style={styles.price}>
                  ₹{Number(product.price || 0).toLocaleString("en-IN")}
                </p>

                <p
                  style={{
                    ...styles.stock,
                    color:
                      Number(product.stock) > 0 ? "#146c43" : "#c62828",
                  }}
                >
                  {Number(product.stock) > 0
                    ? `In stock: ${product.stock}`
                    : "Out of stock"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    color: "#222",
  },
  header: {
    background: "#146c43",
    color: "white",
    padding: "24px",
    borderRadius: "12px",
    marginBottom: "24px",
  },
  title: {
    margin: "0 0 8px",
  },
  subtitle: {
    margin: "0 0 18px",
  },
  locationButton: {
    padding: "12px 18px",
    background: "white",
    color: "#146c43",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "bold",
  },
  locationMessage: {
    margin: "12px 0 0",
    fontSize: "14px",
  },
  search: {
    width: "100%",
    maxWidth: "500px",
    padding: "14px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    marginBottom: "20px",
    fontSize: "16px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "16px",
  },
  heading: {
    margin: 0,
  },
  nearbyLabel: {
    fontSize: "14px",
    color: "#146c43",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "20px",
  },
  card: {
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    overflow: "hidden",
    background: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  image: {
    width: "100%",
    height: "190px",
    objectFit: "cover",
    display: "block",
  },
  imagePlaceholder: {
    height: "190px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f2f2f2",
    color: "#777",
  },
  details: {
    padding: "16px",
  },
  productName: {
    marginTop: 0,
    marginBottom: "8px",
  },
  description: {
    color: "#555",
    fontSize: "14px",
  },
  shop: {
    color: "#444",
    fontSize: "14px",
    fontWeight: "bold",
  },
  address: {
    color: "#666",
    fontSize: "13px",
  },
  distance: {
    color: "#146c43",
    fontSize: "14px",
    fontWeight: "bold",
  },
  price: {
    fontSize: "21px",
    fontWeight: "bold",
    color: "#146c43",
    marginBottom: "8px",
  },
  stock: {
    fontSize: "13px",
    fontWeight: "bold",
    marginBottom: 0,
  },
  error: {
    color: "red",
  },
};

export default CustomerPage;
