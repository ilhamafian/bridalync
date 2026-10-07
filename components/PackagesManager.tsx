"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconEye,
  IconEyeOff,
  IconGift,
  IconPackage,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
  type Icon,
} from "@tabler/icons-react";

import { EventEditorPage } from "@/components/catalog/EventEditorPage";
import { StyleEditorPage } from "@/components/catalog/StyleEditorPage";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  IconBadge,
  RowText,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { SortableList } from "@/components/SortableList";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  DepositType,
  PackageDayMode,
  PackageSession,
} from "@/schemas/packageSchema";
import type { RegionPrices } from "@/schemas/settingSchema";
import { getEventDayMode, getEventSessions } from "@/utils/booking/events";
import { formatDeposit, formatRm } from "@/utils/booking/pricing";
import { getRegionPriceRange } from "@/utils/booking/regions";
import type { StyleTerms } from "@/utils/styleTerms";
import {
  buildCatalogEditorHref,
  EVENTS_SETTINGS_HREF,
  getCatalogEditorTarget,
} from "@/utils/dashboardShell";

export type PackageItem = {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  deposit?: number;
  deposit_type?: DepositType;
  region_prices?: RegionPrices;
  sessions?: PackageSession[];
  day_mode?: PackageDayMode;
  order: number;
};

export type StyleItem = {
  _id: string;
  name: string;
  order: number;
  variants: {
    name: string;
    order: number;
    /** Styles have at most one; looks up to five. */
    image_urls: string[];
    price: number;
    deposit: number;
    deposit_type?: DepositType;
  }[];
};

type RawStyleVariant = Omit<StyleItem["variants"][number], "image_urls"> & {
  image_url?: string;
  image_urls?: string[];
};

/** Normalizes a `/api/styles` or `/api/looks` document. */
export function toStyleItem(
  raw: Omit<StyleItem, "variants"> & { variants: RawStyleVariant[] }
): StyleItem {
  return {
    _id: raw._id,
    name: raw.name,
    order: raw.order,
    variants: raw.variants.map(({ image_url, image_urls, ...variant }) => ({
      ...variant,
      image_urls: image_urls ?? (image_url ? [image_url] : []),
    })),
  };
}

export type AddOnItem = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  order: number;
};

type Tab = "packages" | "styles" | "addons";

type DeleteTarget = {
  type: "package" | "style" | "addon";
  id: string;
  name: string;
};

type AddOnFormState = {
  name: string;
  description: string;
  price: string;
};

function getDeleteLabel(type: DeleteTarget["type"], styleTerms: StyleTerms) {
  if (type === "package") return "event";
  if (type === "style") return styleTerms.one;
  return "add-on";
}

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function describeRegionPriceRange(prices: RegionPrices | undefined) {
  const range = getRegionPriceRange(prices);
  if (!range) return "No state prices set";
  return range.min === range.max
    ? formatRm(range.min)
    : `${formatRm(range.min)} – ${formatRm(range.max)}`;
}

function describeEventSessions(pkg: PackageItem) {
  const sessions = getEventSessions(pkg);
  if (sessions.length === 1) return sessions[0].name;
  const days =
    getEventDayMode(pkg) === "same_day" ? "Same day" : "Different days";
  return `${sessions.map((session) => session.name).join(", ")} · ${days}`;
}

