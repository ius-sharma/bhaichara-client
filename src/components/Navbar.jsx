import { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

const authenticatedNavLinks = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Chat" },
  { to: "/friends", label: "Friends" },
  { to: "/profile", label: "Profile" },
];

const guestNavLinks = [{ to: "/", label: "Home" }];

const Navbar = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("Navbar must be used within an AuthProvider.");
  }

  const { user, logout } = authContext;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAuthenticated = Boolean(user);
  const navLinks = isAuthenticated ? authenticatedNavLinks : guestNavLinks;

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  return (
    <header className="navbar-wrap">
      <nav className="navbar" aria-label="Primary navigation">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          Bhaichara
        </Link>

        <button
          type="button"
          className="navbar-menu-btn"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar-panel ${isMenuOpen ? "is-open" : ""}`}>
          <ul className="navbar-links">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `navbar-link ${isActive ? "is-active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {!isAuthenticated ? (
            <div className="navbar-auth-actions">
              <Link
                className="navbar-auth-btn navbar-login"
                to="/login"
                onClick={closeMenu}
              >
                Login
              </Link>
              <Link
                className="navbar-auth-btn navbar-register"
                to="/register"
                onClick={closeMenu}
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="navbar-auth-actions">
              <button
                type="button"
                className="navbar-auth-btn navbar-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
