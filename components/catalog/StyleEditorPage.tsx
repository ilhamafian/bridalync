"use client";

import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { DepositField, parseDepositInput } from "@/components/catalog/DepositField";
import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { toStyleItem, type StyleItem } from "@/components/PackagesManager";
import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariantImageUpload } from "@/components/VariantImageUpload";
import { cn } from "@/lib/utils";
import type { DepositType } from "@/schemas/packageSchema";
import { EVENTS_SETTINGS_HREF } from "@/utils/dashboardShell";
import type { StyleTerms } from "@/utils/styleTerms";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

type VariantRow = {
  id: string;
  name: string;
  price: string;
  deposit: string;
  depositType: DepositType;
  image_urls: string[];
};

function createRowId() {
  return crypto.randomUUID();
}

function emptyVariant(): VariantRow {
  return {
    id: createRowId(),
    name: "",
    price: "",
    deposit: "",
    depositType: "fixed",
    image_urls: [],
  };
}

function toRows(style: StyleItem | null): VariantRow[] {
  if (!style || style.variants.length === 0) return [emptyVariant()];
  return style.variants.map((variant) => ({
    id: createRowId(),
    name: variant.name,
    price: variant.price.toString(),
    deposit: variant.deposit.toString(),
    depositType: variant.deposit_type ?? "fixed",
    image_urls: variant.image_urls,
  }));
}

/** Add (`style` null) or edit a style category on its own page; remount with a new `key` to reset. */
export function StyleEditorPage({
  style,
  notFound,
  nextOrder,
  chargeBy,
  styleTerms,
  onSaved,
}: {
  style: StyleItem | null;
  /** Editing an id that doesn't exist. */
  notFound: boolean;
  nextOrder: number;
  chargeBy: "package" | "style";
  styleTerms: StyleTerms;
  onSaved: (saved: StyleItem) => void;
}) {
  const [name, setName] = useState(style?.name ?? "");
  const [variants, setVariants] = useState(() => toRows(style));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <BackButton fallbackHref={EVENTS_SETTINGS_HREF} />
        <EmptyCard>{styleTerms.One} not found.</EmptyCard>
      </div>
    );
  }

  function updateVariant(id: string, patch: Partial<VariantRow>) {
    setVariants((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError(`${styleTerms.One} name is required.`);
      return;
    }

    const named = variants.filter((variant) => variant.name.trim().length > 0);
    if (named.length === 0) {
      setError("Add at least one variant.");
      return;
    }

    const payloadVariants = [];
    for (const [index, variant] of named.entries()) {
      const price = Number(variant.price || 0);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Enter a valid price for ${variant.name.trim()}.`);
        return;
      }
      const deposit = parseDepositInput(variant.deposit, variant.depositType);
      if (deposit === null) {
        setError(
          variant.depositType === "percent"
            ? `Enter a deposit between 0% and 100% for ${variant.name.trim()}.`
            : `Enter a valid deposit for ${variant.name.trim()}.`
        );
        return;
      }
      payloadVariants.push({
        name: variant.name.trim(),
        order: index,
        price,
        deposit: deposit ?? 0,
        deposit_type: variant.depositType,
        ...(styleTerms.kind === "look"
          ? { image_urls: variant.image_urls }
          : { image_url: variant.image_urls[0] }),
      });
    }

    const payload = {
      name: name.trim(),
      order: style?.order ?? nextOrder,
      variants: payloadVariants,
    };

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        style ? `${styleTerms.apiPath}/${style._id}` : styleTerms.apiPath,
        {
          method: style ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(`Could not save ${styleTerms.one}.`);
        return;
      }
      onSaved(toStyleItem(data[styleTerms.kind]));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton fallbackHref={EVENTS_SETTINGS_HREF} />
      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {style ? `Edit ${styleTerms.one}` : `New ${styleTerms.one}`}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A {styleTerms.one} category and the variants clients pick from.
        </p>
      </section>

      <SettingsSection title="Details">
        <div className={settingsCardClassName}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="style-name">Category name</Label>
            <Input
              id="style-name"
              className={inputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="SHAWL"
            />
          </div>
          {chargeBy === "package" ? (
            <p className="text-xs text-muted-foreground">
              You charge by event, so prices are set on your events.
            </p>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Variants"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((current) => [...current, emptyVariant()])}
          >
            <IconPlus />
            Add variant
          </Button>
        }
      >
        <SortableList
          items={variants}
          getItemId={(variant) => variant.id}
          onReorder={setVariants}
          className="gap-3"
          handleClassName="mt-4"
          renderItem={(variant, index) => (
            <div className={cn(glassCardClassName, "flex flex-col gap-4 p-4 text-sm")}>
              <div className="flex items-center gap-2">
                <Input
                  className={inputClassName}
                  value={variant.name}
                  onChange={(event) =>
                    updateVariant(variant.id, { name: event.target.value })
                  }
                  placeholder="Variant name"
                  aria-label={`Variant ${index + 1} name`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={variants.length === 1}
                  onClick={() =>
                    setVariants((current) =>
                      current.filter((item) => item.id !== variant.id)
                    )
                  }
                  aria-label={`Remove variant ${index + 1}`}
                >
                  <IconTrash />
                </Button>
              </div>

              {chargeBy === "style" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label>Price (RM)</Label>
                    <Input
                      className={inputClassName}
                      type="number"
                      min="0"
                      step="1"
                      value={variant.price}
                      onChange={(event) =>
                        updateVariant(variant.id, { price: event.target.value })
                      }
                      placeholder="200"
                    />
                  </div>
                  <DepositField
                    value={variant.deposit}
                    type={variant.depositType}
                    inputClassName={inputClassName}
                    onValueChange={(deposit) =>
                      updateVariant(variant.id, { deposit })
                    }
                    onTypeChange={(depositType) =>
                      updateVariant(variant.id, { depositType })
                    }
                  />
                </>
              ) : null}

              <VariantImageUpload
                value={variant.image_urls}
                max={styleTerms.maxImages}
                onChange={(urls) => updateVariant(variant.id, { image_urls: urls })}
                disabled={saving}
              />
            </div>
          )}
        />
      </SettingsSection>

      <SettingsFeedback error={error} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
