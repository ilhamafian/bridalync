"use client";

import { useEffect, useMemo, useState } from "react";

import {
  BookingClientInfoForm,
  BookingInstagramField,
  type MoodboardPhoto,
} from "@/components/booking/BookingClientInfoForm";
import { BookingContactForm } from "@/components/BookingContactForm";
import { useLocale } from "@/components/LocaleProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PublicBooking } from "@/schemas/bookingSchema";
import type { ClientInfoSetting } from "@/schemas/clientInfoSchema";
import type { Client } from "@/schemas/clientSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import {
  buildBlockedDateSet,
  isDateBlocked,
} from "@/utils/booking/blockedDates";
import { getEffectiveBookingUntil, isPastBookingWindow } from "@/utils/booking/bookingWindow";
import {
  getBookingParty,
  getClientQuestions,
  isClientInfoComplete,
} from "@/utils/booking/clientInfo";
import {
  isClientEditable,
  isReceiptAwaitingReview,
} from "@/utils/booking/clientEdits";
import { isDateAllowedForEvent } from "@/utils/booking/events";
import {
  isSlotTaken,
  toDateKey,
  type PublicBookedSlot,
} from "@/utils/booking/availability";
import { formatRm } from "@/utils/booking/pricing";

type PartyDraft = {
  name: string;
  instagram: string;
  answers: Record<string, string>;
  existingMoodboard: string[];
  moodboard: MoodboardPhoto[];
};

type SessionDraft = {
  clientKey: string;
  name: string;
  date?: Date;
  slot: TimeSlot | null;
  readyBy: string;
};

type ClientContext = {
  settings?: {
    time_slots?: TimeSlot[];
    booking_until?: string;
    max_booking_year?: number;
    client_info?: ClientInfoSetting;
  };
  booked_slots?: PublicBookedSlot[];
  blocked_dates?: string[];
};

type PricePreview = {
  totalRm: number;
  previousTotalRm: number;
  collectedRm: number;
  dueRm: number;
  retainedRm: number;
};

const timeInputClassName = cn(
  "h-10 w-full rounded-md border border-input bg-input/20 px-3 text-xs/relaxed text-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "dark:bg-input/30"
);

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function sessionDrafts(booking: PublicBooking): SessionDraft[] {
  return booking.sessions.map((session, index) => {
    const key = toDateKey(session.date);
    return {
      clientKey: session.client_key ?? String(index),
      name: session.name,
      date: key ? dateFromKey(key) : undefined,
      slot: session.time_slot,
      readyBy: session.ready_by ?? "",
    };
  });
}

function partyDrafts(booking: PublicBooking): PartyDraft[] {
  return getBookingParty(booking).map((member) => ({
    name: member.name,
    instagram: member.clientDetails?.instagram ?? "",
    answers: Object.fromEntries(
      (member.clientDetails?.answers ?? []).map((answer) => [
        answer.questionId,
        answer.answer,
      ])
    ),
    existingMoodboard: member.clientDetails?.moodboardUrls ?? [],
    moodboard: [],
  }));
}

async function errorFrom(response: Response, fallback: string) {
  try {
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }
  } catch {
    // The fallback covers a non-JSON error page.
  }
  return fallback;
}

