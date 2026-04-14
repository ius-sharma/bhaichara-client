import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../services/api";
import "./FriendChat.css";

const resolveAvatar = (user) => {
  if (user?.avatarUrl) {
    return user.avatarUrl;
  }

  const seed = encodeURIComponent(user?.name || user?._id || "friend");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
};

const FriendChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { friendId } = useParams();
  const presetFriend = location.state?.friend || null;

  const [friend, setFriend] = useState(presetFriend);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem("token") || "";
  const currentUserId = useMemo(() => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload?.id || "";
    } catch {
      return "";
    }
  }, [token]);

  useEffect(() => {
    if (!friendId) {
      return;
    }

    let isActive = true;

    const loadFriendInfo = async () => {
      if (presetFriend?._id === friendId) {
        return;
      }

      try {
        const response = await apiClient.get("/friends/list");
        if (!isActive) {
          return;
        }

        const friends = response?.data?.data || [];
        const matched = friends.find(
          (item) => String(item._id) === String(friendId),
        );
        setFriend(matched || null);
      } catch {
        if (isActive) {
          setFriend(null);
        }
      }
    };

    loadFriendInfo();

    return () => {
      isActive = false;
    };
  }, [friendId, presetFriend]);

  useEffect(() => {
    if (!friendId) {
      setLoading(false);
      setError("Friend not found.");
      return;
    }

    let isActive = true;

    const loadConversation = async (options = {}) => {
      const { silent = false } = options;

      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError("");

      try {
        const response = await apiClient.get(
          `/messages/conversation/${friendId}`,
        );
        if (!isActive) {
          return;
        }

        setConversation(response?.data?.data || []);
      } catch (err) {
        if (isActive) {
          setConversation([]);
          setError(err?.response?.data?.message || "Unable to load chat.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    const pollTypingStatus = async () => {
      try {
        const resp = await apiClient.get(
          `/messages/typing-status?friendId=${friendId}`,
        );
        if (isActive) {
          setIsFriendTyping(Boolean(resp?.data?.isTyping));
        }
      } catch {
        if (isActive) setIsFriendTyping(false);
      }
    };

    loadConversation();
    pollTypingStatus();

    const intervalId = window.setInterval(() => {
      void loadConversation({ silent: true });
      void pollTypingStatus();
    }, 2500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [friendId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, loading, isRefreshing]);

  const handleSend = async (event) => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (!friendId || !trimmed || sending) {
      return;
    }

    try {
      setSending(true);
      const response = await apiClient.post("/messages/send", {
        receiver: friendId,
        message: trimmed,
      });

      const sentMessage = response?.data?.data;
      if (sentMessage) {
        setConversation((prev) => [...prev, sentMessage]);
      }
      setDraft("");
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  // --- Typing status: send to backend when typing ---
  const sendTypingStatus = async (isTyping) => {
    try {
      await apiClient.post("/messages/typing-status", {
        friendId,
        isTyping,
      });
    } catch {}
  };

  // On input change, send typing status
  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    // Send typing status true
    sendTypingStatus(true);
    // Debounce: after 2s of no typing, send false
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  // On unmount, send typing false
  useEffect(() => {
    return () => {
      sendTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line
  }, [friendId]);

  return (
    <main className="friend-chat-page">
      <section className="friend-chat-shell" aria-label="Friend chat">
        <div className="friend-chat-topbar">
          <button
            type="button"
            className="friend-chat-back-btn"
            onClick={() => navigate("/friends")}
          >
            Back to Friends
          </button>

          <div className="friend-chat-user">
            <img
              src={resolveAvatar(friend)}
              alt={`${friend?.name || "Friend"} avatar`}
              className="friend-chat-user-avatar"
            />
            <div>
              <h1>{friend?.name || "Friend Chat"}</h1>
              <p>{friend?.email || "Send a message to start chatting."}</p>
            </div>
          </div>
        </div>

        <div className="friend-chat-window" role="log" aria-live="polite">
          {loading ? <p className="friend-chat-note">Loading chat...</p> : null}
          {!loading && isRefreshing ? (
            <p className="friend-chat-note friend-chat-refreshing">
              Updating messages...
            </p>
          ) : null}
          {error ? <p className="friend-chat-note">{error}</p> : null}

          {!loading && !error && conversation.length === 0 ? (
            <p className="friend-chat-note">No messages yet. Say hello!</p>
          ) : null}

          {conversation.map((item) => {
            const isOwn = String(item.sender) === String(currentUserId);
            return (
              <div
                key={item._id}
                className={`friend-chat-row ${
                  isOwn ? "friend-chat-row-own" : "friend-chat-row-peer"
                }`}
              >
                <article
                  className={`friend-chat-bubble ${
                    isOwn ? "friend-chat-bubble-own" : "friend-chat-bubble-peer"
                  }`}
                >
                  <p>{item.message}</p>
                </article>
              </div>
            );
          })}

          {/* Show friend's typing indicator if they are typing */}
          {!loading && !error && isFriendTyping ? (
            <div className="friend-chat-row friend-chat-row-peer">
              <article className="friend-chat-bubble friend-chat-bubble-typing">
                <span className="friend-chat-typing-label">
                  {friend?.name || "Friend"} is typing
                </span>
                <span className="friend-chat-typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </article>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>

        <form className="friend-chat-input" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={handleDraftChange}
            placeholder={`Message ${friend?.name || "friend"}...`}
          />
          <button type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default FriendChat;