function describeEventPrice(
  pkg: PackageItem,
  chargeBy: "package" | "style",
  regionPricesPerEvent: boolean,
  styleTerms: StyleTerms
) {
  if (chargeBy === "style") return `Priced by ${styleTerms.one}`;
  const price = regionPricesPerEvent
    ? describeRegionPriceRange(pkg.region_prices)
    : pkg.price != null
      ? formatRm(pkg.price)
      : "No price set";
  const deposit = formatDeposit(pkg.deposit, pkg.deposit_type);
  return deposit ? `${price} · ${deposit} deposit` : price;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CatalogItemCard({
  icon,
  title,
  description,
  footer,
  onEdit,
  onDelete,
  children,
}: {
  icon: Icon;
  title: string;
  description: string;
  footer?: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(glassCardClassName, "overflow-hidden")}>
      <div className="flex items-center gap-3 py-3 pr-2 pl-4">
        <IconBadge icon={icon} />
        <div className="flex min-w-0 flex-1 flex-col">
          <RowText title={title} description={description} />
          {footer ? (
            <p className="truncate text-xs text-muted-foreground">{footer}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit ${title}`}
          >
            <IconPencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Delete ${title}`}
          >
            <IconTrash />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Events & styles list. Events and styles are added/edited on their own pages
 * (`/dashboard/settings/events/(event|style)/(new|[id])`), rendered here so the
 * list state is shared; add-ons use a sheet.
 */
export function PackagesManager({
  initialPackages,
  initialStyles,
  initialAddOns,
  initialShowAddOnPrices,
  chargeBy,
  regionPricesPerEvent = false,
  styleTerms,
}: {
  initialPackages: PackageItem[];
  initialStyles: StyleItem[];
  initialAddOns: AddOnItem[];
  initialShowAddOnPrices: boolean;
  chargeBy: "package" | "style";
  /** Travel is charged by state per event: events are priced per state instead of one price. */
  regionPricesPerEvent?: boolean;
  styleTerms: StyleTerms;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const editor = getCatalogEditorTarget(pathname);
  const [tab, setTab] = useState<Tab>("packages");
  const [packages, setPackages] = useState(initialPackages);
  const [styles, setStyles] = useState(initialStyles);
  const [addOns, setAddOns] = useState(initialAddOns);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);
  const [addOnForm, setAddOnForm] = useState<AddOnFormState>({
    name: "",
    description: "",
    price: "",
  });
  const [showAddOnPrices, setShowAddOnPrices] = useState(initialShowAddOnPrices);
  const [savingShowAddOnPrices, setSavingShowAddOnPrices] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function openEditor(type: "event" | "style", id: string | null) {
    setTab(type === "event" ? "packages" : "styles");
    setError(null);
    router.push(buildCatalogEditorHref(type, id), { scroll: false });
  }

  function closeEditor() {
    router.replace(EVENTS_SETTINGS_HREF, { scroll: false });
  }

  function openAddOnSheet(addOn: AddOnItem | null) {
    setEditingAddOnId(addOn?._id ?? null);
    setAddOnForm({
      name: addOn?.name ?? "",
      description: addOn?.description ?? "",
      price: addOn ? addOn.price.toString() : "",
    });
    setError(null);
    setSheetOpen(true);
  }

  async function handleShowAddOnPricesChange(next: boolean) {
    const previous = showAddOnPrices;
    setShowAddOnPrices(next);
    setSavingShowAddOnPrices(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_add_on_prices: next }),
      });
      if (!response.ok) {
        setShowAddOnPrices(previous);
        setError("Could not update add-on price visibility.");
      }
    } catch {
      setShowAddOnPrices(previous);
      setError("Could not update add-on price visibility.");
    } finally {
      setSavingShowAddOnPrices(false);
    }
  }

  function openCreateForTab() {
    if (tab === "packages") openEditor("event", null);
    else if (tab === "styles") openEditor("style", null);
    else openAddOnSheet(null);
  }

  async function handleReorderPackages(nextPackages: PackageItem[]) {
    const previous = packages;
    const reordered = nextPackages.map((pkg, index) => ({
      ...pkg,
      order: index,
    }));

    setPackages(reordered);
    setReordering(true);
    setError(null);

    try {
      const response = await fetch("/api/packages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((pkg) => pkg._id) }),
      });

      if (!response.ok) {
        setPackages(previous);
        setError("Failed to reorder events.");
        return;
      }

      const data = await response.json();
      setPackages(data.packages as PackageItem[]);
    } finally {
      setReordering(false);
    }
  }

  async function handleReorderStyles(nextStyles: StyleItem[]) {
    const previous = styles;
    const reordered = nextStyles.map((style, index) => ({
      ...style,
      order: index,
    }));

    setStyles(reordered);
    setReordering(true);
    setError(null);

    try {
      const response = await fetch(`${styleTerms.apiPath}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((style) => style._id) }),
      });

      if (!response.ok) {
        setStyles(previous);
        setError(`Failed to reorder ${styleTerms.many}.`);
        return;
      }

      const data = await response.json();
      setStyles(
        (data[`${styleTerms.kind}s`] as Parameters<typeof toStyleItem>[0][]).map(
          toStyleItem
        )
      );
    } finally {
      setReordering(false);
    }
  }

  async function handleReorderAddOns(nextAddOns: AddOnItem[]) {
    const previous = addOns;
    const reordered = nextAddOns.map((addOn, index) => ({
      ...addOn,
      order: index,
    }));

    setAddOns(reordered);
    setReordering(true);
    setError(null);

    try {
      const response = await fetch("/api/add-ons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((addOn) => addOn._id) }),
      });

      if (!response.ok) {
        setAddOns(previous);
        setError("Failed to reorder add-ons.");
        return;
      }

      const data = await response.json();
      setAddOns(data.addOns as AddOnItem[]);
    } finally {
      setReordering(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const endpoint = {
      package: `/api/packages/${deleteTarget.id}`,
      style: `${styleTerms.apiPath}/${deleteTarget.id}`,
      addon: `/api/add-ons/${deleteTarget.id}`,
    }[deleteTarget.type];

    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      setError(`Failed to delete ${getDeleteLabel(deleteTarget.type, styleTerms)}.`);
      setDeleteTarget(null);
      return;
    }

    if (deleteTarget.type === "package") {
      setPackages((current) =>
        current.filter((pkg) => pkg._id !== deleteTarget.id)
      );
      router.refresh();
    } else if (deleteTarget.type === "style") {
      setStyles((current) =>
        current.filter((style) => style._id !== deleteTarget.id)
      );
    } else {
      setAddOns((current) =>
        current.filter((addOn) => addOn._id !== deleteTarget.id)
      );
    }

    setDeleteTarget(null);
  }

  function handlePackageSaved(saved: PackageItem) {
    setPackages((current) => {
      const exists = current.some((pkg) => pkg._id === saved._id);
      const next = exists
        ? current.map((pkg) => (pkg._id === saved._id ? saved : pkg))
        : [...current, saved];
      return next.sort((a, b) => a.order - b.order);
    });
    closeEditor();
    router.refresh();
  }

  function handleStyleSaved(saved: StyleItem) {
    setStyles((current) => {
      const exists = current.some((style) => style._id === saved._id);
      const next = exists
        ? current.map((style) => (style._id === saved._id ? saved : style))
        : [...current, saved];
      return next.sort((a, b) => a.order - b.order);
    });
    closeEditor();
    router.refresh();
  }

  async function handleSaveAddOn() {
    if (!addOnForm.name.trim()) {
      setError("Add-on name is required.");
      return;
    }

    const price = parseOptionalNumber(addOnForm.price);
    if (price === undefined || price < 0) {
      setError("Enter a valid price.");
      return;
    }

    const payload = {
      name: addOnForm.name.trim(),
      description: addOnForm.description.trim(),
      price,
      order: editingAddOnId
        ? addOns.find((addOn) => addOn._id === editingAddOnId)?.order ?? addOns.length
        : addOns.length,
    };

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingAddOnId ? `/api/add-ons/${editingAddOnId}` : "/api/add-ons",
        {
          method: editingAddOnId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError("Could not save add-on.");
        return;
      }

      const saved = data.addOn as AddOnItem;
      setAddOns((current) => {
        if (editingAddOnId) {
          return current
            .map((addOn) => (addOn._id === saved._id ? saved : addOn))
            .sort((a, b) => a.order - b.order);
        }
        return [...current, saved].sort((a, b) => a.order - b.order);
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (editor?.type === "event") {
    const pkg = editor.id
      ? (packages.find((item) => item._id === editor.id) ?? null)
      : null;
    return (
      <EventEditorPage
        key={editor.id ?? "new"}
        pkg={pkg}
        notFound={editor.id !== null && !pkg}
        nextOrder={packages.length}
        chargeBy={chargeBy}
        regionPricesPerEvent={regionPricesPerEvent}
        styleTerms={styleTerms}
        onSaved={handlePackageSaved}
      />
    );
  }

  if (editor?.type === "style") {
    const style = editor.id
      ? (styles.find((item) => item._id === editor.id) ?? null)
      : null;
    return (
      <StyleEditorPage
        key={editor.id ?? "new"}
        style={style}
        notFound={editor.id !== null && !style}
        nextOrder={styles.length}
        chargeBy={chargeBy}
        styleTerms={styleTerms}
        onSaved={handleStyleSaved}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Events & {styleTerms.many}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder. Manage what clients can book from your profile.
          </p>
        </section>
        <Button
          size="icon"
          className="size-10 shrink-0 rounded-full"
          onClick={openCreateForTab}
          aria-label={
            tab === "packages"
              ? "Add event"
              : tab === "styles"
                ? `Add ${styleTerms.one}`
                : "Add add-on"
          }
        >
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="gap-3"
      >
        <TabsList className="grid h-10! w-full grid-cols-3 bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15">
          <TabsTrigger value="packages" className="text-sm">
            Events
          </TabsTrigger>
          <TabsTrigger value="styles" className="text-sm">
            {styleTerms.Many}
          </TabsTrigger>
          <TabsTrigger value="addons" className="text-sm">
            Add-ons
          </TabsTrigger>
        </TabsList>

        {error && !sheetOpen ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <TabsContent value="packages" className="mt-0">
          {packages.length === 0 ? (
            <EmptyCard>No events yet. Tap + to add your first event.</EmptyCard>
          ) : (
            <SortableList
              items={packages}
              getItemId={(pkg) => pkg._id}
              onReorder={handleReorderPackages}
              disabled={reordering}
              handleClassName="mt-4"
              renderItem={(pkg) => (
                <CatalogItemCard
                  icon={IconPackage}
                  title={pkg.name}
                  description={describeEventPrice(
                    pkg,
                    chargeBy,
                    regionPricesPerEvent,
                    styleTerms
                  )}
                  footer={describeEventSessions(pkg)}
                  onEdit={() => openEditor("event", pkg._id)}
                  onDelete={() =>
                    setDeleteTarget({
                      type: "package",
                      id: pkg._id,
                      name: pkg.name,
                    })
                  }
                />
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="styles" className="mt-0">
          {styles.length === 0 ? (
            <EmptyCard>
              No {styleTerms.many} yet. Tap + to add your first{" "}
              {styleTerms.one} category.
            </EmptyCard>
          ) : (
            <SortableList
              items={styles}
              getItemId={(style) => style._id}
              onReorder={handleReorderStyles}
              disabled={reordering}
              handleClassName="mt-4"
              renderItem={(style) => (
                <CatalogItemCard
                  icon={IconSparkles}
                  title={style.name}
                  description={`${style.variants.length} variant${
                    style.variants.length === 1 ? "" : "s"
                  }`}
                  onEdit={() => openEditor("style", style._id)}
                  onDelete={() =>
                    setDeleteTarget({
                      type: "style",
                      id: style._id,
                      name: style.name,
                    })
                  }
                >
                  {style.variants.length > 0 ? (
                    <ul className="divide-y divide-white/50 border-t border-white/50 dark:divide-white/10 dark:border-white/10">
                      {style.variants.map((variant) => (
                        <li
                          key={`${style._id}-${variant.order}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {variant.image_urls[0] ? (
                              <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-white/50 dark:bg-white/10">
                                <Image
                                  src={variant.image_urls[0]}
                                  alt={variant.name}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </span>
                            ) : null}
                            <span className="truncate">{variant.name}</span>
                          </span>
                          {chargeBy === "style" ? (
                            <span className="flex shrink-0 flex-col items-end">
                              <span className="font-medium tabular-nums">
                                {formatRm(variant.price)}
                              </span>
                              {variant.deposit > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDeposit(
                                    variant.deposit,
                                    variant.deposit_type
                                  )}{" "}
                                  deposit
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CatalogItemCard>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="addons" className="mt-0 flex flex-col gap-3">
          <SettingsSection title="Add-on prices">
            <RadioGroup
              value={showAddOnPrices ? "show" : "hide"}
              onValueChange={(value) =>
                handleShowAddOnPricesChange(value === "show")
              }
              disabled={savingShowAddOnPrices}
              className={settingsListClassName}
            >
              <label className={cn(settingsRowClassName, "cursor-pointer")}>
                <IconBadge icon={IconEye} />
                <RowText
                  title="Show prices"
                  description="Clients see each add-on's price when picking"
                />
                <RadioGroupItem value="show" aria-label="Show prices" />
              </label>
              <label className={cn(settingsRowClassName, "cursor-pointer")}>
                <IconBadge icon={IconEyeOff} />
                <RowText
                  title="Hide prices"
                  description="Clients only see the add-on name and description"
                />
                <RadioGroupItem value="hide" aria-label="Hide prices" />
              </label>
            </RadioGroup>
          </SettingsSection>

          {addOns.length === 0 ? (
            <EmptyCard>
              No add-ons yet. Tap + to offer extras like accessories or
              touch-ups. Clients skip this step when there are none.
            </EmptyCard>
          ) : (
            <SortableList
              items={addOns}
              getItemId={(addOn) => addOn._id}
              onReorder={handleReorderAddOns}
              disabled={reordering || sheetOpen}
              handleClassName="mt-4"
              renderItem={(addOn) => (
                <CatalogItemCard
                  icon={IconGift}
                  title={addOn.name}
                  description={`+${formatRm(addOn.price)}`}
                  footer={addOn.description}
                  onEdit={() => openAddOnSheet(addOn)}
                  onDelete={() =>
                    setDeleteTarget({
                      type: "addon",
                      id: addOn._id,
                      name: addOn.name,
                    })
                  }
                />
              )}
            />
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" contained className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editingAddOnId ? "Edit add-on" : "New add-on"}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-6">
            <Field label="Name">
              <Input
                className={inputClassName}
                value={addOnForm.name}
                onChange={(event) =>
                  setAddOnForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Jahit Accessories Baju"
              />
            </Field>
            <Field label="Description (optional)">
              <Textarea
                className="min-h-20 text-sm"
                maxLength={500}
                value={addOnForm.description}
                onChange={(event) =>
                  setAddOnForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What's included, how long it takes, etc."
              />
            </Field>
            <Field label="Price">
              <Input
                className={inputClassName}
                type="number"
                min="0"
                step="1"
                value={addOnForm.price}
                onChange={(event) =>
                  setAddOnForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="30"
              />
            </Field>
          </div>

          {error && sheetOpen ? (
            <p className="px-6 text-sm text-destructive">{error}</p>
          ) : null}

          <SheetFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSaveAddOn}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleteTarget ? getDeleteLabel(deleteTarget.type, styleTerms) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
