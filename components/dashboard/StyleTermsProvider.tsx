"use client";

import { createContext, useContext, useMemo } from "react";

import type { User } from "@/schemas/userSchema";
import { getStyleTerms, type StyleTerms } from "@/utils/styleTerms";

const StyleTermsContext = createContext<StyleTerms>(getStyleTerms(null));

/** "Style" or "look" wording for the signed-in user's role, across the dashboard. */
export function StyleTermsProvider({
  role,
  children,
}: {
  role: User["role"] | null;
  children: React.ReactNode;
}) {
  const terms = useMemo(() => getStyleTerms(role), [role]);
  return (
    <StyleTermsContext.Provider value={terms}>{children}</StyleTermsContext.Provider>
  );
}

export function useStyleTerms(): StyleTerms {
  return useContext(StyleTermsContext);
}
