import { getSessionFreelancer } from "@/utils/auth/session";

export default async function OnboardingPage() {
  const freelancer = await getSessionFreelancer();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pb-16 pt-10 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="mb-2 text-sm font-medium text-primary">Bridalync</p>
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Set up your profile
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Complete a few details so clients can find and book you.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Signed in as {freelancer?.email}
        </p>
      </div>
    </div>
  );
}
