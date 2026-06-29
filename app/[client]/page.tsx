"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import type { PublicFreelancer } from "@/lib/schemas/freelancer";

export default function ClientPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = use(params);

  const [freelancer, setFreelancer] = useState<PublicFreelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound_, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/freelancers/${client}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setFreelancer(data);
      })
      .finally(() => setLoading(false));
  }, [client]);

  if (notFound_) notFound();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {freelancer?.username}
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a date using the calendar picker below.
        </p>
      </main>
    </div>
  );
}
