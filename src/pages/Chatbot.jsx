import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import "./Chatbot.css";

const Chatbot = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const moodQuickActions = useMemo(
    () => [
      { label: "🙂 Feeling Good", message: "I'm feeling good today" },
      { label: "😐 Just Okay", message: "I'm feeling okay today" },
      { label: "😔 Not Great", message: "I'm not feeling great today" },
    ],
    [],
  );

  const [chatHistory, setChatHistory] = useState([]);
  const [welcomeMessages, setWelcomeMessages] = useState([]);
  const [isWelcomeTyping, setIsWelcomeTyping] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatWindowRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const renderedMessages = useMemo(
    () => [
      ...welcomeMessages.map((item) => ({
        ...item,
        author: user?.aiName || "Jarvish",
      })),
      ...chatHistory.map((item) => ({
        sender: item.role === "assistant" ? "bot" : "user",
        text: item.content,
        author:
          item.role === "assistant"
            ? user?.aiName || "Jarvish"
            : user?.name || "You",
      })),
    ],
    [welcomeMessages, chatHistory, user?.aiName, user?.name],
  );

  useEffect(() => {
    const aiName = user?.aiName || "Jarvish";
    const userName = user?.name;
    const welcomeOne = {
      sender: "bot",
      text: userName
        ? `Hi ${userName} 👋 I'm ${aiName}, your Bhaichara AI companion.`
        : `Hi! I'm ${aiName}, your Bhaichara AI companion.`,
    };
    const welcomeTwo = {
      sender: "bot",
      text: "I'm here to talk, support you, and listen.",
    };

    const welcomeKey = `bhaichara-chat-welcome-${user?.id || user?._id || "guest"}`;
    const hasSeenWelcome = sessionStorage.getItem(welcomeKey) === "1";

    if (hasSeenWelcome) {
      setWelcomeMessages([welcomeOne, welcomeTwo]);
      setIsWelcomeTyping(false);
      return;
    }

    setWelcomeMessages([]);
    setIsWelcomeTyping(true);

    const firstTimer = setTimeout(() => {
      setWelcomeMessages([welcomeOne]);
    }, 700);

    const secondTimer = setTimeout(() => {
      setWelcomeMessages([welcomeOne, welcomeTwo]);
      setIsWelcomeTyping(false);
      sessionStorage.setItem(welcomeKey, "1");
    }, 1500);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
    };
  }, [user?.id, user?._id, user?.name, user?.aiName]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [renderedMessages, isSending, statusMessage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isSending) {
      inputRef.current?.focus();
    }
  }, [isSending]);

  const sendCurrentMessage = async (messageText = draftMessage) => {
    if (isSending) {
      return;
    }

    const trimmed = String(messageText || "").trim();

    if (!trimmed) {
      return;
    }

    const nextHistory = [...chatHistory, { role: "user", content: trimmed }];
    setChatHistory(nextHistory);
    if (messageText === draftMessage) {
      setDraftMessage("");
    }

    try {
      setIsSending(true);
      const response = await api.post("/ai/chat", {
        message: trimmed,
        history: nextHistory,
        userId: user?.id || user?._id,
      });
      const reply = response?.data?.reply;

      if (reply) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);
      }

      setStatusMessage("");
    } catch (error) {
      setStatusMessage(
        error?.response?.data?.message ||
          "Unable to reach the AI right now. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    await sendCurrentMessage();
  };

  const handleKeyDown = (event) => {
    if (event.nativeEvent?.isComposing) {
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void sendCurrentMessage();
  };

  const handleMoodClick = (moodMessage) => {
    void sendCurrentMessage(moodMessage);
  };

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="Bhaichara chatbot">
        <header className="chat-header">
          <div>
            <h1>Bhaichara Chat</h1>
            <p>Your friendly student support companion</p>
          </div>
          <span className="chat-status">
            {user?.name ? `Online • ${user.name}` : "Online"}
          </span>
        </header>

        <div
          ref={chatWindowRef}
          className="chat-window"
          role="log"
          aria-live="polite"
        >
          {statusMessage ? (
            <p className="chat-status">{statusMessage}</p>
          ) : null}

          {renderedMessages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              className={`chat-message-row chat-message-row-${message.sender}`}
            >
              <article className={`chat-bubble chat-bubble-${message.sender}`}>
                <p>
                  {message.author ? (
                    <span className="chat-author">{message.author}: </span>
                  ) : null}
                  {message.text}
                </p>
              </article>
            </div>
          ))}

          {isSending || isWelcomeTyping ? (
            <div className="chat-message-row chat-message-row-bot">
              <article
                className="chat-bubble chat-bubble-bot"
                aria-live="polite"
              >
                <p>{`${user?.aiName || "Jarvish"} is typing...`}</p>
              </article>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSend}>
          {chatHistory.length === 0 ? (
            <div className="chat-quick-moods" aria-label="Quick mood options">
              {moodQuickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="chat-mood-btn"
                  onClick={() => handleMoodClick(action.message)}
                  disabled={isSending}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          <input
            ref={inputRef}
            type="text"
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            aria-label="Type your message"
            disabled={isSending}
          />
          <button type="submit" disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Chatbot;
