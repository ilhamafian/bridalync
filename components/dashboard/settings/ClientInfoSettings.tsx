"use client";

import { useState } from "react";
import {
  IconAsterisk,
  IconBrandInstagram,
  IconEyeOff,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CLIENT_QUESTION_OPTION_MAX_LENGTH,
  CLIENT_QUESTION_TITLE_MAX_LENGTH,
  MAX_CLIENT_QUESTION_OPTIONS,
  MAX_CLIENT_QUESTIONS,
  MAX_MOODBOARD_IMAGES,
  type ClientInfoSetting,
  type ClientQuestion,
  type InstagramRequirement,
} from "@/schemas/clientInfoSchema";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const INSTAGRAM_CHOICES: {
  value: InstagramRequirement;
  title: string;
  description: string;
  icon: typeof IconEyeOff;
}[] = [
  {
    value: "off",
    title: "Don't ask",
    description: "Clients won't see an Instagram field.",
    icon: IconEyeOff,
  },
  {
    value: "optional",
    title: "Optional",
    description: "Clients can leave it blank.",
    icon: IconBrandInstagram,
  },
  {
    value: "required",
    title: "Mandatory",
    description: "Clients must enter their username to continue.",
    icon: IconAsterisk,
  },
];

function newQuestion(): ClientQuestion {
  return { id: crypto.randomUUID(), title: "", options: [], required: true };
}

export function ClientInfoSettings({
  initialClientInfo,
}: {
  initialClientInfo: ClientInfoSetting;
}) {
  const [instagram, setInstagram] = useState<InstagramRequirement>(
    initialClientInfo.instagram ?? "off"
  );
  const [moodboard, setMoodboard] = useState(initialClientInfo.moodboard ?? false);
  const [questions, setQuestions] = useState<ClientQuestion[]>(
    initialClientInfo.questions ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateQuestion(id: string, patch: Partial<ClientQuestion>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question
      )
    );
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    const cleaned = questions.map((question) => ({
      ...question,
      title: question.title.trim(),
      options: [
        ...new Set(question.options.map((option) => option.trim()).filter(Boolean)),
      ],
    }));
    if (cleaned.some((question) => !question.title)) {
      setError("Give every request a title, or remove it.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_info: { instagram, moodboard, questions: cleaned },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Failed to save."
        );
        return;
      }
      setQuestions(cleaned);
      setSuccess("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Instagram username">
        <RadioGroup
          value={instagram}
          onValueChange={(value) => setInstagram(value as InstagramRequirement)}
          className={settingsListClassName}
        >
          {INSTAGRAM_CHOICES.map((choice) => (
            <label
              key={choice.value}
              className={cn(settingsRowClassName, "cursor-pointer")}
            >
              <IconBadge icon={choice.icon} />
              <RowText title={choice.title} description={choice.description} />
              <RadioGroupItem value={choice.value} aria-label={choice.title} />
            </label>
          ))}
        </RadioGroup>
      </SettingsSection>

      <SettingsSection title="Moodboard">
        <div className={settingsListClassName}>
          <label className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={IconPhoto} />
            <RowText
              title="Moodboard upload"
              description={`Clients can attach up to ${MAX_MOODBOARD_IMAGES} inspiration photos or PDFs.`}
            />
            <Switch checked={moodboard} onCheckedChange={setMoodboard} />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Request info"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={questions.length >= MAX_CLIENT_QUESTIONS}
            onClick={() => setQuestions((current) => [...current, newQuestion()])}
          >
            <IconPlus />
            Add
          </Button>
        }
      >
        {questions.length === 0 ? (
          <div className={settingsCardClassName}>
            <p className="text-muted-foreground">
              Ask clients for anything else you need, like skin type or hijab
              length. Add options for clients to pick from, or leave them out
              so clients type an answer.
            </p>
          </div>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className={settingsCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Request {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-my-1 -mr-2"
                  aria-label="Remove request"
                  onClick={() =>
                    setQuestions((current) =>
                      current.filter((item) => item.id !== question.id)
                    )
                  }
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`question-${question.id}`}>Title</Label>
                <Input
                  id={`question-${question.id}`}
                  className={inputClassName}
                  placeholder="e.g. Skin type"
                  maxLength={CLIENT_QUESTION_TITLE_MAX_LENGTH}
                  value={question.title}
                  onChange={(event) =>
                    updateQuestion(question.id, { title: event.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Options</Label>
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <Input
                      className={inputClassName}
                      placeholder={`Option ${optionIndex + 1}`}
                      maxLength={CLIENT_QUESTION_OPTION_MAX_LENGTH}
                      value={option}
                      aria-label={`Option ${optionIndex + 1}`}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          options: question.options.map((item, i) =>
                            i === optionIndex ? event.target.value : item
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label={`Remove option ${optionIndex + 1}`}
                      onClick={() =>
                        updateQuestion(question.id, {
                          options: question.options.filter(
                            (_, i) => i !== optionIndex
                          ),
                        })
                      }
                    >
                      <IconX className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={question.options.length >= MAX_CLIENT_QUESTION_OPTIONS}
                  onClick={() =>
                    updateQuestion(question.id, {
                      options: [...question.options, ""],
                    })
                  }
                >
                  <IconPlus />
                  Add option
                </Button>
                <p className="text-xs text-muted-foreground">
                  {question.options.length === 0
                    ? "No options: clients type their answer."
                    : "Clients pick one option."}
                </p>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <RowText
                  title="Required"
                  description="Clients must answer before continuing."
                />
                <Switch
                  checked={question.required}
                  onCheckedChange={(required) =>
                    updateQuestion(question.id, { required })
                  }
                />
              </label>
            </div>
          ))
        )}
      </SettingsSection>

      <SettingsFeedback error={error} success={success} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={() => void handleSave()}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
