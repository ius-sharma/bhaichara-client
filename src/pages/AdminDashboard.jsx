import { useEffect, useState } from "react";
import { apiClient } from "../services/api";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalMessages: 0,
    totalFriends: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await apiClient.get("/admin/analytics");
        const data = response?.data || {};

        setAnalytics({
          totalUsers: data.totalUsers || 0,
          totalMessages: data.totalMessages || 0,
          totalFriends: data.acceptedFriends || 0,
        });
        setError("");
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Unable to fetch analytics right now.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <main className="admin-page">
      <section className="admin-container" aria-label="Admin analytics">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p className="admin-subtitle">Platform analytics overview</p>

        {isLoading ? <p className="admin-info">Loading analytics...</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="admin-stats-grid">
            <article className="admin-stat-card" aria-label="Total users">
              <p className="admin-stat-label">Total Users</p>
              <p className="admin-stat-value">{analytics.totalUsers}</p>
            </article>

            <article className="admin-stat-card" aria-label="Total messages">
              <p className="admin-stat-label">Total Messages</p>
              <p className="admin-stat-value">{analytics.totalMessages}</p>
            </article>

            <article className="admin-stat-card" aria-label="Total friends">
              <p className="admin-stat-label">Total Friends</p>
              <p className="admin-stat-value">{analytics.totalFriends}</p>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default AdminDashboard;
