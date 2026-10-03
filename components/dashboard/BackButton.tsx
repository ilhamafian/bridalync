"use client";

import { useRouter } from "next/navigation";
import { IconChevronLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

export function BackButton({ fallbackHref = "/dashboard" }: { fallbackHref?: string }) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleBack}
      className="-ml-3 gap-1 self-start px-3 hover:bg-transparent dark:hover:bg-transparent"
    >
      <IconChevronLeft className="size-5" />
      Back
    </Button>
  );
}
