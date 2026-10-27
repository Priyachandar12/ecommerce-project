
import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";
const SERVER_URL = "http://localhost:5000";

function ProductDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [product, setProduct] = useState(
    location.state?.product || null
  );
  const [loading, setLoading] = useState(!location.state?.product);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product && String(product._id) === id) {
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        if (!response.ok || !Array.isArray(data.products)) {
          throw new Error("Unable to load product details.");
        }

        const found = data.products.find(
          (item) => String(item._id) === id
        );

        if (!found) {
          throw new Error(
            "Product not found. It may have been removed."
          );
        }

        setProduct(found);
      } catch (err) {
        setError(err.message || "Unable to load product.");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  if (loading) return <p>Loading product details...</p>;

  if (error || !product) {
    return (
      <section className="product-details-page">
        <button onClick={() => navigate("/customer")}>
          ← Back to Products
        </button>
        <p role="alert">{error || "Product not found."}</p>
      </section>
    );
  }

  const shop = product.shop;
  const hasCoordinates =
    shop &&
    Number.isFinite(Number(shop.latitude)) &&
    Number.isFinite(Number(shop.longitude)) &&
    shop.latitude !== "" &&
    shop.longitude !== "" &&
    shop.latitude !== null &&
    shop.longitude !== null &&
    Number(shop.latitude) >= -90 &&
    Number(shop.latitude) <= 90 &&
    Number(shop.longitude) >= -180 &&
    Number(shop.longitude) <= 180;

  const latitude = Number(shop?.latitude);
  const longitude = Number(shop?.longitude);

  const imageUrl = product.image
    ? product.image.startsWith("http")
      ? product.image
      : `${SERVER_URL}${
          product.image.startsWith("/") ? "" : "/"
        }${product.image}`
    : "";

  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : "";

  const directionsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : "";

  return (
    <section className="product-details-page">
      <button
        type="button"
        onClick={() => navigate("/customer")}
      >
        ← Back to Products
      </button>

      <h2>Product Details</h2>

      <div className="product-details-card">
        {imageUrl ? (
          <img
            className="product-details-image"
            src={imageUrl}
            alt={product.name}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="product-no-image">No product image</div>
        )}

        <div className="product-details-info">
          <h3>{product.name}</h3>
          <p>{product.description || "No description available."}</p>
          <p className="product-details-price">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </p>
          <p>
            <strong>Availability:</strong>{" "}
            {product.stock > 0
              ? `${product.stock} available`
              : "Out of stock"}
          </p>
        </div>
      </div>

      <h2>Shop Details</h2>

      {shop ? (
        <div className="shop-details-card">
          <h3>{shop.shopName}</h3>
          <p>
            <strong>Owner:</strong> {shop.ownerName || "Not provided"}
          </p>
          <p>
            <strong>Phone:</strong>{" "}
            {shop.phone ? (
              <a href={`tel:${shop.phone}`}>{shop.phone}</a>
            ) : (
              "Not provided"
            )}
          </p>
          <p>
            <strong>Address:</strong> {shop.address || "Not provided"}
          </p>

          {typeof product.distanceKm === "number" && (
            <p>
              <strong>Distance from your location:</strong>{" "}
              {product.distanceKm.toFixed(2)} km
            </p>
          )}
        </div>
      ) : (
        <p>Shop details are unavailable.</p>
      )}

      <h2>Shop Location Map</h2>

      {hasCoordinates ? (
        <div className="shop-map-section">
          <iframe
            title={`Map showing ${shop.shopName}`}
            src={mapUrl}
            className="shop-location-map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <a
            className="map-directions-link"
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Get Directions in Google Maps ↗
          </a>
        </div>
      ) : (
        <p>
          Shop location is not available yet. Ask the shopkeeper
          to save the shop's latitude and longitude.
        </p>
      )}
    </section>
  );
}

export default ProductDetails;
