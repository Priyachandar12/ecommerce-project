
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

const API = "http://localhost:5000/api";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token.trim()) {
      setError("Please enter the temporary reset code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: token.trim(),
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reset password."
        );
      }

      setMessage(
        data.message || "Password reset successful."
      );

      setToken("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/shopkeeper-login");
      }, 1500);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reset-password-page">
      <form
        className="reset-password-card"
        onSubmit={handleSubmit}
      >
        <h2>Reset Your Password</h2>

        <p>
          Enter the temporary reset code provided by your
          administrator.
        </p>

        <label htmlFor="token">Temporary Reset Code</label>
        <textarea
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your reset code here"
          rows={3}
          autoComplete="off"
          required
        />

        <label htmlFor="newPassword">New Password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label htmlFor="confirmPassword">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error && <p className="reset-error">{error}</p>}
        {message && (
          <p className="reset-success">{message}</p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/shopkeeper-login")}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}
