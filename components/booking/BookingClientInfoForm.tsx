"use client";

import { useRef, useState } from "react";
import { FileTextIcon, ImagePlusIcon, XIcon } from "lucide-react";

import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CLIENT_ANSWER_MAX_LENGTH,
  MAX_MOODBOARD_IMAGES,
  type ClientInfoSetting,
} from "@/schemas/clientInfoSchema";
import {
  getClientQuestions,
  getInstagramRequirement,
  isValidInstagramUsername,
  MOODBOARD_PDF_TYPE,
  normalizeInstagramUsername,
} from "@/utils/booking/clientInfo";
import { compressImageFile } from "@/utils/image/compressClient";
import {
  UPLOAD_IMAGE_ALLOWED_TYPES,
  UPLOAD_IMAGE_MAX_BYTES,
} from "@/utils/image/constants";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-input bg-input/20 px-3 text-xs/relaxed text-foreground transition-colors",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "dark:bg-input/30"
);

/** Moodboard / questions (Instagram may sit here or in the contact card). */
function hasClientInfoFields(clientInfo: ClientInfoSetting | undefined) {
  return (
    Boolean(clientInfo?.moodboard) || getClientQuestions(clientInfo).length > 0
  );
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  const { t } = useLocale();
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
      {optional ? (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          ({t.optionalLabel})
        </span>
      ) : null}
    </label>
  );
}

export type MoodboardPhoto = { file: File; previewUrl: string };

