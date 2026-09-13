"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconExternalLink } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

export function ProfilePreviewAside({ href }: { href: string }) {
  const [rail, setRail] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRail(document.getElementById("app-shell-rail"));
  }, []);

  if (!rail) return null;

  return createPortal(
    <Button asChild variant="outline" size="sm" className="pointer-events-auto shadow-sm">
      <a href={href} target="_blank" rel="noreferrer">
        Profile preview
        <IconExternalLink data-icon="inline-end" />
      </a>
    </Button>,
    rail
  );
}
