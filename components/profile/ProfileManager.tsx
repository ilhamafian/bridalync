"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";

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
import { formatWhatsAppDisplay } from "@/utils/socialLinks";

export type ProfileSocialLinks = {
  instagram: string;
  tiktok: string;
};

export type ProfileItem = {
  _id: string;
  email: string;
  name: string;
  username: string;
  mobile: string;
  country_code: string;
  role: "hijabstylist" | "makeupartist" | null;
  profile_photo_url: string;
  social_links: ProfileSocialLinks;
  profileUrl: string;
  profileDisplayUrl: string;
};

const EMPTY_SOCIALS: ProfileSocialLinks = {
  instagram: "",
  tiktok: "",
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
  const [photoUrl, setPhotoUrl] = useState(
    initialProfile.profile_photo_url || ""
  );
  const [socials, setSocials] = useState<ProfileSocialLinks>({
    ...EMPTY_SOCIALS,
    ...initialProfile.social_links,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function normalizeUsername(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  }

  function setSocialField(key: keyof ProfileSocialLinks, value: string) {
    setSocials((prev) => ({ ...prev, [key]: value }));
  }

  async function persistProfilePhoto(nextUrl: string) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_photo_url: nextUrl }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Could not save profile photo."
      );
    }

    const saved = data.profile as ProfileItem;
    setProfile((prev) => ({
      ...prev,
      profile_photo_url: saved.profile_photo_url || "",
    }));
    setPhotoUrl(saved.profile_photo_url || "");
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profile-photos");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not upload photo."
        );
        return;
      }

      if (typeof data.url !== "string") {
        setError("Could not upload photo.");
        return;
      }

      await persistProfilePhoto(data.url);
      setSuccess("Profile photo saved.");
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "Could not save profile photo."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (uploading || saving || loggingOut) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await persistProfilePhoto("");
      setSuccess("Profile photo removed.");
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "Could not remove profile photo."
      );
    } finally {
      setUploading(false);
    }
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
          profile_photo_url: photoUrl,
          social_links: socials,
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
      setPhotoUrl(saved.profile_photo_url || "");
      setSocials({ ...EMPTY_SOCIALS, ...saved.social_links });
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
          disabled={saving || loggingOut || uploading}
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
          <Field label="Profile photo">
            <div className="flex items-center gap-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt="Profile photo"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <IconPhoto className="size-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || loggingOut || uploading}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <IconUpload />
                    {uploading ? "Uploading…" : photoUrl ? "Replace" : "Upload"}
                  </Button>
                  {photoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || loggingOut || uploading}
                      onClick={() => void handleRemovePhoto()}
                    >
                      <IconTrash />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or GIF up to 4 MB. Saves automatically.
                </p>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </Field>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
          <CardDescription>
            Shown on your public profile. Paste a URL or username for Instagram
            and TikTok.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Instagram" htmlFor="social-instagram">
            <Input
              id="social-instagram"
              className={inputClassName}
              value={socials.instagram}
              onChange={(e) => setSocialField("instagram", e.target.value)}
              placeholder="@yourhandle or instagram.com/…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          <Field label="TikTok" htmlFor="social-tiktok">
            <Input
              id="social-tiktok"
              className={inputClassName}
              value={socials.tiktok}
              onChange={(e) => setSocialField("tiktok", e.target.value)}
              placeholder="@yourhandle or tiktok.com/@…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              className={inputClassName}
              value={formatWhatsAppDisplay(countryCode, mobile)}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Uses your WhatsApp number above. To change it, update the WhatsApp
              number in Public profile, then save.
            </p>
          </Field>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-muted-foreground">{success}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loggingOut || uploading}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
