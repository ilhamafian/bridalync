import { IconExternalLink } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

export function SiteHeader({
  profilePreviewUrl,
}: {
  profilePreviewUrl?: string | null;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
      <h1 className="text-base font-medium">BRIDALYNC</h1>
      {profilePreviewUrl ? (
        <Button asChild variant="outline" size="sm" className="md:hidden">
          <a href={profilePreviewUrl} target="_blank" rel="noreferrer">
            Profile preview
            <IconExternalLink data-icon="inline-end" />
          </a>
        </Button>
      ) : null}
    </header>
  );
}
