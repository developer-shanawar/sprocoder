import React from "react";
import AuthModal from "./AuthModal";
import { UserAccount } from "../types";

interface RegistrationPageProps {
  onSuccessRegistration: (user: UserAccount) => void;
  onNavigateHome: () => void;
  initialMode?: "register" | "login";
}

export default function RegistrationPage({
  onSuccessRegistration,
  onNavigateHome,
  initialMode = "register"
}: RegistrationPageProps) {
  return (
    <div className="w-full py-6 animate-in fade-in duration-300" id="registration-page-wrapper">
      <AuthModal
        isOpen={true}
        initialMode={initialMode}
        onClose={onNavigateHome}
        onSuccessLogin={onSuccessRegistration}
        onNavigateHome={onNavigateHome}
        isStandalonePage={true}
      />
    </div>
  );
}
