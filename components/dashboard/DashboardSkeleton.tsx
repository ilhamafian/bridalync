"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardSection,
  getSettingsCategory,
} from "@/utils/dashboardShell";

function PageHeaderSkeleton({
  withAction = false,
}: {
  withAction?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      {withAction ? <Skeleton className="h-8 w-28 shrink-0" /> : null}
    </div>
  );
}

function CardRowSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <section className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="flex justify-center gap-1.5">
          <Skeleton className="h-1.5 w-4 rounded-full" />
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="size-1.5 rounded-full" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </section>
    </div>
  );
}

function BookingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-9 w-46" />
      <CardRowSkeleton />
      <CardRowSkeleton />
      <CardRowSkeleton />
    </div>
  );
}

function PackagesSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-9 w-full" />
      <CardRowSkeleton />
      <CardRowSkeleton />
      <CardRowSkeleton />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-8 px-4 lg:px-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      ))}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <PageHeaderSkeleton />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <PageHeaderSkeleton withAction />
        <div className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          <div className="mt-4 flex items-center gap-3">
            <Skeleton className="size-20 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <div className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-4 w-48 max-w-full" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  const pathname = usePathname();
  const section = getDashboardSection(pathname);

  switch (section) {
    case "bookings":
      return <BookingsSkeleton />;
    case "calendar":
      return <CalendarSkeleton />;
    case "settings":
    case "settings-category":
      return getSettingsCategory(pathname) === "packages" ? (
        <PackagesSkeleton />
      ) : (
        <SettingsSkeleton />
      );
    case "profile":
      return <ProfileSkeleton />;
    default:
      return <HomeSkeleton />;
  }
}
