"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type BookingStep =
  | "intro"
  | "events"
  | "datetime"
  | "location"
  | "style"
  | "addons"
  | "details"
  | "review";

const STEP_ORDER: BookingStep[] = [
  "intro",
  "events",
  "datetime",
  "location",
  "style",
  "addons",
  "details",
  "review",
];

export default function ClientPage() {
  const params = useParams();
  const client = params.client as string;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("intro");
  
  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/${client}`);
      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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
    </div>
  );
}