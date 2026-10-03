const PROFILE_PHOTO_CHANGE_EVENT = "bridalync:profile-photo-change";

export function emitProfilePhotoChange(url: string) {
  window.dispatchEvent(
    new CustomEvent<string>(PROFILE_PHOTO_CHANGE_EVENT, { detail: url })
  );
}

export function onProfilePhotoChange(listener: (url: string) => void) {
  const handler = (event: Event) =>
    listener((event as CustomEvent<string>).detail);
  window.addEventListener(PROFILE_PHOTO_CHANGE_EVENT, handler);
  return () => window.removeEventListener(PROFILE_PHOTO_CHANGE_EVENT, handler);
}
