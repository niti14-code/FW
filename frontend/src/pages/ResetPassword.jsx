import React, { useState } from "react";
import "./ResetPassword.css";
import { resetPasswordDirect } from "../services/api";

export default function ResetPassword({ navigate }) {
  const [email] = useState(
  localStorage.getItem("resetEmail") || ""
);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email) {
      return setError("Please enter your registered email");
    }

    if (password.length < 6) {
      return setError(
        "Password must be at least 6 characters long"
      );
    }

    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);

      //const response = await fetch(
       // "http://localhost:5000/api/auth/reset-password-direct",
       /*const response = await fetch(
  `${import.meta.env.VITE_API_URL}/api/auth/reset-password-direct`,
   {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );*/
      await resetPasswordDirect(email, password);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }
      localStorage.removeItem(
      "resetEmail"
      );
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-campus">
              Campus
            </span>
            <span className="brand-ride">
              Ride
            </span>
          </div>

          <h1 className="auth-title">
            Password Updated
          </h1>

          <p className="auth-subtitle">
            Your password has been updated
            successfully.
          </p>

          <button
            className="auth-submit"
            onClick={() => navigate("login")}
          >
            Go To Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">

        <div className="auth-brand">
          <span className="brand-campus">
            Campus
          </span>
          <span className="brand-ride">
            Ride
          </span>
        </div>

        <h1 className="auth-title">
          Reset Password
        </h1>

        <p className="auth-subtitle">
  Create a new password for:
</p>

<div
  style={{
    color: "#f4b02a",
    marginBottom: "20px",
    fontWeight: "600",
    textAlign: "center"
  }}
>
  {email}
</div>

        {error && (
          <div
            style={{
              background: "#2b1010",
              color: "#ff6b6b",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit}>

          <label className="auth-label">
            NEW PASSWORD
          </label>

          <input
            className="auth-input"
            type="password"
            placeholder="Enter New Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <small className="password-hint">
            Password must be at least
            6 characters long
          </small>

          <label className="auth-label">
            CONFIRM PASSWORD
          </label>

          <input
            className="auth-input"
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) =>
              setConfirm(e.target.value)
            }
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Updating..."
              : "Reset Password →"}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-footer">
            Remember your password?

            <button
              type="button"
              className="link-btn"
              onClick={() =>
                navigate("login")
              }
            >
              Sign In →
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}