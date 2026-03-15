import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage("");
      return;
    }

    setErrors({});
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/users/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      const token = response?.data?.token;
      const user = response?.data?.user;

      if (!token || !user) {
        setMessage("Login failed. User or token not received.");
        return;
      }

      login(user, token);
      navigate("/chat");
    } catch (error) {
      setMessage(
        error?.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Login form">
        <p className="login-badge">Bhaichara</p>
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">
          Sign in and continue your support journey.
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={`login-input ${errors.email ? "login-input-error" : ""}`}
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email ? <p className="login-error">{errors.email}</p> : null}

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={`login-input ${errors.password ? "login-input-error" : ""}`}
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {errors.password ? (
            <p className="login-error">{errors.password}</p>
          ) : null}

          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          {message ? <p className="login-success">{message}</p> : null}
        </form>

        <p className="login-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
