
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCustomerId,
  getCart,
  saveCart,
} from "./cartUtils";

const SERVER_URL = "http://localhost:5000";

const getImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${SERVER_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

function CartPage() {
  const navigate = useNavigate();
  const customerId = getCustomerId();

  const [cart, setCart] = useState(() => getCart(customerId));

  function updateCart(updatedCart) {
    setCart(updatedCart);
    saveCart(customerId, updatedCart);
  }

  function changeQuantity(productId, amount) {
    const updatedCart = cart
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + amount }
          : item
      )
      .filter((item) => item.quantity > 0);

    updateCart(updatedCart);
  }

  function removeItem(productId) {
    updateCart(
      cart.filter((item) => item.productId !== productId)
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!customerId) {
    return (
      <main style={styles.page}>
        <h1>Your Cart</h1>
        <p>Please log in as a customer to use your personal cart.</p>
        <button onClick={() => navigate("/customer")}>
          Back to Products
        </button>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => navigate("/customer")}>
          ← Continue Shopping
        </button>
        <h1>🛒 Your Cart</h1>
        <p>{cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p>
      </header>

      {cart.length === 0 ? (
        <section style={styles.empty}>
          <h2>Your cart is empty</h2>
          <p>Add some products from your local shops.</p>
          <button
            style={styles.primaryButton}
            onClick={() => navigate("/customer")}
          >
            Explore Products
          </button>
        </section>
      ) : (
        <>
          <section style={styles.items}>
            {cart.map((item) => (
              <article key={item.productId} style={styles.card}>
                {item.image ? (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    style={styles.image}
                  />
                ) : (
                  <div style={styles.noImage}>No Image</div>
                )}

                <div style={styles.details}>
                  <h3>{item.name}</h3>
                  <p style={styles.shop}>{item.shopName}</p>
                  <p style={styles.price}>
                    ₹{item.price.toLocaleString("en-IN")}
                  </p>

                  <div style={styles.controls}>
                    <button
                      onClick={() => changeQuantity(item.productId, -1)}
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </button>

                    <strong>{item.quantity}</strong>

                    <button
                      onClick={() => changeQuantity(item.productId, 1)}
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      +
                    </button>

                    <button
                      style={styles.remove}
                      onClick={() => removeItem(item.productId)}
                    >
                      Remove
                    </button>
                  </div>

                  <p>
                    Subtotal: ₹
                    {(item.price * item.quantity).toLocaleString("en-IN")}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section style={styles.summary}>
            <h2>Order Summary</h2>
            <p>Items: {cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
            <h2>Total: ₹{total.toLocaleString("en-IN")}</h2>
            <button
              style={styles.primaryButton}
              onClick={() =>
                alert("Cart is ready! Checkout feature will be added next.")
              }
            >
              Proceed to Checkout
            </button>
          </section>
        </>
      )}
    </main>
  );
}

const styles = {
  page: {
    maxWidth: "1000px",
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
  items: {
    display: "grid",
    gap: "16px",
  },
  card: {
    display: "flex",
    gap: "18px",
    padding: "16px",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    flexWrap: "wrap",
  },
  image: {
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "8px",
  },
  noImage: {
    width: "150px",
    height: "150px",
    background: "#f2f2f2",
    display: "grid",
    placeItems: "center",
  },
  details: {
    flex: "1",
    minWidth: "200px",
  },
  shop: {
    color: "#666",
  },
  price: {
    color: "#146c43",
    fontWeight: "bold",
    fontSize: "18px",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  remove: {
    color: "#b42318",
  },
  summary: {
    marginTop: "24px",
    padding: "20px",
    background: "#f5f7f5",
    borderRadius: "12px",
  },
  empty: {
    textAlign: "center",
    padding: "40px 16px",
  },
  primaryButton: {
    background: "#146c43",
    color: "white",
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default CartPage;
