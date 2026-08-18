"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

interface SearchContextType {
  isOpen: boolean;
  openSearch: (initialQuery?: string) => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  heroSearchVisible: boolean;
  setHeroSearchVisible: (visible: boolean) => void;
  lastActiveElementRef: React.MutableRefObject<HTMLElement | null>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [heroSearchVisible, setHeroSearchVisible] = useState(false);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  // If we navigate away from homepage, ensure hero search visibility doesn't persist
  useEffect(() => {
    if (pathname !== "/") {
      setHeroSearchVisible(false);
    }
  }, [pathname]);

  const openSearch = useCallback((initialQuery?: string) => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastActiveElementRef.current = document.activeElement;
    }
    if (initialQuery !== undefined) {
      setSearchQuery(initialQuery);
    }
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    // Restore focus to trigger element on dismissal
    if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === "function") {
      setTimeout(() => {
        if (lastActiveElementRef.current && typeof document !== "undefined" && document.body.contains(lastActiveElementRef.current)) {
          lastActiveElementRef.current.focus();
        }
      }, 50);
    }
  }, []);

  const toggleSearch = useCallback(() => {
    if (isOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [isOpen, closeSearch, openSearch]);

  // Global keyboard shortcut listener for ⌘K / Ctrl+K and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openSearch, closeSearch]);

  return (
    <SearchContext.Provider
      value={{
        isOpen,
        openSearch,
        closeSearch,
        toggleSearch,
        searchQuery,
        setSearchQuery,
        heroSearchVisible,
        setHeroSearchVisible,
        lastActiveElementRef,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
