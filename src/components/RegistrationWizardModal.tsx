import React from "react";
import AuthModal from "./AuthModal";
import { UserAccount } from "../types";

interface RegistrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserAccount) => void;
  existingUsers?: UserAccount[];
}

export default function RegistrationWizardModal({
  isOpen,
  onClose,
  onSuccessLogin
}: RegistrationWizardModalProps) {
  return (
    <AuthModal
      isOpen={isOpen}
      initialMode="register"
      onClose={onClose}
      onSuccessLogin={onSuccessLogin}
    />
  );
}