export function ClientBookingManage({
  booking,
  username,
  onUpdated,
}: {
  booking: PublicBooking;
  username: string;
  onUpdated: (booking: PublicBooking) => void;
}) {
  const { t, format, dateFnsLocale } = useLocale();
  const editable = isClientEditable(booking);
  const datePaused = isReceiptAwaitingReview(booking);
  const customEvent = Boolean(booking.customEvent);
  const sameDay = booking.dayMode === "same_day";

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [context, setContext] = useState<ClientContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contact, setContact] = useState<Client>({
    name: booking.contact.name,
    email: booking.contact.email,
    mobile: booking.contact.mobile ?? "",
    country_code: booking.contact.country_code ?? "",
  });
  const [party, setParty] = useState<PartyDraft[]>(() => partyDrafts(booking));
  const [drafts, setDrafts] = useState<SessionDraft[]>(() => sessionDrafts(booking));
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detailsOpen && !dateOpen) return;
    let cancelled = false;
    setContextError(null);
    void fetch(
      `/api/client/${encodeURIComponent(username)}?excludeBooking=${encodeURIComponent(booking._id)}`
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(t.couldNotLoadBooking);
        return (await response.json()) as ClientContext;
      })
      .then((data) => {
        if (!cancelled) setContext(data);
      })
      .catch(() => {
        if (!cancelled) setContextError(t.couldNotLoadBooking);
      });
    return () => {
      cancelled = true;
    };
  }, [booking._id, dateOpen, detailsOpen, t.couldNotLoadBooking, username]);

  const clientInfo = context?.settings?.client_info;
  const timeSlots = context?.settings?.time_slots ?? [];
  const blockedKeys = useMemo(
    () => buildBlockedDateSet(context?.blocked_dates ?? []),
    [context?.blocked_dates]
  );
  const bookingUntil = useMemo(
    () =>
      getEffectiveBookingUntil({
        booking_until: context?.settings?.booking_until,
        max_booking_year: context?.settings?.max_booking_year,
      }),
    [context?.settings?.booking_until, context?.settings?.max_booking_year]
  );
  const endMonth = useMemo(() => {
    const [year, month] = bookingUntil.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, 1);
  }, [bookingUntil]);

  if (!editable) return null;

  function openDetails() {
    setContact({
      name: booking.contact.name,
      email: booking.contact.email,
      mobile: booking.contact.mobile ?? "",
      country_code: booking.contact.country_code ?? "",
    });
    setParty(partyDrafts(booking));
    setError(null);
    setDetailsOpen(true);
  }

  function openDates() {
    setDrafts(sessionDrafts(booking));
    setPreview(null);
    setError(null);
    setDateOpen(true);
  }

  function updateParty(index: number, patch: Partial<PartyDraft>) {
    setParty((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member
      )
    );
  }

  function setSessionDate(index: number, date: Date | undefined) {
    setPreview(null);
    setDrafts((current) =>
      current.map((session, sessionIndex) => {
        if (sameDay || sessionIndex === index) {
          return { ...session, date, slot: customEvent ? session.slot : null };
        }
        return session;
      })
    );
  }

  function setSessionSlot(index: number, slot: TimeSlot | null) {
    setPreview(null);
    setDrafts((current) =>
      current.map((session, sessionIndex) =>
        sessionIndex === index ? { ...session, slot } : session
      )
    );
  }

  function setReadyBy(index: number, readyBy: string) {
    setPreview(null);
    setDrafts((current) =>
      current.map((session, sessionIndex) =>
        sessionIndex === index ? { ...session, readyBy } : session
      )
    );
  }

  function schedulePayload() {
    return drafts.map((session) => ({
      client_key: session.clientKey,
      date: session.date ? toDateKey(session.date) : "",
      time_slot: session.slot!,
      ...(session.readyBy ? { ready_by: session.readyBy } : {}),
    }));
  }

  function scheduleReady() {
    return drafts.every(
      (session) =>
        session.date &&
        session.slot &&
        session.slot.startTime < session.slot.endTime &&
        (customEvent || session.readyBy)
    );
  }

  async function saveDetails() {
    const questions = getClientQuestions(clientInfo);
    const complete = party.every((member, index) => {
      const name = index === 0 ? contact.name : member.name;
      return (
        name.trim().length > 0 &&
        isClientInfoComplete(clientInfo, {
          instagram: member.instagram,
          answers: member.answers,
        })
      );
    });
    if (!complete || !contact.email.trim()) {
      setError(t.couldNotSaveDetails);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const members = await Promise.all(
        party.map(async (member, index) => {
          const uploaded: string[] = [];
          if (clientInfo?.moodboard) {
            for (const photo of member.moodboard) {
              const body = new FormData();
              body.append("file", photo.file);
              body.append("client", username);
              body.append("memberIndex", String(index));
              const response = await fetch(
                `/api/bookings/${booking._id}/moodboard`,
                { method: "POST", body }
              );
              if (!response.ok) {
                throw new Error(await errorFrom(response, t.couldNotSaveDetails));
              }
              const payload = (await response.json()) as { url?: string };
              if (!payload.url) throw new Error(t.couldNotSaveDetails);
              uploaded.push(payload.url);
            }
          }
          return {
            name: (index === 0 ? contact.name : member.name).trim(),
            clientDetails: {
              ...(member.instagram.trim()
                ? { instagram: member.instagram.trim() }
                : {}),
              answers: questions
                .map((question) => ({
                  questionId: question.id,
                  answer: member.answers[question.id]?.trim() ?? "",
                }))
                .filter((answer) => answer.answer),
            },
            ...(clientInfo?.moodboard
              ? {
                  moodboardUrls: [...member.existingMoodboard, ...uploaded],
                }
              : {}),
          };
        })
      );

      const response = await fetch(`/api/bookings/${booking._id}/client-details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: username,
          contact: {
            name: contact.name.trim(),
            email: contact.email.trim(),
            ...(contact.mobile?.trim()
              ? {
                  mobile: contact.mobile.trim(),
                  country_code: contact.country_code,
                }
              : {}),
          },
          party: members,
        }),
      });
      if (!response.ok) {
        throw new Error(await errorFrom(response, t.couldNotSaveDetails));
      }
      onUpdated((await response.json()) as PublicBooking);
      setDetailsOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t.couldNotSaveDetails
      );
    } finally {
      setSaving(false);
    }
  }

  async function reviewOrSaveDate(confirm: boolean) {
    if (!scheduleReady()) {
      setError(t.pickDateAndTime);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${booking._id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: username,
          confirm,
          sessions: schedulePayload(),
        }),
      });
      if (!response.ok) {
        throw new Error(await errorFrom(response, t.couldNotChangeDate));
      }
      const payload = (await response.json()) as PricePreview &
        PublicBooking & { preview?: boolean };
      if (!confirm && payload.preview) {
        setPreview(payload);
        return;
      }
      onUpdated(payload);
      setDateOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t.couldNotChangeDate
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${booking._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: username }),
      });
      if (!response.ok) {
        throw new Error(await errorFrom(response, t.couldNotCancelBooking));
      }
      onUpdated((await response.json()) as PublicBooking);
      setCancelOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t.couldNotCancelBooking
      );
    } finally {
      setSaving(false);
    }
  }

  const paid =
    booking.status === "confirmed" ||
    (booking.collectedRm ?? 0) > 0 ||
    Boolean(booking.depositPaidAt) ||
    booking.depositVerificationStatus === "pending" ||
    booking.depositVerificationStatus === "approved";
  const stylistName = booking.freelancer?.name ?? t.stylist;

  return (
    <div className="flex w-full flex-col gap-2">
      <Button type="button" variant="outline" className="h-11 w-full" onClick={openDetails}>
        {t.editDetails}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={datePaused}
        onClick={openDates}
      >
        {t.changeDate}
      </Button>
      {datePaused ? (
        <p className="text-xs text-muted-foreground">{t.dateChangePaused}</p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full text-destructive hover:text-destructive"
        onClick={() => {
          setError(null);
          setCancelOpen(true);
        }}
      >
        {t.cancelBooking}
      </Button>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t.editDetailsTitle}</SheetTitle>
            <SheetDescription>{t.editDetailsHint}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">{t.reviewName}</span>
              <input
                value={contact.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setContact((current) => ({ ...current, name }));
                  updateParty(0, { name });
                }}
                className={timeInputClassName}
              />
            </label>
            <BookingContactForm
              value={contact}
              onChange={(next) => {
                setContact(next);
                updateParty(0, { name: next.name });
              }}
            >
              <BookingInstagramField
                clientInfo={clientInfo}
                value={party[0]?.instagram ?? ""}
                onChange={(instagram) => updateParty(0, { instagram })}
              />
            </BookingContactForm>
            {party.map((member, index) => (
              <BookingClientInfoForm
                key={index}
                clientInfo={clientInfo}
                idPrefix={`party-${index}`}
                title={
                  party.length > 1
                    ? index === 0
                      ? t.partyYou
                      : format(t.partyGuest, { n: index + 1 })
                    : undefined
                }
                name={index === 0 ? undefined : member.name}
                onNameChange={
                  index === 0
                    ? undefined
                    : (name) => updateParty(index, { name })
                }
                instagram={index === 0 ? undefined : member.instagram}
                onInstagramChange={
                  index === 0
                    ? undefined
                    : (instagram) => updateParty(index, { instagram })
                }
                answers={member.answers}
                onAnswersChange={(answers) => updateParty(index, { answers })}
                moodboard={member.moodboard}
                onMoodboardChange={(moodboard) => updateParty(index, { moodboard })}
                existingMoodboard={member.existingMoodboard}
                onExistingMoodboardChange={(existingMoodboard) =>
                  updateParty(index, { existingMoodboard })
                }
              />
            ))}
            {contextError ? (
              <p className="text-sm text-destructive">{contextError}</p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={saving || !context}
              onClick={() => void saveDetails()}
            >
              {saving ? t.savingDetails : t.saveDetails}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={dateOpen} onOpenChange={setDateOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t.changeDateTitle}</SheetTitle>
            <SheetDescription>{t.changeDateHint}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-6 pb-6">
            {sameDay ? (
              <SessionCalendar
                locale={dateFnsLocale}
                selected={drafts[0]?.date}
                endMonth={endMonth}
                disabled={(date) =>
                  isDateUnavailable(date, {
                    timeSlots,
                    booked: context?.booked_slots ?? [],
                    blockedKeys,
                    bookingUntil,
                    drafts,
                    index: 0,
                    customEvent,
                  })
                }
                onSelect={(date) => setSessionDate(0, date)}
              />
            ) : null}
            {drafts.map((session, index) => {
              const others = drafts.filter((_, other) => other !== index);
              return (
                <div key={session.clientKey} className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground">{session.name}</p>
                  {sameDay ? null : (
                    <SessionCalendar
                      locale={dateFnsLocale}
                      selected={session.date}
                      endMonth={endMonth}
                      disabled={(date) =>
                        isDateUnavailable(date, {
                          timeSlots,
                          booked: context?.booked_slots ?? [],
                          blockedKeys,
                          bookingUntil,
                          drafts,
                          index,
                          customEvent,
                        }) ||
                        (booking.dayMode === "different_day" &&
                          !isDateAllowedForEvent(
                            "different_day",
                            date,
                            others.flatMap((item) => (item.date ? [item.date] : []))
                          ))
                      }
                      onSelect={(date) => setSessionDate(index, date)}
                    />
                  )}
                  {customEvent ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium">{t.customStartTime}</span>
                        <input
                          type="time"
                          value={session.slot?.startTime ?? ""}
                          onChange={(event) =>
                            setSessionSlot(index, {
                              startTime: event.target.value,
                              endTime: session.slot?.endTime ?? "",
                            })
                          }
                          className={timeInputClassName}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium">{t.customEndTime}</span>
                        <input
                          type="time"
                          value={session.slot?.endTime ?? ""}
                          onChange={(event) =>
                            setSessionSlot(index, {
                              startTime: session.slot?.startTime ?? "",
                              endTime: event.target.value,
                            })
                          }
                          className={timeInputClassName}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => {
                        const taken = isSlotTaken(
                          session.date,
                          slot,
                          context?.booked_slots ?? [],
                          others.flatMap((item) =>
                            item.date && item.slot
                              ? [{ date: item.date, time_slot: item.slot }]
                              : []
                          )
                        );
                        const selected =
                          session.slot?.startTime === slot.startTime &&
                          session.slot?.endTime === slot.endTime;
                        return (
                          <Button
                            key={`${slot.startTime}-${slot.endTime}`}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            disabled={!session.date || taken}
                            className={cn(
                              "h-8",
                              selected &&
                                "bg-rose-800 text-white hover:bg-rose-800/90"
                            )}
                            onClick={() => setSessionSlot(index, selected ? null : slot)}
                          >
                            {slot.startTime}–{slot.endTime}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{t.readyByLabel}</span>
                    <input
                      type="time"
                      value={session.readyBy}
                      onChange={(event) => setReadyBy(index, event.target.value)}
                      className={timeInputClassName}
                    />
                  </label>
                </div>
              );
            })}
            {preview ? (
              <div className="flex flex-col gap-1 text-sm text-foreground">
                {preview.totalRm === preview.previousTotalRm ? (
                  <p>
                    {format(t.dateChangeUnchanged, {
                      total: formatRm(preview.totalRm),
                    })}
                  </p>
                ) : (
                  <p>
                    {format(t.newTotalIs, {
                      total: formatRm(preview.totalRm),
                      previous: formatRm(preview.previousTotalRm),
                    })}
                  </p>
                )}
                {preview.dueRm > 0 ? (
                  <p>
                    {format(t.dateChangeDue, {
                      paid: formatRm(preview.collectedRm),
                      due: formatRm(preview.dueRm),
                    })}
                  </p>
                ) : null}
                {preview.retainedRm > 0 ? (
                  <p>
                    {format(t.dateChangeKept, {
                      paid: formatRm(preview.collectedRm),
                      kept: formatRm(preview.retainedRm),
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}
            {contextError ? (
              <p className="text-sm text-destructive">{contextError}</p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {preview ? (
              <Button
                type="button"
                className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
                disabled={saving}
                onClick={() => void reviewOrSaveDate(true)}
              >
                {saving ? t.savingDate : t.confirmDateChange}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
                disabled={saving || !context}
                onClick={() => void reviewOrSaveDate(false)}
              >
                {saving ? t.checkingNewTotal : t.reviewNewTotal}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.cancelBookingTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {paid
                ? format(t.cancelBookingPaid, { name: stylistName })
                : t.cancelBookingUnpaid}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t.keepBooking}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void cancelBooking();
              }}
            >
              {saving ? t.cancellingBooking : t.confirmCancel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionCalendar({
  locale,
  selected,
  endMonth,
  disabled,
  onSelect,
}: {
  locale: ReturnType<typeof useLocale>["dateFnsLocale"];
  selected?: Date;
  endMonth: Date;
  disabled: (date: Date) => boolean;
  onSelect: (date: Date | undefined) => void;
}) {
  return (
    <Calendar
      mode="single"
      locale={locale}
      selected={selected}
      onSelect={onSelect}
      disabled={[{ before: new Date() }, disabled]}
      endMonth={endMonth}
      captionLayout="dropdown"
      className="mx-auto p-0 [--cell-size:--spacing(10)] [&_button[data-selected-single=true]]:bg-rose-800 [&_button[data-selected-single=true]]:text-white"
    />
  );
}

function isDateUnavailable(
  date: Date,
  input: {
    timeSlots: TimeSlot[];
    booked: PublicBookedSlot[];
    blockedKeys: Set<string>;
    bookingUntil: string;
    drafts: SessionDraft[];
    index: number;
    customEvent: boolean;
  }
) {
  if (isDateBlocked(date, input.blockedKeys)) return true;
  if (isPastBookingWindow(date, input.bookingUntil)) return true;
  if (input.customEvent || input.timeSlots.length === 0) return false;
  const others = input.drafts.flatMap((session, index) =>
    index !== input.index && session.date && session.slot
      ? [{ date: session.date, time_slot: session.slot }]
      : []
  );
  return input.timeSlots.every((slot) =>
    isSlotTaken(date, slot, input.booked, others)
  );
}
