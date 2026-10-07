"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconLogout } from "@tabler/icons-react";

import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  getSettingsCategoryMeta,
  SETTINGS_GROUPS,
} from "@/components/dashboard/settings/categories";
import { useStyleTerms } from "@/components/dashboard/StyleTermsProvider";
import {
  IconBadge,
  RowText,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout(event: React.MouseEvent) {
    event.preventDefault();
    if (loggingOut) return;

    setError(null);
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Failed to log out."
        );
        return;
      }

      const redirectTo =
        typeof data.redirectTo === "string" ? data.redirectTo : "/auth";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (loggingOut) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className={cn(glassCardClassName, settingsRowClassName, "overflow-hidden")}
        >
          <IconBadge icon={IconLogout} className="text-destructive" />
          <RowText title={<span className="text-destructive">Log out</span>} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need to sign in again to manage your bookings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SettingsPage() {
  const styleTerms = useStyleTerms();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <section className="pr-12">
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your pricing, payments and app preferences.
        </p>
      </section>

      {SETTINGS_GROUPS.map((group) => (
        <SettingsSection key={group.title} title={group.title}>
          <nav aria-label={group.title} className={settingsListClassName}>
            {group.categories.map((category) => {
              const { label, description, icon } = getSettingsCategoryMeta(
                category,
                styleTerms
              );
              return (
                <Link
                  key={category}
                  href={`/dashboard/settings/${category}`}
                  scroll={false}
                  className={settingsRowClassName}
                >
                  <IconBadge icon={icon} />
                  <RowText title={label} description={description} />
                  <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </nav>
          {group.title === "Account" ? <LogoutButton /> : null}
        </SettingsSection>
      ))}
    </div>
  );
}
