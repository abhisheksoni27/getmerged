"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export function useProfileUi(onLoggedOut: () => void) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Clear cookie client-side as fallback
      document.cookie = "opendoor_token=; Path=/; Max-Age=0; SameSite=Lax";
    }
    onLoggedOut();
    window.location.href = "/";
  };

  return {
    isEditModalOpen,
    setIsEditModalOpen,
    isResumeModalOpen,
    setIsResumeModalOpen,
    isMenuOpen,
    setIsMenuOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    menuRef,
    handleLogout,
  };
}

export type ProfileUi = ReturnType<typeof useProfileUi>;
