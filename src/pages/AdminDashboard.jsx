import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/api";
import "./AdminDashboard.css";

const WATCHLIST_STORAGE_KEY = "adminWatchlist";
const USER_NOTES_STORAGE_KEY = "adminUserNotes";

const initialAnalytics = {
  totalUsers: 0,
  totalBlacklistedUsers: 0,
  totalMessages: 0,
  totalFriends: 0,
  totalFriendRequests: 0,
  pendingFriendRequests: 0,
  recentUsers: [],
  recentMessages: [],
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getProfileCompletion = (user) => {
  if (!user) {
    return 0;
  }

  let score = 0;

  if (user.name) score += 20;
  if (user.email) score += 20;
  if (user.bio) score += 20;
  if (Array.isArray(user.interests) && user.interests.length > 0) score += 20;
  if (user.avatarUrl) score += 20;

  return score;
};

const getStoredArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getStoredObject = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserError, setSelectedUserError] = useState("");
  const [isSelectedUserLoading, setIsSelectedUserLoading] = useState(false);
  const [watchlist, setWatchlist] = useState(() =>
    getStoredArray(WATCHLIST_STORAGE_KEY),
  );
  const [userNotes, setUserNotes] = useState(() =>
    getStoredObject(USER_NOTES_STORAGE_KEY),
  );
  const [draftNote, setDraftNote] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [moderationAction, setModerationAction] = useState("");

  const fetchAnalytics = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await apiClient.get("/admin/analytics");
      const data = response?.data || {};

      setAnalytics({
        totalUsers: data.totalUsers || 0,
        totalBlacklistedUsers: data.totalBlacklistedUsers || 0,
        totalMessages: data.totalMessages || 0,
        totalFriends: data.acceptedFriends || 0,
        totalFriendRequests: data.totalFriendRequests || 0,
        pendingFriendRequests: data.pendingFriendRequests || 0,
        recentUsers: Array.isArray(data.recentUsers) ? data.recentUsers : [],
        recentMessages: Array.isArray(data.recentMessages)
          ? data.recentMessages
          : [],
      });
      setLastUpdatedAt(new Date().toISOString());
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to fetch analytics right now. Please try again.",
      );
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  const fetchUsers = useCallback(
    async ({ isInitialLoad = false } = {}) => {
      if (isInitialLoad) {
        setIsUsersLoading(true);
      }

      try {
        const response = await apiClient.get("/admin/users", {
          params: {
            query: searchQuery.trim(),
            role: roleFilter === "all" ? "" : roleFilter,
            status: statusFilter === "all" ? "" : statusFilter,
          },
        });

        const list = Array.isArray(response?.data?.users)
          ? response.data.users
          : [];

        setUsers(list);
        setUsersError("");

        if (
          selectedUserId &&
          !list.some((item) => item._id === selectedUserId)
        ) {
          setSelectedUserId("");
          setSelectedUser(null);
          setSelectedUserError("");
        }
      } catch (err) {
        setUsersError(
          err?.response?.data?.message ||
            "Unable to fetch user directory right now.",
        );
      } finally {
        if (isInitialLoad) {
          setIsUsersLoading(false);
        }
      }
    },
    [roleFilter, searchQuery, selectedUserId, statusFilter],
  );

  const fetchUserDetails = useCallback(async (userId) => {
    if (!userId) {
      return;
    }

    setIsSelectedUserLoading(true);
    setSelectedUserError("");

    try {
      const response = await apiClient.get(`/admin/users/${userId}`);
      const detail = response?.data?.user;

      if (!detail) {
        setSelectedUserError("User details not found.");
        setSelectedUser(null);
        return;
      }

      setSelectedUser(detail);
    } catch (err) {
      setSelectedUserError(
        err?.response?.data?.message ||
          "Unable to fetch profile details right now.",
      );
      setSelectedUser(null);
    } finally {
      setIsSelectedUserLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchUsers({ isInitialLoad: true });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(USER_NOTES_STORAGE_KEY, JSON.stringify(userNotes));
  }, [userNotes]);

  useEffect(() => {
    if (!selectedUserId) {
      setDraftNote("");
      return;
    }

    setDraftNote(String(userNotes[selectedUserId] || ""));
  }, [selectedUserId, userNotes]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const acceptanceRate = useMemo(() => {
    if (!analytics.totalFriendRequests) {
      return 0;
    }

    return Math.round(
      (analytics.totalFriends / analytics.totalFriendRequests) * 100,
    );
  }, [analytics.totalFriendRequests, analytics.totalFriends]);

  const messagesPerUser = useMemo(() => {
    if (!analytics.totalUsers) {
      return "0.0";
    }

    return (analytics.totalMessages / analytics.totalUsers).toFixed(1);
  }, [analytics.totalMessages, analytics.totalUsers]);

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      analytics: {
        totalUsers: analytics.totalUsers,
        totalBlacklistedUsers: analytics.totalBlacklistedUsers,
        totalMessages: analytics.totalMessages,
        acceptedFriends: analytics.totalFriends,
        totalFriendRequests: analytics.totalFriendRequests,
        pendingFriendRequests: analytics.pendingFriendRequests,
        acceptanceRate,
        messagesPerUser,
      },
      recentUsers: analytics.recentUsers,
      recentMessages: analytics.recentMessages,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "bhaichara-admin-report.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([fetchAnalytics(false), fetchUsers()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenUser = (userId) => {
    if (!userId) {
      return;
    }

    setSelectedUserId(userId);
    fetchUserDetails(userId);
  };

  const handleCopyEmail = async (email) => {
    if (!email) {
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
      setToastMessage("Email copied to clipboard");
    } catch {
      setToastMessage("Clipboard blocked in this browser");
    }
  };

  const handleToggleWatchlist = (userId) => {
    if (!userId) {
      return;
    }

    setWatchlist((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  };

  const handleSaveNote = () => {
    if (!selectedUserId) {
      return;
    }

    setUserNotes((prev) => ({
      ...prev,
      [selectedUserId]: draftNote.trim(),
    }));
    setToastMessage("Private note saved");
  };

  const handleBlacklistToggle = async (user) => {
    if (!user?._id) {
      return;
    }

    const isBlacklisted = Boolean(user.isBlacklisted);
    let reason = "";

    if (!isBlacklisted) {
      const prompted = window.prompt(
        "Reason for blacklisting this user (optional):",
        user.blacklistReason || "",
      );

      if (prompted === null) {
        return;
      }

      reason = prompted.trim();
    }

    setModerationAction(user._id);

    try {
      if (isBlacklisted) {
        await apiClient.patch(`/admin/users/${user._id}/unblacklist`);
        setToastMessage("User moved to active list");
      } else {
        await apiClient.patch(`/admin/users/${user._id}/blacklist`, { reason });
        setToastMessage("User blacklisted successfully");
      }

      await Promise.all([fetchUsers(), fetchAnalytics(false)]);

      if (selectedUserId === user._id) {
        await fetchUserDetails(user._id);
      }
    } catch (err) {
      setToastMessage(
        err?.response?.data?.message || "Failed to update blacklist status.",
      );
    } finally {
      setModerationAction("");
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?._id) {
      return;
    }

    if (user.role === "admin") {
      setToastMessage("Admin account cannot be deleted");
      return;
    }

    const isConfirmed = window.confirm(
      `Delete ${user.name} permanently from platform? This removes chats and friend data too.`,
    );

    if (!isConfirmed) {
      return;
    }

    setModerationAction(user._id);

    try {
      await apiClient.delete(`/admin/users/${user._id}`);
      setToastMessage("User deleted from platform");

      setWatchlist((prev) => prev.filter((id) => id !== user._id));
      setUserNotes((prev) => {
        const next = { ...prev };
        delete next[user._id];
        return next;
      });

      if (selectedUserId === user._id) {
        setSelectedUserId("");
        setSelectedUser(null);
      }

      await Promise.all([fetchUsers(), fetchAnalytics(false)]);
    } catch (err) {
      setToastMessage(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setModerationAction("");
    }
  };

  const selectedUserCompletion = getProfileCompletion(selectedUser);

  const watchlistUsers = useMemo(
    () => users.filter((item) => watchlist.includes(item._id)),
    [users, watchlist],
  );

  const priorityUsers = useMemo(() => {
    return users
      .map((item) => {
        const completion = getProfileCompletion(item);
        const pendingWeight = Number(item.stats?.pendingConnections || 0) * 9;
        const messageWeight =
          Number(item.stats?.totalMessages || 0) > 0 ? 8 : 0;
        const score =
          Math.max(0, 100 - completion) + pendingWeight + messageWeight;

        return {
          ...item,
          priorityScore: score,
          completion,
        };
      })
      .filter((item) => item.priorityScore >= 35)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 5);
  }, [users]);

  return (
    <main className="admin-page">
      <section className="admin-container" aria-label="Admin analytics">
        <div className="admin-headline-row">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">
              Platform analytics and activity center
            </p>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="admin-action-btn"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              className="admin-action-btn admin-action-btn-secondary"
              onClick={handleExportReport}
            >
              Export Report
            </button>
          </div>
        </div>

        <p className="admin-updated-at">
          Last updated: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : "--"}
        </p>

        {isLoading ? <p className="admin-info">Loading analytics...</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <div className="admin-stats-grid">
              <article className="admin-stat-card" aria-label="Total users">
                <p className="admin-stat-label">Total Users</p>
                <p className="admin-stat-value">{analytics.totalUsers}</p>
              </article>

              <article
                className="admin-stat-card"
                aria-label="Blacklisted users"
              >
                <p className="admin-stat-label">Blacklisted Users</p>
                <p className="admin-stat-value">
                  {analytics.totalBlacklistedUsers}
                </p>
              </article>

              <article className="admin-stat-card" aria-label="Total messages">
                <p className="admin-stat-label">Total Messages</p>
                <p className="admin-stat-value">{analytics.totalMessages}</p>
              </article>

              <article
                className="admin-stat-card"
                aria-label="Accepted friends"
              >
                <p className="admin-stat-label">Accepted Friends</p>
                <p className="admin-stat-value">{analytics.totalFriends}</p>
              </article>

              <article
                className="admin-stat-card"
                aria-label="Total friend requests"
              >
                <p className="admin-stat-label">Friend Requests</p>
                <p className="admin-stat-value">
                  {analytics.totalFriendRequests}
                </p>
              </article>

              <article
                className="admin-stat-card"
                aria-label="Pending friend requests"
              >
                <p className="admin-stat-label">Pending Requests</p>
                <p className="admin-stat-value">
                  {analytics.pendingFriendRequests}
                </p>
              </article>
            </div>

            <div className="admin-insights-grid">
              <article className="admin-insight-card">
                <p className="admin-insight-title">Engagement</p>
                <p className="admin-insight-value">
                  {messagesPerUser} msgs per user
                </p>
                <p className="admin-insight-hint">
                  Average message volume per registered account.
                </p>
              </article>

              <article className="admin-insight-card">
                <p className="admin-insight-title">Friend Acceptance Rate</p>
                <p className="admin-insight-value">{acceptanceRate}%</p>
                <div className="admin-progress-track" aria-hidden="true">
                  <span
                    className="admin-progress-fill"
                    style={{ width: `${acceptanceRate}%` }}
                  />
                </div>
              </article>

              <article className="admin-insight-card">
                <p className="admin-insight-title">Admin Quick Tip</p>
                <p className="admin-insight-hint">
                  High pending requests indicate users may need nudges to accept
                  connections.
                </p>
              </article>

              <article className="admin-insight-card">
                <p className="admin-insight-title">Watchlist</p>
                <p className="admin-insight-value">
                  {watchlistUsers.length} users
                </p>
                <p className="admin-insight-hint">
                  Pin users for quick follow-up and moderation.
                </p>
              </article>
            </div>

            <div className="admin-activity-grid">
              <section className="admin-panel" aria-label="Recent users">
                <h2 className="admin-panel-title">Recent Users</h2>
                {analytics.recentUsers.length === 0 ? (
                  <p className="admin-empty">No recent users found.</p>
                ) : (
                  <ul className="admin-list">
                    {analytics.recentUsers.map((item) => (
                      <li key={item._id} className="admin-list-item">
                        <div>
                          <p className="admin-list-primary">{item.name}</p>
                          <p className="admin-list-secondary">{item.email}</p>
                        </div>
                        <div className="admin-list-meta">
                          <span className="admin-role-pill">{item.role}</span>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="admin-panel" aria-label="Recent messages">
                <h2 className="admin-panel-title">Recent Messages</h2>
                {analytics.recentMessages.length === 0 ? (
                  <p className="admin-empty">No recent messages found.</p>
                ) : (
                  <ul className="admin-list">
                    {analytics.recentMessages.map((item) => (
                      <li key={item._id} className="admin-list-item">
                        <div>
                          <p className="admin-list-primary">
                            {item.sender?.name || "Unknown"} to{" "}
                            {item.receiver?.name || "Unknown"}
                          </p>
                          <p className="admin-list-secondary">{item.message}</p>
                        </div>
                        <div className="admin-list-meta">
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section
              className="admin-panel admin-panel-wide"
              aria-label="User directory"
            >
              <div className="admin-panel-toolbar">
                <h2 className="admin-panel-title">User Directory</h2>

                <div className="admin-panel-controls">
                  <input
                    type="text"
                    className="admin-input"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by name or email"
                  />

                  <select
                    className="admin-select"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="admin">Admins</option>
                  </select>

                  <select
                    className="admin-select"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>

              {isUsersLoading ? (
                <p className="admin-empty">Loading users...</p>
              ) : null}
              {usersError ? <p className="admin-error">{usersError}</p> : null}

              {!isUsersLoading && !usersError && priorityUsers.length > 0 ? (
                <div className="admin-priority-wrap">
                  <p className="admin-priority-title">Priority Queue</p>
                  <div className="admin-priority-list">
                    {priorityUsers.map((item) => (
                      <button
                        type="button"
                        key={item._id}
                        className="admin-priority-chip"
                        onClick={() => handleOpenUser(item._id)}
                      >
                        {item.name} • Score {item.priorityScore}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isUsersLoading && !usersError && watchlistUsers.length > 0 ? (
                <div className="admin-priority-wrap admin-watchlist-wrap">
                  <p className="admin-priority-title">Pinned Watchlist</p>
                  <div className="admin-priority-list">
                    {watchlistUsers.map((item) => (
                      <button
                        type="button"
                        key={item._id}
                        className="admin-priority-chip admin-priority-chip-watch"
                        onClick={() => handleOpenUser(item._id)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isUsersLoading && !usersError ? (
                <>
                  {users.length === 0 ? (
                    <p className="admin-empty">
                      No users matched your filters.
                    </p>
                  ) : (
                    <div className="admin-user-grid">
                      {users.map((item) => (
                        <article
                          key={item._id}
                          className={`admin-user-card ${
                            selectedUserId === item._id ? "is-selected" : ""
                          }`}
                        >
                          <div className="admin-user-head">
                            <div>
                              <p className="admin-list-primary">{item.name}</p>
                              <p className="admin-list-secondary">
                                {item.email}
                              </p>
                            </div>
                            <div className="admin-user-head-actions">
                              <button
                                type="button"
                                className={`admin-star-btn ${
                                  watchlist.includes(item._id)
                                    ? "is-pinned"
                                    : ""
                                }`}
                                onClick={() => handleToggleWatchlist(item._id)}
                                aria-label="Toggle watchlist"
                                title="Toggle watchlist"
                              >
                                ★
                              </button>
                              <span className="admin-role-pill">
                                {item.role}
                              </span>
                            </div>
                          </div>

                          {item.isBlacklisted ? (
                            <p className="admin-flag admin-flag-danger">
                              Blacklisted
                              {item.blacklistReason
                                ? `: ${item.blacklistReason}`
                                : ""}
                            </p>
                          ) : (
                            <p className="admin-flag">Active account</p>
                          )}

                          <div className="admin-user-stats">
                            <span>Msgs: {item.stats?.totalMessages || 0}</span>
                            <span>
                              Friends: {item.stats?.acceptedFriends || 0}
                            </span>
                            <span>
                              Pending: {item.stats?.pendingConnections || 0}
                            </span>
                          </div>

                          <p className="admin-list-secondary">
                            Joined {formatDateTime(item.createdAt)}
                          </p>

                          <div className="admin-user-actions">
                            <button
                              type="button"
                              className="admin-min-btn"
                              onClick={() => handleOpenUser(item._id)}
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              className={`admin-min-btn ${
                                item.isBlacklisted
                                  ? "admin-min-btn-secondary"
                                  : "admin-min-btn-danger"
                              }`}
                              onClick={() => handleBlacklistToggle(item)}
                              disabled={moderationAction === item._id}
                            >
                              {moderationAction === item._id
                                ? "Updating..."
                                : item.isBlacklisted
                                  ? "Unblacklist"
                                  : "Blacklist"}
                            </button>
                            {item.role !== "admin" ? (
                              <button
                                type="button"
                                className="admin-min-btn admin-min-btn-danger-soft"
                                onClick={() => handleDeleteUser(item)}
                                disabled={moderationAction === item._id}
                              >
                                Delete User
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-min-btn admin-min-btn-secondary"
                              onClick={() => handleCopyEmail(item.email)}
                            >
                              Copy Email
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : null}

              {selectedUserId ? (
                <div className="admin-user-detail">
                  <h3 className="admin-panel-title">Selected Profile</h3>

                  {isSelectedUserLoading ? (
                    <p className="admin-empty">Loading profile details...</p>
                  ) : null}
                  {selectedUserError ? (
                    <p className="admin-error">{selectedUserError}</p>
                  ) : null}

                  {!isSelectedUserLoading &&
                  !selectedUserError &&
                  selectedUser ? (
                    <div className="admin-user-detail-grid">
                      <div className="admin-detail-card">
                        <p className="admin-list-primary">
                          {selectedUser.name}
                        </p>
                        <p className="admin-list-secondary">
                          {selectedUser.email}
                        </p>
                        <p className="admin-list-secondary">
                          Profile completion: {selectedUserCompletion}%
                        </p>
                        <div
                          className="admin-progress-track"
                          aria-hidden="true"
                        >
                          <span
                            className="admin-progress-fill"
                            style={{ width: `${selectedUserCompletion}%` }}
                          />
                        </div>
                        <p className="admin-list-secondary">
                          Role: {selectedUser.role} | Joined:{" "}
                          {formatDateTime(selectedUser.createdAt)}
                        </p>
                        <p className="admin-list-secondary">
                          Bio: {selectedUser.bio || "No bio provided"}
                        </p>
                        <p className="admin-list-secondary">
                          Interests:{" "}
                          {selectedUser.interests?.length
                            ? selectedUser.interests.join(", ")
                            : "No interests"}
                        </p>
                        <p className="admin-list-secondary">
                          AI Name: {selectedUser.aiName || "Jarvish"}
                        </p>
                        {selectedUser.isBlacklisted ? (
                          <p className="admin-flag admin-flag-danger">
                            Blacklisted on{" "}
                            {formatDateTime(selectedUser.blacklistedAt)}
                            {selectedUser.blacklistReason
                              ? ` | Reason: ${selectedUser.blacklistReason}`
                              : ""}
                          </p>
                        ) : (
                          <p className="admin-flag">
                            This user is currently active.
                          </p>
                        )}

                        <div className="admin-user-actions">
                          <button
                            type="button"
                            className={`admin-min-btn ${
                              selectedUser.isBlacklisted
                                ? "admin-min-btn-secondary"
                                : "admin-min-btn-danger"
                            }`}
                            onClick={() => handleBlacklistToggle(selectedUser)}
                            disabled={moderationAction === selectedUser._id}
                          >
                            {moderationAction === selectedUser._id
                              ? "Updating..."
                              : selectedUser.isBlacklisted
                                ? "Unblacklist User"
                                : "Blacklist User"}
                          </button>
                          {selectedUser.role !== "admin" ? (
                            <button
                              type="button"
                              className="admin-min-btn admin-min-btn-danger-soft"
                              onClick={() => handleDeleteUser(selectedUser)}
                              disabled={moderationAction === selectedUser._id}
                            >
                              Delete User
                            </button>
                          ) : null}
                        </div>

                        <div className="admin-note-block">
                          <p className="admin-list-primary admin-detail-subtitle">
                            Private Admin Note
                          </p>
                          <textarea
                            className="admin-note-input"
                            value={draftNote}
                            onChange={(event) =>
                              setDraftNote(event.target.value)
                            }
                            placeholder="Add internal note for this user"
                          />
                          <button
                            type="button"
                            className="admin-min-btn"
                            onClick={handleSaveNote}
                          >
                            Save Note
                          </button>
                        </div>
                      </div>

                      <div className="admin-detail-card">
                        <p className="admin-list-primary">User Metrics</p>
                        <div className="admin-user-stats admin-user-stats-strong">
                          <span>
                            Total Messages:{" "}
                            {selectedUser.stats?.totalMessages || 0}
                          </span>
                          <span>
                            Accepted Friends:{" "}
                            {selectedUser.stats?.acceptedFriends || 0}
                          </span>
                          <span>
                            Pending Connections:{" "}
                            {selectedUser.stats?.pendingConnections || 0}
                          </span>
                        </div>

                        <p className="admin-list-primary admin-detail-subtitle">
                          Recent Conversations
                        </p>
                        {selectedUser.recentMessages?.length ? (
                          <ul className="admin-list">
                            {selectedUser.recentMessages.map((item) => (
                              <li key={item._id} className="admin-list-item">
                                <div>
                                  <p className="admin-list-primary">
                                    {item.sender?.name || "Unknown"} to{" "}
                                    {item.receiver?.name || "Unknown"}
                                  </p>
                                  <p className="admin-list-secondary">
                                    {item.message}
                                  </p>
                                </div>
                                <div className="admin-list-meta">
                                  <span>{formatDateTime(item.createdAt)}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="admin-empty">
                            No recent conversations for this user.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </section>

      {toastMessage ? <p className="admin-toast">{toastMessage}</p> : null}
    </main>
  );
};

export default AdminDashboard;
