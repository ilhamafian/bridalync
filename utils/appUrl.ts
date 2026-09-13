export function getAppUrl() {
  const url = process.env.APP_URL;
  if (!url) {
    throw new Error("APP_URL must be set");
  }

  return url.replace(/\/$/, "");
}

export function formatAppHost(appUrl: string) {
  try {
    return new URL(appUrl).host;
  } catch {
    return appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function buildProfileUrl(appUrl: string, username: string) {
  return `${appUrl.replace(/\/$/, "")}/${username}`;
}

export function buildProfileDisplayUrl(appUrl: string, username: string) {
  return `${formatAppHost(appUrl)}/${username}`;
}

/** Public profile URL opened from the dashboard “Profile preview” control. */
export function buildProfilePreviewUrl(profileUrl: string) {
  try {
    const url = new URL(profileUrl);
    url.searchParams.set("preview", "1");
    return url.toString();
  } catch {
    const [path, existing = ""] = profileUrl.split("?");
    const params = new URLSearchParams(existing);
    params.set("preview", "1");
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }
}
