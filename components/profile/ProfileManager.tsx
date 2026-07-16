"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ProfileItem = {
  _id: string;
  email: string;
  name: string;
  username: string;
  mobile: string;
  country_code: string;
  role: "hijabstylist" | "makeupartist" | null;
  profileUrl: string;
  profileDisplayUrl: string;
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const roleLabel: Record<"hijabstylist" | "makeupartist", string> = {
  hijabstylist: "Hijab stylist",
  makeupartist: "Makeup artist",
};

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ProfileManager({
  initialProfile,
}: {
  initialProfile: ProfileItem;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [username, setUsername] = useState(initialProfile.username);
  const [mobile, setMobile] = useState(initialProfile.mobile);
  const [countryCode, setCountryCode] = useState(
    initialProfile.country_code || DEFAULT_COUNTRY_CODE
  );
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  function normalizeUsername(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (!isValidPhoneNumber(mobile)) {
      setError("Enter a valid phone number.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: normalizedUsername,
          mobile: mobile.trim(),
          country_code: countryCode,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to save profile."
        );
        return;
      }

      const saved = data.profile as ProfileItem;
      setProfile(saved);
      setName(saved.name);
      setUsername(saved.username);
      setMobile(saved.mobile);
      setCountryCode(saved.country_code || DEFAULT_COUNTRY_CODE);
      setSuccess("Profile saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setError(null);
    setSuccess(null);
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
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Update how clients find and contact you.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          disabled={saving || loggingOut}
          className="shrink-0"
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>
            These details appear on your booking page
            {profile.profileDisplayUrl ? (
              <>
                {" "}
                (
                <a
                  href={profile.profileUrl || `/${profile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {profile.profileDisplayUrl}
                </a>
                )
              </>
            ) : null}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              className={inputClassName}
              value={profile.email}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Email is used for sign-in and cannot be changed here.
            </p>
          </Field>

          {profile.role ? (
            <Field label="Role">
              <Input
                className={inputClassName}
                value={roleLabel[profile.role]}
                disabled
                readOnly
              />
            </Field>
          ) : null}

          <Field label="Display name" htmlFor="profile-name">
            <Input
              id="profile-name"
              className={inputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aisha Rahman"
            />
          </Field>

          <Field label="Username" htmlFor="profile-username">
            <Input
              id="profile-username"
              className={inputClassName}
              value={username}
              onChange={(event) =>
                setUsername(normalizeUsername(event.target.value))
              }
              placeholder="aisha"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens, and underscores. Changing this updates
              your public booking URL.
            </p>
          </Field>

          <Field label="WhatsApp number">
            <PhoneNumberInput
              countryCode={countryCode}
              mobile={mobile}
              onCountryCodeChange={setCountryCode}
              onMobileChange={setMobile}
              inputClassName={inputClassName}
              mobileInputId="profile-mobile"
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-muted-foreground">{success}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="button" onClick={handleSave} disabled={saving || loggingOut}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
