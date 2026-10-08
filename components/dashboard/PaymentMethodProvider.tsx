"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { PaymentMethod } from "@/schemas/settingSchema";

type PaymentMethodContextValue = {
  usesPaymentGateway: boolean;
  setPaymentMethod: (method: PaymentMethod) => void;
};

const PaymentMethodContext = createContext<PaymentMethodContextValue>({
  usesPaymentGateway: false,
  setPaymentMethod: () => {},
});

/** The signed-in stylist's saved payment method, kept current after Settings saves. */
export function PaymentMethodProvider({
  initialMethod,
  children,
}: {
  initialMethod: PaymentMethod | undefined;
  children: React.ReactNode;
}) {
  const [savedMethod, setSavedMethod] = useState<PaymentMethod | null>(null);
  const method = savedMethod ?? initialMethod ?? "manual_transfer";
  const value = useMemo(
    () => ({
      usesPaymentGateway: method === "payment_gateway",
      setPaymentMethod: setSavedMethod,
    }),
    [method]
  );
  return (
    <PaymentMethodContext.Provider value={value}>
      {children}
    </PaymentMethodContext.Provider>
  );
}

export function usePaymentMethod(): PaymentMethodContextValue {
  return useContext(PaymentMethodContext);
}
