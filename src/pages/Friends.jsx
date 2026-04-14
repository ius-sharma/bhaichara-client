import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import "./Friends.css";

const decodeUserIdFromToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.id || "";
  } catch {
    return "";
  }
};

const resolveAvatar = (user, index, size) => {
  if (user?.avatarUrl) {
    return user.avatarUrl;
  }

  return `https://i.pravatar.cc/${size}?img=${(index % 60) + 1}`;
};

const Friends = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const currentUserId = useMemo(() => decodeUserIdFromToken(token), [token]);
  const currentUserRole = useMemo(() => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload?.role || "student";
    } catch {
      return "student";
    }
  }, [token]);
  const isAdmin = currentUserRole === "admin";

  const [students, setStudents] = useState([]);
  const [myFriends, setMyFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isIncomingOpen, setIsIncomingOpen] = useState(false);
  const [isSentOpen, setIsSentOpen] = useState(false);
  const [isMyFriendsOpen, setIsMyFriendsOpen] = useState(false);

  const sectionStateStorageKey = useMemo(
    () => `friends:section-state:${currentUserId || "guest"}`,
    [currentUserId],
  );

  const friendIdSet = useMemo(
    () => new Set(myFriends.map((friend) => String(friend._id))),
    [myFriends],
  );

  const pendingRequestIdSet = useMemo(
    () => new Set(sentRequests.map((item) => String(item.user?._id || ""))),
    [sentRequests],
  );

  const fetchRelationshipData = async () => {
    if (!currentUserId) {
      setListLoading(false);
      setMessage("Please login to manage your friends.");
      return;
    }

    try {
      const [friendsResponse, incomingResponse, sentResponse] =
        await Promise.all([
          apiClient.get("/friends/list"),
          apiClient.get("/friends/requests/incoming"),
          apiClient.get("/friends/requests/sent"),
        ]);

      setMyFriends(friendsResponse?.data?.data || []);
      setIncomingRequests(incomingResponse?.data?.data || []);
      setSentRequests(sentResponse?.data?.data || []);
      setMessage("");
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          "Unable to fetch friends data. Please try again.",
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationshipData();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    try {
      const savedState = localStorage.getItem(sectionStateStorageKey);
      if (!savedState) {
        return;
      }

      const parsed = JSON.parse(savedState);
      setIsIncomingOpen(Boolean(parsed?.incoming));
      setIsSentOpen(Boolean(parsed?.sent));
      setIsMyFriendsOpen(Boolean(parsed?.myFriends));
    } catch {
      // Ignore invalid persisted state and keep defaults.
    }
  }, [currentUserId, sectionStateStorageKey]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const nextState = {
      incoming: isIncomingOpen,
      sent: isSentOpen,
      myFriends: isMyFriendsOpen,
    };

    localStorage.setItem(sectionStateStorageKey, JSON.stringify(nextState));
  }, [
    currentUserId,
    sectionStateStorageKey,
    isIncomingOpen,
    isSentOpen,
    isMyFriendsOpen,
  ]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const query = searchTerm.trim();

    // Admin can view users without searching.
    if (isAdmin && query.length === 0) {
      let isActive = true;
      setSearchLoading(true);

      apiClient
        .get("/users")
        .then((response) => {
          if (isActive) {
            setStudents(response?.data?.data || []);
            setMessage("");
          }
        })
        .catch((error) => {
          if (isActive) {
            setStudents([]);
            setMessage(
              error?.response?.data?.message ||
                "Unable to fetch users. Please try again.",
            );
          }
        })
        .finally(() => {
          if (isActive) {
            setSearchLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }

    // Normal users should not see anyone before searching.
    if (!isAdmin && query.length < 2) {
      setStudents([]);
      setSearchLoading(false);
      setMessage("");
      return;
    }

    // Search for both admin and normal users when query has at least 2 chars.
    if (query.length >= 2) {
      let isActive = true;
      const timeoutId = setTimeout(async () => {
        setSearchLoading(true);
        try {
          const response = await apiClient.get(
            `/users/search?q=${encodeURIComponent(query)}`,
          );
          if (isActive) {
            setStudents(response?.data?.data || []);
            setMessage("");
          }
        } catch (error) {
          if (isActive) {
            setStudents([]);
            setMessage(
              error?.response?.data?.message ||
                "Unable to search users. Please try again.",
            );
          }
        } finally {
          if (isActive) {
            setSearchLoading(false);
          }
        }
      }, 250);

      return () => {
        isActive = false;
        clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [currentUserId, isAdmin, searchTerm]);

  const handleSendRequest = async (receiverId) => {
    if (!currentUserId) {
      setActionMessage("Please login to send friend requests.");
      return;
    }

    try {
      const response = await apiClient.post("/friends/add", {
        receiver: receiverId,
      });

      await fetchRelationshipData();
      setActionMessage(response?.data?.message || "Friend request sent.");
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          "Unable to send friend request. Please try again.",
      );
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await apiClient.post("/friends/accept", { requestId });
      await fetchRelationshipData();
      setActionMessage(response?.data?.message || "Friend request accepted.");
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          "Unable to accept request. Please try again.",
      );
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await apiClient.post("/friends/reject", { requestId });
      await fetchRelationshipData();
      setActionMessage(response?.data?.message || "Friend request removed.");
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          "Unable to remove request. Please try again.",
      );
    }
  };

  const handleOpenChat = (friend) => {
    if (!friend?._id) {
      return;
    }

    navigate(`/friends/chat/${friend._id}`, {
      state: { friend },
    });
  };

  const isLoading = listLoading || searchLoading;

  return (
    <main className="friends-page">
      <section
        className="friends-container"
        aria-label="Student connections list"
      >
        <h1 className="friends-title">Find New Friends</h1>
        <p className="friends-subtitle">
          Connect with students who share your interests and build your support
          circle.
        </p>

        {message ? <p className="friends-subtitle">{message}</p> : null}
        {actionMessage ? (
          <p className="friends-subtitle">{actionMessage}</p>
        ) : null}

        <div className="friends-search">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search students..."
            aria-label="Search students"
          />
        </div>

        <div className="friends-grid">
          {isLoading ? (
            <p className="friends-subtitle">Loading users...</p>
          ) : null}

          {!isLoading && !isAdmin && searchTerm.trim().length < 2 ? (
            <article className="friends-empty-card" aria-live="polite">
              <p>Start typing to search students.</p>
            </article>
          ) : null}

          {!isLoading &&
          students.length === 0 &&
          (isAdmin || searchTerm.trim().length >= 2) ? (
            <article className="friends-empty-card" aria-live="polite">
              <p>No students found right now.</p>
              <p>Invite your friends to join Bhaichara.</p>
            </article>
          ) : null}

          {students.map((student, index) => (
            <article key={student._id} className="friend-card">
              <img
                src={`https://i.pravatar.cc/140?img=${(index % 60) + 1}`}
                alt={`${student.name} profile avatar`}
                className="friend-avatar"
              />
              <h2 className="friend-name">{student.name}</h2>
              <p className="friend-bio">{student.bio || "No bio added yet."}</p>
              {(() => {
                const studentId = String(student._id);
                const isAdded = friendIdSet.has(studentId);
                const isPending = pendingRequestIdSet.has(studentId);
                const isSelf = studentId === currentUserId;

                return (
                  <button
                    type="button"
                    className="friend-add-btn"
                    onClick={() => handleSendRequest(student._id)}
                    disabled={isAdded || isPending || isSelf}
                  >
                    {isSelf
                      ? "You"
                      : isAdded
                        ? "Added"
                        : isPending
                          ? "Pending"
                          : "Add Friend"}
                  </button>
                );
              })()}
            </article>
          ))}
        </div>

        <section
          className="friend-requests-section"
          aria-label="Incoming requests"
        >
          <div className="friends-section-header-row">
            <button
              type="button"
              className="friends-section-toggle"
              onClick={() => setIsIncomingOpen((prev) => !prev)}
              aria-expanded={isIncomingOpen}
            >
              <h2 className="my-friends-title">Incoming Requests</h2>
              <span
                className={`friends-section-caret ${
                  isIncomingOpen ? "is-open" : ""
                }`}
                aria-hidden="true"
              >
                ▸
              </span>
            </button>
            <span className="friends-chip-count">
              {incomingRequests.length}
            </span>
          </div>
          <div
            className={`friends-collapsible ${isIncomingOpen ? "is-open" : ""}`}
            aria-hidden={!isIncomingOpen}
          >
            <div className="friends-collapsible-inner">
              <div className="friend-requests-list">
                {!isLoading && incomingRequests.length === 0 ? (
                  <article className="friends-empty-card" aria-live="polite">
                    <p>No incoming requests right now.</p>
                  </article>
                ) : null}

                {incomingRequests.map((item, index) => (
                  <article key={item.requestId} className="request-card">
                    <img
                      src={resolveAvatar(item.user, index, 120)}
                      alt={`${item.user?.name || "Student"} profile avatar`}
                      className="my-friend-avatar"
                    />
                    <div>
                      <p className="my-friend-name">
                        {item.user?.name || "Student"}
                      </p>
                      <p className="friend-bio">
                        {item.user?.bio || "No bio added yet."}
                      </p>
                    </div>
                    <div className="request-actions">
                      <button
                        type="button"
                        className="friend-add-btn"
                        onClick={() => handleAcceptRequest(item.requestId)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="my-friend-message-btn"
                        onClick={() => handleRejectRequest(item.requestId)}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="friend-requests-section" aria-label="Sent requests">
          <div className="friends-section-header-row">
            <button
              type="button"
              className="friends-section-toggle"
              onClick={() => setIsSentOpen((prev) => !prev)}
              aria-expanded={isSentOpen}
            >
              <h2 className="my-friends-title">Sent Requests</h2>
              <span
                className={`friends-section-caret ${isSentOpen ? "is-open" : ""}`}
                aria-hidden="true"
              >
                ▸
              </span>
            </button>
            <span className="friends-chip-count">{sentRequests.length}</span>
          </div>
          <div
            className={`friends-collapsible ${isSentOpen ? "is-open" : ""}`}
            aria-hidden={!isSentOpen}
          >
            <div className="friends-collapsible-inner">
              <div className="friend-requests-list">
                {!isLoading && sentRequests.length === 0 ? (
                  <article className="friends-empty-card" aria-live="polite">
                    <p>No pending sent requests.</p>
                  </article>
                ) : null}

                {sentRequests.map((item, index) => (
                  <article key={item.requestId} className="request-card">
                    <img
                      src={resolveAvatar(item.user, index, 120)}
                      alt={`${item.user?.name || "Student"} profile avatar`}
                      className="my-friend-avatar"
                    />
                    <div>
                      <p className="my-friend-name">
                        {item.user?.name || "Student"}
                      </p>
                      <p className="friend-bio">Request pending approval</p>
                    </div>
                    <div className="request-actions">
                      <button
                        type="button"
                        className="my-friend-message-btn"
                        onClick={() => handleRejectRequest(item.requestId)}
                      >
                        Cancel
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="my-friends-section" aria-label="My friends list">
          <div className="friends-section-header-row">
            <button
              type="button"
              className="friends-section-toggle"
              onClick={() => setIsMyFriendsOpen((prev) => !prev)}
              aria-expanded={isMyFriendsOpen}
            >
              <h2 className="my-friends-title">My Friends</h2>
              <span
                className={`friends-section-caret ${
                  isMyFriendsOpen ? "is-open" : ""
                }`}
                aria-hidden="true"
              >
                ▸
              </span>
            </button>
            <span className="friends-chip-count">{myFriends.length}</span>
          </div>
          <div
            className={`friends-collapsible ${isMyFriendsOpen ? "is-open" : ""}`}
            aria-hidden={!isMyFriendsOpen}
          >
            <div className="friends-collapsible-inner">
              <div className="my-friends-list">
                {!isLoading && myFriends.length === 0 ? (
                  <p className="friends-subtitle">No accepted friends yet.</p>
                ) : null}

                {myFriends.map((friend, index) => (
                  <article key={friend._id} className="my-friend-card">
                    <div className="my-friend-info">
                      <img
                        src={resolveAvatar(friend, index, 120)}
                        alt={`${friend.name} profile avatar`}
                        className="my-friend-avatar"
                      />
                      <p className="my-friend-name">{friend.name}</p>
                    </div>
                    <button
                      type="button"
                      className="my-friend-message-btn"
                      onClick={() => handleOpenChat(friend)}
                    >
                      Message
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
};

export default Friends;
