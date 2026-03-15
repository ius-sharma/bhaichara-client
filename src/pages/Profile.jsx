import { useContext, useMemo, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api, { API_BASE_URL } from "../services/api";
import "./Profile.css";

const GENERIC_AVATAR_URL =
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=generic-user";

const resolveAbsoluteAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${backendOrigin}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
};

const Profile = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("Profile must be used within an AuthProvider.");
  }

  const { user, updateUser } = authContext;

  const [editMode, setEditMode] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    interests: Array.isArray(user?.interests) ? user.interests.join(", ") : "",
    aiName: user?.aiName || "Jarvish",
    avatarUrl: user?.avatarUrl || "",
  });

  if (!user) {
    return (
      <main className="profile-page">
        <section className="profile-card" aria-label="User profile">
          <h1 className="profile-name">Profile</h1>
          <p className="profile-email">Please login to view your profile.</p>
        </section>
      </main>
    );
  }

  const interests = Array.isArray(user.interests) ? user.interests : [];
  const avatar = useMemo(() => {
    const uploadedAvatar = resolveAbsoluteAvatarUrl(user.avatarUrl || "");
    if (uploadedAvatar) {
      return uploadedAvatar;
    }

    const nameSeed = String(user.name || "").trim();
    if (nameSeed) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameSeed)}`;
    }

    return GENERIC_AVATAR_URL;
  }, [user.avatarUrl, user.name]);

  const handleEditClick = () => {
    setFormData({
      name: user.name || "",
      bio: user.bio || "",
      interests: interests.join(", "),
      aiName: user.aiName || "Jarvish",
      avatarUrl: user.avatarUrl || "",
    });
    setAvatarUploadError("");
    setEditMode(true);
  };

  const handleCancel = () => {
    setAvatarUploadError("");
    setEditMode(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const nextInterests = formData.interests
      .split(",")
      .map((interest) => interest.trim())
      .filter(Boolean);

    try {
      const payload = {
        name: formData.name.trim() || user.name,
        bio: formData.bio.trim(),
        interests: nextInterests,
        aiName: formData.aiName.trim() || "Jarvish",
        avatarUrl: formData.avatarUrl || "",
      };

      const response = await api.put(
        `/users/${user.id || user._id}/profile`,
        payload,
      );

      updateUser(response?.data?.user || payload);
      setEditMode(false);
    } catch {
      // Keep the user in edit mode if update fails.
    }
  };

  const handleAvatarButtonClick = () => {
    if (!fileInputRef.current || isUploadingAvatar) {
      return;
    }

    fileInputRef.current.click();
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarUploadError("");
    setIsUploadingAvatar(true);

    try {
      // Step 1 — upload the file to Cloudinary via the upload endpoint.
      const formPayload = new FormData();
      formPayload.append("avatar", file);

      const uploadResponse = await api.post("/upload/avatar", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const nextAvatarUrl = uploadResponse?.data?.avatarUrl;
      if (!nextAvatarUrl) {
        throw new Error("No avatarUrl returned from upload.");
      }

      // Step 2 — persist the Cloudinary URL on the user record.
      const saveResponse = await api.put("/users/avatar", {
        avatarUrl: nextAvatarUrl,
      });

      const updatedUser = saveResponse?.data?.user || {
        avatarUrl: nextAvatarUrl,
      };

      // Step 3 — update UI immediately.
      setFormData((prev) => ({ ...prev, avatarUrl: nextAvatarUrl }));
      updateUser(updatedUser);
    } catch {
      setAvatarUploadError("Could not upload photo. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <main className="profile-page">
      <section className="profile-card" aria-label="User profile">
        <div className="profile-header">
          <div
            className="profile-avatar-wrap"
            onClick={handleAvatarButtonClick}
            role="button"
            tabIndex={0}
            aria-label="Change profile photo"
            onKeyDown={(e) => e.key === "Enter" && handleAvatarButtonClick()}
          >
            <img
              src={avatar}
              alt={`${user.name || "User"} profile`}
              className="profile-avatar"
            />
            <div className="profile-avatar-overlay" aria-hidden="true">
              <span>{isUploadingAvatar ? "Uploading…" : "Change Photo"}</span>
            </div>
          </div>
          <div className="profile-title-wrap">
            <h1 className="profile-name">{user.name || "Student"}</h1>
            <p className="profile-email">
              {user.email || "No email available"}
            </p>
          </div>
        </div>

        {/* Hidden file input — always mounted so avatar overlay can trigger it */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="profile-avatar-input"
        />

        {editMode ? (
          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="profile-field">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                rows="4"
                value={formData.bio}
                onChange={handleChange}
              />
            </div>

            <div className="profile-field">
              <label htmlFor="interests">Interests</label>
              <input
                id="interests"
                name="interests"
                type="text"
                value={formData.interests}
                onChange={handleChange}
                placeholder="Web Development, Music, Mental Wellness"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="aiName">My AI Companion Name</label>
              <input
                id="aiName"
                name="aiName"
                type="text"
                value={formData.aiName}
                onChange={handleChange}
                placeholder="Jarvish"
              />
            </div>

            <div className="profile-field">
              <label>Profile Photo</label>
              <div className="profile-avatar-upload-row">
                <button
                  type="button"
                  className="profile-upload-btn"
                  onClick={handleAvatarButtonClick}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
                </button>
                <span className="profile-upload-hint">
                  JPG, PNG, WEBP up to 5MB
                </span>
              </div>
              {avatarUploadError ? (
                <p className="profile-upload-error">{avatarUploadError}</p>
              ) : null}
            </div>

            <div className="profile-actions">
              <button type="submit" className="profile-edit-btn">
                Save
              </button>
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-section">
              <h2>Bio</h2>
              <p>{user.bio || "No bio added yet."}</p>
            </div>

            <div className="profile-section">
              <h2>Interests</h2>
              <div className="profile-interests">
                {interests.length > 0 ? (
                  interests.map((interest) => (
                    <span key={interest} className="profile-interest-chip">
                      {interest}
                    </span>
                  ))
                ) : (
                  <p>No interests added yet.</p>
                )}
              </div>
            </div>

            <div className="profile-section">
              <h2>My AI Companion Name</h2>
              <p>{user.aiName || "Jarvish"}</p>
            </div>

            <button
              type="button"
              className="profile-edit-btn"
              onClick={handleEditClick}
            >
              Edit Profile
            </button>
          </>
        )}
      </section>
    </main>
  );
};

export default Profile;
