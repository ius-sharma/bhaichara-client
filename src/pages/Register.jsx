import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Name is required.";
    } else if (formData.name.trim().length < 2) {
      nextErrors.name = "Name must be at least 2 characters.";
    }

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

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Confirm Password is required.";
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
      await api.post("/users/register", formData);

      navigate("/login");
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Register form">
        <p className="login-badge">Bhaichara</p>
        <h1 className="login-title">Create Account</h1>
        <p className="login-subtitle">
          Join the student support platform and get connected.
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className={`login-input ${errors.name ? "login-input-error" : ""}`}
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            autoComplete="name"
          />
          {errors.name ? <p className="login-error">{errors.name}</p> : null}

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
            placeholder="Create a password"
            autoComplete="new-password"
          />
          {errors.password ? (
            <p className="login-error">{errors.password}</p>
          ) : null}

          <label className="login-label" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={`login-input ${errors.confirmPassword ? "login-input-error" : ""}`}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          {errors.confirmPassword ? (
            <p className="login-error">{errors.confirmPassword}</p>
          ) : null}

          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </button>

          {message ? <p className="login-success">{message}</p> : null}
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
