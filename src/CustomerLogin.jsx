
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api/auth";

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (isRegister && !name.trim()) {
      setMessage("Please enter your name.");
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

    setLoading(true);

    try {
      const endpoint = isRegister
        ? "customer-register"
        : "customer-login";

      const response = await fetch(`${API}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong.");
      }

      if (isRegister) {
        setMessage("Registration successful! Please log in.");
        setIsRegister(false);
        setPassword("");
        return;
      }

      if (!data.customer?.id || !data.token) {
        throw new Error("Login response is missing customer details.");
      }

      localStorage.setItem("customer", JSON.stringify(data.customer));
      localStorage.setItem("customerToken", data.token);

      setMessage("Login successful!");
      navigate("/customer");
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-card">
      <h2>{isRegister ? "Create Customer Account" : "Customer Login"}</h2>

      <p className="subtitle">
        {isRegister
          ? "Register to shop from your local stores."
          : "Log in to view products and manage your cart."}
      </p>

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <>
            <label htmlFor="customerName">Full Name</label>
            <input
              id="customerName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              required
            />
          </>
        )}

        <label htmlFor="customerEmail">Email</label>
        <input
          id="customerEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
          required
        />

        <label htmlFor="customerPassword">Password</label>
        <input
          id="customerPassword"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : isRegister
              ? "Create Account"
              : "Login"}
        </button>
      </form>

      {message && <p className="message" role="status">{message}</p>}

      <p style={{ marginTop: "16px" }}>
        {isRegister
          ? "Already have an account?"
          : "New customer?"}{" "}
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setMessage("");
          }}
        >
          {isRegister ? "Login" : "Register"}
        </button>
      </p>
    </section>
  );
}
