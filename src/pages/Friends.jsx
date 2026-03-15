import { useEffect, useMemo, useState } from "react";
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

const Friends = () => {
  const token = localStorage.getItem("token") || "";
  const currentUserId = useMemo(() => decodeUserIdFromToken(token), [token]);

  const [students, setStudents] = useState([]);
  const [myFriends, setMyFriends] = useState([]);
  const [pendingRequestIds, setPendingRequestIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) =>
      String(student?.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [students, searchTerm]);

  const friendIdSet = useMemo(
    () => new Set(myFriends.map((friend) => String(friend._id))),
    [myFriends],
  );

  const pendingRequestIdSet = useMemo(
    () => new Set(pendingRequestIds.map((id) => String(id))),
    [pendingRequestIds],
  );

  const fetchFriendsData = async () => {
    if (!currentUserId) {
      setLoading(false);
      setMessage("Please login to manage your friends.");
      return;
    }

    try {
      const [usersResponse, friendsResponse] = await Promise.all([
        apiClient.get(`/users?exclude=${currentUserId}`),
        apiClient.get(`/friends/list/${currentUserId}`),
      ]);

      setStudents(usersResponse?.data?.data || []);
      setMyFriends(friendsResponse?.data?.data || []);
      setMessage("");
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          "Unable to fetch friends data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, [currentUserId]);

  const handleSendRequest = async (receiverId) => {
    if (!currentUserId) {
      setMessage("Please login to send friend requests.");
      return;
    }

    try {
      const response = await apiClient.post("/friends/add", {
        sender: currentUserId,
        receiver: receiverId,
      });

      setPendingRequestIds((prev) => {
        if (prev.includes(receiverId)) {
          return prev;
        }
        return [...prev, receiverId];
      });
      setMessage(response?.data?.message || "Friend request sent.");
    } catch (error) {
      if (error?.response?.status === 409) {
        setPendingRequestIds((prev) => {
          if (prev.includes(receiverId)) {
            return prev;
          }
          return [...prev, receiverId];
        });
      }

      setMessage(
        error?.response?.data?.message ||
          "Unable to send friend request. Please try again.",
      );
    }
  };

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
          {loading ? (
            <p className="friends-subtitle">Loading users...</p>
          ) : null}

          {!loading && students.length === 0 ? (
            <article className="friends-empty-card" aria-live="polite">
              <p>No students found right now.</p>
              <p>Invite your friends to join Bhaichara.</p>
            </article>
          ) : null}

          {!loading && students.length > 0 && filteredStudents.length === 0 ? (
            <p className="friends-subtitle">No users match your search.</p>
          ) : null}

          {filteredStudents.map((student, index) => (
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

                return (
                  <button
                    type="button"
                    className="friend-add-btn"
                    onClick={() => handleSendRequest(student._id)}
                    disabled={isAdded || isPending}
                  >
                    {isAdded ? "Added" : isPending ? "Pending" : "Add Friend"}
                  </button>
                );
              })()}
            </article>
          ))}
        </div>

        <section className="my-friends-section" aria-label="My friends list">
          <h2 className="my-friends-title">My Friends</h2>
          <div className="my-friends-list">
            {!loading && myFriends.length === 0 ? (
              <p className="friends-subtitle">No accepted friends yet.</p>
            ) : null}

            {myFriends.map((friend, index) => (
              <article key={friend._id} className="my-friend-card">
                <img
                  src={`https://i.pravatar.cc/120?img=${(index % 60) + 1}`}
                  alt={`${friend.name} profile avatar`}
                  className="my-friend-avatar"
                />
                <p className="my-friend-name">{friend.name}</p>
                <button type="button" className="my-friend-message-btn">
                  Message
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};

export default Friends;