function MoodboardPicker({
  photos,
  onChange,
}: {
  photos: MoodboardPhoto[];
  onChange: (photos: MoodboardPhoto[]) => void;
}) {
  const { t, format } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(selected: FileList | null) {
    if (!selected) return;
    const all = Array.from(selected);
    const oversizedPdf = all.some(
      (file) => file.type === MOODBOARD_PDF_TYPE && file.size > UPLOAD_IMAGE_MAX_BYTES
    );
    setError(
      oversizedPdf
        ? format(t.moodboardPdfTooLarge, {
            size: UPLOAD_IMAGE_MAX_BYTES / (1024 * 1024),
          })
        : null
    );
    const accepted = all
      .filter(
        (file) =>
          UPLOAD_IMAGE_ALLOWED_TYPES.has(file.type) ||
          (file.type === MOODBOARD_PDF_TYPE && file.size <= UPLOAD_IMAGE_MAX_BYTES)
      )
      .slice(0, MAX_MOODBOARD_IMAGES - photos.length);
    if (accepted.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setPreparing(true);
    try {
      const compressed = await Promise.all(
        accepted.map((file) =>
          file.type === MOODBOARD_PDF_TYPE
            ? file
            : compressImageFile(file).catch(() => file)
        )
      );
      onChange([
        ...photos,
        ...compressed.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    } finally {
      setPreparing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove(index: number) {
    URL.revokeObjectURL(photos[index].previewUrl);
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div
              key={photo.previewUrl}
              className="relative aspect-square overflow-hidden rounded-md bg-white/40 dark:bg-white/10"
            >
              {photo.file.type === MOODBOARD_PDF_TYPE ? (
                <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
                  <FileTextIcon className="size-6 text-rose-900 dark:text-rose-400" />
                  <span className="line-clamp-2 text-[10px] break-all text-muted-foreground">
                    {photo.file.name}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.previewUrl} alt="" className="size-full object-cover" />
              )}
              <button
                type="button"
                aria-label={format(t.removePhoto, { index: index + 1 })}
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {photos.length < MAX_MOODBOARD_IMAGES ? (
        <Button
          type="button"
          variant="outline"
          className="self-start bg-white/40 dark:bg-white/10"
          disabled={preparing}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlusIcon />
          {t.addFiles}
        </Button>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={[...UPLOAD_IMAGE_ALLOWED_TYPES, MOODBOARD_PDF_TYPE].join(",")}
        multiple
        className="hidden"
        onChange={(event) => void handleSelect(event.target.files)}
      />
    </div>
  );
}

/** Instagram username, rendered inside a contact or party-member card. */
export function BookingInstagramField({
  clientInfo,
  value,
  onChange,
  id = "client-instagram",
}: {
  clientInfo: ClientInfoSetting | undefined;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const { t } = useLocale();
  const requirement = getInstagramRequirement(clientInfo);
  const username = normalizeInstagramUsername(value);
  const invalid = username.length > 0 && !isValidInstagramUsername(username);

  if (requirement === "off") return null;

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} optional={requirement === "optional"}>
        {t.instagramUsername}
      </FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
          @
        </span>
        <input
          id={id}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t.instagramPlaceholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          className={cn(inputClassName, "pl-7")}
        />
      </div>
      {invalid ? (
        <p className="text-xs text-destructive">{t.invalidInstagram}</p>
      ) : null}
    </div>
  );
}

export function BookingClientInfoForm({
  clientInfo,
  answers,
  onAnswersChange,
  moodboard,
  onMoodboardChange,
  title,
  name,
  onNameChange,
  nameLabel,
  namePlaceholder,
  instagram,
  onInstagramChange,
  idPrefix = "client",
}: {
  clientInfo: ClientInfoSetting | undefined;
  answers: Record<string, string>;
  onAnswersChange: (answers: Record<string, string>) => void;
  moodboard: MoodboardPhoto[];
  onMoodboardChange: (photos: MoodboardPhoto[]) => void;
  /** Optional card heading (e.g. "You" / "Guest 2"). */
  title?: string;
  name?: string;
  onNameChange?: (name: string) => void;
  nameLabel?: string;
  namePlaceholder?: string;
  /** When set with `onInstagramChange`, Instagram is shown in this card. */
  instagram?: string;
  onInstagramChange?: (value: string) => void;
  idPrefix?: string;
}) {
  const { t, format } = useLocale();
  const questions = getClientQuestions(clientInfo);
  const showName = onNameChange !== undefined;
  const showInstagram = onInstagramChange !== undefined;
  const showInfoFields = hasClientInfoFields(clientInfo);

  if (!showName && !showInstagram && !showInfoFields) return null;

  function setAnswer(questionId: string, answer: string) {
    onAnswersChange({ ...answers, [questionId]: answer });
  }

  return (
    <Card className="mx-auto w-full min-w-72 bg-white/30 shadow-sm ring-white/60 backdrop-blur-sm [--card-spacing:--spacing(6)] sm:min-w-80 dark:bg-white/10 dark:ring-white/15">
      <CardContent className="flex flex-col gap-4">
        {title ? (
          <p className="text-sm font-medium text-foreground">{title}</p>
        ) : null}

        {showName ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {nameLabel ?? t.reviewName}
            </span>
            <input
              type="text"
              autoComplete="name"
              placeholder={namePlaceholder ?? t.namePlaceholder}
              value={name ?? ""}
              onChange={(event) => onNameChange?.(event.target.value)}
              className={inputClassName}
            />
          </label>
        ) : null}

        {showInstagram ? (
          <BookingInstagramField
            clientInfo={clientInfo}
            value={instagram ?? ""}
            onChange={onInstagramChange!}
            id={`${idPrefix}-instagram`}
          />
        ) : null}

        {questions.map((question) => {
          const answer = answers[question.id] ?? "";
          return (
            <div key={question.id} className="flex flex-col gap-1.5">
              <FieldLabel
                htmlFor={
                  question.options.length === 0
                    ? `${idPrefix}-question-${question.id}`
                    : undefined
                }
                optional={!question.required}
              >
                {question.title}
              </FieldLabel>
              {question.options.length === 0 ? (
                <textarea
                  id={`${idPrefix}-question-${question.id}`}
                  rows={2}
                  maxLength={CLIENT_ANSWER_MAX_LENGTH}
                  placeholder={t.typeYourAnswer}
                  value={answer}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  className={cn(inputClassName, "h-auto min-h-16 py-2")}
                />
              ) : (
                <div
                  role="radiogroup"
                  aria-label={question.title}
                  className="flex flex-wrap gap-2"
                >
                  {question.options.map((option) => {
                    const selected = answer === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setAnswer(question.id, selected ? "" : option)
                        }
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "bg-rose-800 text-white shadow-sm"
                            : "bg-white/40 ring-1 ring-white/60 hover:bg-white/55 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {clientInfo?.moodboard ? (
          <div className="flex flex-col gap-1.5">
            <FieldLabel optional>{t.moodboard}</FieldLabel>
            <p className="text-xs text-muted-foreground">
              {format(t.moodboardHelper, { max: MAX_MOODBOARD_IMAGES })}
            </p>
            <MoodboardPicker photos={moodboard} onChange={onMoodboardChange} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
