import { useState } from "react";
import { LoginPanel } from "../components/siteChrome";

export default function AuthPage({ onSubmit, onCancel }) {
  const [adminEmail, setAdminEmail] = useState("admin@awaited.local");
  const [adminPw, setAdminPw] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");

  const handleSubmit = async () => {
    try {
      await onSubmit({
        email: adminEmail.trim(),
        password: adminPw,
      });
      setAdminPw("");
      setAdminAuthError("");
    } catch (error) {
      setAdminAuthError(error instanceof Error ? error.message : "Admin login failed.");
    }
  };

  return (
    <LoginPanel
      adminEmail={adminEmail}
      adminPw={adminPw}
      adminAuthError={adminAuthError}
      onEmailChange={(event) => {
        setAdminEmail(event.target.value);
        setAdminAuthError("");
      }}
      onPasswordChange={(event) => {
        setAdminPw(event.target.value);
        setAdminAuthError("");
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
