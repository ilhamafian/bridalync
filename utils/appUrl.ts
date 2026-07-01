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
