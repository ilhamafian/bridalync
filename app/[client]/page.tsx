"use client";

import {
  BookingPackagePicker,
  type PackageOption,
} from "@/components/BookingPackagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type BookingStep =
  | "intro"
  | "name"
  | "events"
  | "datetime"
  | "location"
  | "style"
  | "addons"
  | "details"
  | "review";

const STEP_ORDER: BookingStep[] = [
  "intro",
  "name",
  "events",
  "datetime",
  "location",
  "style",
  "addons",
  "details",
  "review",
];

type ClientPackage = {
  _id?: unknown;
  name: string;
  price: number;
  session_templates: { name: string; order: number }[];
};

function normalizePackageId(id: unknown): string {
  if (typeof id === "string") return id;
  if (
    id &&
    typeof id === "object" &&
    "$oid" in id &&
    typeof (id as { $oid: unknown }).$oid === "string"
  ) {
    return (id as { $oid: string }).$oid;
  }
  return "";
}

function toPackageOptions(packages: ClientPackage[]): PackageOption[] {
  return packages
    .map((pkg) => ({
      id: normalizePackageId(pkg._id),
      name: pkg.name,
      price: pkg.price,
      sessionCount: pkg.session_templates.length,
    }))
    .filter((pkg) => pkg.id.length > 0);
}

export default function ClientPage() {
  const params = useParams();
  const client = params.client as string;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("intro");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/${client}`);
      const data = await response.json();
      const packageOptions = toPackageOptions(data.packages ?? []);
      setPackages(packageOptions);
      setSelectedPackageId((current) => current ?? packageOptions[0]?.id ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [client]);

  function goToNextStep() {
    const index = STEP_ORDER.indexOf(step);
    if (index < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[index + 1]);
    }
  }

  function goToPreviousStep() {
    const index = STEP_ORDER.indexOf(step);
    if (index > 0) {
      setStep(STEP_ORDER[index - 1]);
    }
  }

  return(
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pb-16 dark:bg-zinc-950",
        step === "intro" ? "pt-16" : "pt-4"
      )}
    >
      {step !== "intro" && (
        <div className="sticky top-0 z-10 mb-4 w-full max-w-md self-center bg-zinc-50 pt-2 dark:bg-zinc-950">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={goToPreviousStep}
          >
            <ChevronLeftIcon />
            Back
          </Button>
        </div>
      )}
      {step === "intro" && (
        <button
          type="button"
          className={cn("flex flex-1 flex-col items-center justify-center")}
          onClick={goToNextStep}
        >
          <h1 className="max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hi, nice to meet you! Can you tell me your name?
          </h1>
        </button>
      )}
      {step === "name" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <Input type="text" placeholder="Enter your name" />
          <Button
            size="lg"
            className="bg-chart-4 text-white hover:bg-chart-4/90"
            onClick={goToNextStep}
          >
            Next
            <ChevronRightIcon />
          </Button>
        </div>
        
      )}
      {step === "events" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            What are you booking for?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Choose the package that matches your event.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            {loading ? (
              <p className="w-full text-center text-sm text-muted-foreground">
                Loading packages...
              </p>
            ) : (
              <BookingPackagePicker
                packages={packages}
                selectedPackageId={selectedPackageId}
                onPackageChange={setSelectedPackageId}
              />
            )}
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              disabled={!selectedPackageId}
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}