"use client";

import { FileTextIcon } from "lucide-react";

import { useLocale } from "@/components/LocaleProvider";
import { Card, CardContent } from "@/components/ui/card";
import type { MoodboardPhoto } from "@/components/booking/BookingClientInfoForm";
import { cn } from "@/lib/utils";
import type { ClientInfoSetting } from "@/schemas/clientInfoSchema";
import type { Client } from "@/schemas/clientSchema";
import type { SessionForm } from "@/schemas/sessionSchema";
import {
  getClientQuestions,
  getInstagramRequirement,
  MOODBOARD_PDF_TYPE,
  normalizeInstagramUsername,
} from "@/utils/booking/clientInfo";
import { formatLocationAddress } from "@/utils/session";

function Field({
  label,
  value,
  wide = false,
  clamp = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  clamp?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-[11px] leading-4 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm leading-5 break-words text-foreground",
          clamp && "line-clamp-2"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-white/40 pt-3 first:border-t-0 first:pt-0 dark:border-white/15">
      <p className="mb-1.5 text-sm font-medium text-foreground">{title}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</dl>
    </div>
  );
}

export function BookingReviewDetails({
  eventName,
  sessions,
  styleBySessionKey,
  styleLabel,
  addOnNames,
  contact,
  clientInfo,
  instagram,
  answers,
  moodboard,
}: {
  eventName?: string;
  sessions: SessionForm[];
  /** Picked style/look per session `client_key`, already formatted for display. */
  styleBySessionKey: Record<string, string | undefined>;
  styleLabel: string;
  addOnNames: string[];
  contact: Client;
  clientInfo: ClientInfoSetting | undefined;
  instagram: string;
  answers: Record<string, string>;
  moodboard: MoodboardPhoto[];
}) {
  const { t, intlLocale } = useLocale();
  const sortedSessions = [...sessions].sort((a, b) => a.order - b.order);
  const instagramUsername =
    getInstagramRequirement(clientInfo) !== "off"
      ? normalizeInstagramUsername(instagram)
      : "";
  const answeredQuestions = getClientQuestions(clientInfo)
    .map((question) => ({
      id: question.id,
      title: question.title,
      answer: answers[question.id]?.trim() ?? "",
    }))
    .filter((question) => question.answer.length > 0);
  const moodboardFiles = clientInfo?.moodboard ? moodboard : [];
  const phone = contact.mobile?.trim()
    ? `${contact.country_code ?? ""} ${contact.mobile.trim()}`.trim()
    : "";

  return (
    <Card className="mx-auto w-full min-w-72 bg-white/30 shadow-sm ring-white/60 backdrop-blur-sm [--card-spacing:--spacing(4)] sm:min-w-80 dark:bg-white/10 dark:ring-white/15">
      <CardContent className="flex flex-col gap-3 pt-(--card-spacing)">
        {eventName ? (
          <p className="text-base leading-6 font-semibold text-foreground">
            {eventName}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {sortedSessions.map((session) => {
            const style = styleBySessionKey[session.client_key];
            return (
              <Block key={session.client_key} title={session.name}>
                <Field
                  label={t.reviewDate}
                  value={new Date(session.date).toLocaleDateString(intlLocale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
                <Field
                  label={t.reviewTime}
                  value={`${session.time_slot.startTime} – ${session.time_slot.endTime}`}
                />
                {session.ready_by ? (
                  <Field label={t.reviewReadyBy} value={session.ready_by} />
                ) : null}
                {style ? <Field label={styleLabel} value={style} /> : null}
                {session.location ? (
                  <Field
                    label={t.reviewLocation}
                    value={formatLocationAddress(session.location)}
                    wide
                    clamp
                  />
                ) : null}
              </Block>
            );
          })}

          {addOnNames.length > 0 ? (
            <Block title={t.reviewAddOns}>
              <dd className="col-span-2 text-sm leading-5 text-foreground">
                {addOnNames.join(", ")}
              </dd>
            </Block>
          ) : null}

          <Block title={t.reviewYourDetails}>
            <Field label={t.reviewName} value={contact.name} />
            {phone ? <Field label={t.phoneNumber} value={phone} /> : null}
            <Field label={t.email} value={contact.email} wide />
            {instagramUsername ? (
              <Field label={t.instagramUsername} value={`@${instagramUsername}`} wide />
            ) : null}
            {answeredQuestions.map((question) => (
              <Field
                key={question.id}
                label={question.title}
                value={question.answer}
                wide
              />
            ))}
            {moodboardFiles.length > 0 ? (
              <Field
                label={t.moodboard}
                wide
                value={
                  <span className="mt-1 flex gap-1.5">
                    {moodboardFiles.map((photo) => (
                      <span
                        key={photo.previewUrl}
                        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/40 dark:bg-white/10"
                      >
                        {photo.file.type === MOODBOARD_PDF_TYPE ? (
                          <FileTextIcon className="size-4 text-rose-900 dark:text-rose-400" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.previewUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        )}
                      </span>
                    ))}
                  </span>
                }
              />
            ) : null}
          </Block>
        </div>
      </CardContent>
    </Card>
  );
}
