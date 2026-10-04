"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  IconBriefcase,
  IconChevronRight,
  IconMail,
  IconPhoto,
  IconStar,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import { emitProfilePhotoChange } from "@/components/dashboard/profilePhotoEvents";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BIO_MAX_LENGTH } from "@/schemas/bio";
import { buildProfilePreviewUrl, formatAppHost } from "@/utils/appUrl";
import { compressImageFile } from "@/utils/image/compressClient";
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
  bio: string;
  social_links: ProfileSocialLinks;
};

const EMPTY_SOCIALS: ProfileSocialLinks = {
  instagram: "",
  tiktok: "",
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
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

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function ProfileManager({
  initialProfile,
  appUrl,
  reviewCount,
}: {
  initialProfile: ProfileItem;
  appUrl: string | null;
  reviewCount: number;
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
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [socials, setSocials] = useState<ProfileSocialLinks>({
    ...EMPTY_SOCIALS,
    ...initialProfile.social_links,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const busy = saving || uploading;
  const appHost = appUrl ? formatAppHost(appUrl) : "";
  const previewUrl = profile.username
    ? buildProfilePreviewUrl(`/${profile.username}`)
    : null;

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
    emitProfilePhotoChange(saved.profile_photo_url || "");
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const prepared = await compressImageFile(file);

      const formData = new FormData();
      formData.append("file", prepared);
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
    if (busy) return;

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

    if (bio.trim().length > BIO_MAX_LENGTH) {
      setError(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
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
          bio: bio.trim(),
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
      setBio(saved.bio || "");
      setSocials({ ...EMPTY_SOCIALS, ...saved.social_links });
      setSuccess("Profile saved.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <section className="pr-12">
        <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update how clients find and contact you.
        </p>
      </section>

      <SettingsSection title="Reviews">
        <nav aria-label="Reviews" className={settingsListClassName}>
          <Link
            href="/dashboard/profile/reviews"
            scroll={false}
            className={settingsRowClassName}
          >
            <IconBadge icon={IconStar} />
            <RowText
              title="View reviews"
              description={
                reviewCount === 1
                  ? "1 review on your public profile"
                  : `${reviewCount} reviews on your public profile`
              }
            />
            <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </nav>
      </SettingsSection>

      <SettingsSection
        title="Public profile"
        action={
          previewUrl ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-white/40 dark:hover:bg-white/10"
            >
              <Link href={previewUrl}>
                Preview profile
                <IconChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null
        }
      >
        <div className={settingsCardClassName}>
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-white/50 ring-1 ring-white/60 dark:bg-white/10 dark:ring-white/15">
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
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
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
                    disabled={busy}
                    onClick={() => void handleRemovePhoto()}
                  >
                    <IconTrash />
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF. Saves automatically.
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

          <Field label="Display name" htmlFor="profile-name">
            <Input
              id="profile-name"
              className={inputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aisha Rahman"
            />
          </Field>

          <Field label="Bio" htmlFor="profile-bio">
            <Textarea
              id="profile-bio"
              className="min-h-20 bg-white/60 px-3 text-sm md:text-sm dark:bg-white/5"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={BIO_MAX_LENGTH}
              rows={3}
              placeholder="Bridal makeup & hijab styling based in Kuala Lumpur."
            />
            <p className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>Shown under your role on your booking page.</span>
              <span className="shrink-0 tabular-nums">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            </p>
          </Field>

          <Field label="Username" htmlFor="profile-username">
            <div
              className={cn(
                "flex h-10 w-full items-center rounded-md border border-border bg-white/60 text-sm dark:bg-white/5",
                "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
              )}
            >
              <label
                htmlFor="profile-username"
                className="max-w-[60%] shrink-0 truncate pl-3 text-muted-foreground select-none"
              >
                {appHost}/
              </label>
              <input
                id="profile-username"
                className="h-full min-w-0 flex-1 bg-transparent pr-3 text-foreground outline-none placeholder:text-muted-foreground"
                value={username}
                onChange={(event) =>
                  setUsername(normalizeUsername(event.target.value))
                }
                placeholder="aisha"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens, and underscores. Changing this changes
              your public profile link.
            </p>
          </Field>

          <Field label="WhatsApp number">
            <PhoneNumberInput
              countryCode={countryCode}
              mobile={mobile}
              onCountryCodeChange={setCountryCode}
              onMobileChange={setMobile}
              inputClassName={inputClassName}
              selectTriggerClassName="bg-white/60 dark:bg-white/5"
              mobileInputId="profile-mobile"
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Social links">
        <div className={settingsCardClassName}>
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
              Uses your WhatsApp number above.
            </p>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Account">
        <div className={settingsListClassName}>
          <div className={cn(settingsRowClassName, "hover:bg-transparent dark:hover:bg-transparent")}>
            <IconBadge icon={IconMail} />
            <RowText
              title={profile.email}
              description="Used for sign-in and can't be changed here"
            />
          </div>
          {profile.role ? (
            <div className={cn(settingsRowClassName, "hover:bg-transparent dark:hover:bg-transparent")}>
              <IconBadge icon={IconBriefcase} />
              <RowText title={roleLabel[profile.role]} description="Role" />
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsFeedback error={error} success={success} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={handleSave}
        disabled={busy}
      >
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
