import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col justify-between px-6 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <p className="mb-3 text-sm font-medium text-primary">For bridal glam freelancers</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-foreground">
          Bridalync
        </h1>
        <p className="max-w-xs text-base leading-relaxed text-muted-foreground">
          Manage clients, share a booking link, and keep wedding-day appointments in one place.
        </p>
      </div>

      <div className="space-y-3">
        <Button className="h-11 w-full rounded-xl text-sm" size="lg">
          Get started
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Makeup artists, hijab stylists, hair stylists & more
        </p>
      </div>
    </div>
  );
}
