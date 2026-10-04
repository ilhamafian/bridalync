"use client";

import Image from "next/image";
import { useState } from "react";
import {
  IconGift,
  IconPackage,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
  type Icon,
} from "@tabler/icons-react";

import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { IconBadge, RowText } from "@/components/dashboard/settings/SettingsUi";
import { SortableList } from "@/components/SortableList";
import { VariantImageUpload } from "@/components/VariantImageUpload";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatRm } from "@/utils/booking/pricing";

export type PackageItem = {
  _id: string;
  name: string;
  price?: number;
  deposit?: number;
  order: number;
};

export type StyleItem = {
  _id: string;
  name: string;
  order: number;
  variants: {
    name: string;
    order: number;
    image_url?: string;
    price: number;
    deposit: number;
  }[];
};

export type AddOnItem = {
  _id: string;
  name: string;
  price: number;
  order: number;
};

type Tab = "packages" | "styles" | "addons";

type SheetType = "package" | "style" | "addon";

type VariantRow = {
  id: string;
  name: string;
  price: string;
  deposit: string;
  image_url: string;
};

type PackageFormState = {
  name: string;
  price: string;
  deposit: string;
};

type StyleFormState = {
  name: string;
  variants: VariantRow[];
};

type AddOnFormState = {
  name: string;
  price: string;
};

type DeleteTarget = {
  type: SheetType;
  id: string;
  name: string;
};

const DELETE_LABELS: Record<SheetType, string> = {
  package: "package",
  style: "style",
  addon: "add-on",
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function createRowId() {
  return crypto.randomUUID();
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRequiredNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyPackageForm(): PackageFormState {
  return {
    name: "",
    price: "",
    deposit: "",
  };
}

function packageToForm(pkg: PackageItem): PackageFormState {
  return {
    name: pkg.name,
    price: pkg.price?.toString() ?? "",
    deposit: pkg.deposit?.toString() ?? "",
  };
}

function emptyStyleForm(): StyleFormState {
  return {
    name: "",
    variants: [
      {
        id: createRowId(),
        name: "",
        price: "",
        deposit: "",
        image_url: "",
      },
    ],
  };
}

function styleToForm(style: StyleItem): StyleFormState {
  return {
    name: style.name,
    variants:
      style.variants.length > 0
        ? style.variants.map((variant) => ({
            id: createRowId(),
            name: variant.name,
            price: variant.price.toString(),
            deposit: variant.deposit.toString(),
            image_url: variant.image_url ?? "",
          }))
        : [
            {
              id: createRowId(),
              name: "",
              price: "",
              deposit: "",
              image_url: "",
            },
          ],
  };
}

function emptyAddOnForm(): AddOnFormState {
  return {
    name: "",
    price: "",
  };
}

function addOnToForm(addOn: AddOnItem): AddOnFormState {
  return {
    name: addOn.name,
    price: addOn.price.toString(),
  };
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
  onEdit,
  onDelete,
  children,
}: {
  icon: Icon;
  title: string;
  description: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(glassCardClassName, "overflow-hidden")}>
      <div className="flex items-center gap-3 py-3 pr-2 pl-4">
        <IconBadge icon={icon} />
        <RowText title={title} description={description} />
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

export function PackagesManager({
  initialPackages,
  initialStyles,
  initialAddOns,
  chargeBy,
}: {
  initialPackages: PackageItem[];
  initialStyles: StyleItem[];
  initialAddOns: AddOnItem[];
  chargeBy: "package" | "style";
}) {
  const [tab, setTab] = useState<Tab>("packages");
  const [packages, setPackages] = useState(initialPackages);
  const [styles, setStyles] = useState(initialStyles);
  const [addOns, setAddOns] = useState(initialAddOns);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>("package");
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm);
  const [styleForm, setStyleForm] = useState<StyleFormState>(emptyStyleForm);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);
  const [addOnForm, setAddOnForm] = useState<AddOnFormState>(emptyAddOnForm);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function openSheet(type: SheetType) {
    setSheetType(type);
    setError(null);
    setSheetOpen(true);
  }

  function openCreatePackage() {
    setEditingPackageId(null);
    setPackageForm(emptyPackageForm());
    openSheet("package");
  }

  function openEditPackage(pkg: PackageItem) {
    setEditingPackageId(pkg._id);
    setPackageForm(packageToForm(pkg));
    openSheet("package");
  }

  function openCreateStyle() {
    setEditingStyleId(null);
    setStyleForm(emptyStyleForm());
    openSheet("style");
  }

  function openEditStyle(style: StyleItem) {
    setEditingStyleId(style._id);
    setStyleForm(styleToForm(style));
    openSheet("style");
  }

  function openCreateAddOn() {
    setEditingAddOnId(null);
    setAddOnForm(emptyAddOnForm());
    openSheet("addon");
  }

  function openEditAddOn(addOn: AddOnItem) {
    setEditingAddOnId(addOn._id);
    setAddOnForm(addOnToForm(addOn));
    openSheet("addon");
  }

  function openCreateForTab() {
    if (tab === "packages") openCreatePackage();
    else if (tab === "styles") openCreateStyle();
    else openCreateAddOn();
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
      const response = await fetch("/api/styles/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((style) => style._id) }),
      });

      if (!response.ok) {
        setStyles(previous);
        setError("Failed to reorder styles.");
        return;
      }

      const data = await response.json();
      setStyles(data.styles as StyleItem[]);
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
      style: `/api/styles/${deleteTarget.id}`,
      addon: `/api/add-ons/${deleteTarget.id}`,
    }[deleteTarget.type];

    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      setError(`Failed to delete ${DELETE_LABELS[deleteTarget.type]}.`);
      setDeleteTarget(null);
      return;
    }

    if (deleteTarget.type === "package") {
      setPackages((current) =>
        current.filter((pkg) => pkg._id !== deleteTarget.id)
      );
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

  async function handleSavePackage() {
    if (!packageForm.name.trim()) {
      setError("Event name is required.");
      return;
    }

    const payload = {
      name: packageForm.name.trim(),
      price: parseOptionalNumber(packageForm.price),
      deposit: parseOptionalNumber(packageForm.deposit),
      order: editingPackageId
        ? packages.find((pkg) => pkg._id === editingPackageId)?.order ?? packages.length
        : packages.length,
    };

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingPackageId ? `/api/packages/${editingPackageId}` : "/api/packages",
        {
          method: editingPackageId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError("Could not save event.");
        return;
      }

      const saved = data.package as PackageItem;
      setPackages((current) => {
        if (editingPackageId) {
          return current
            .map((pkg) => (pkg._id === saved._id ? saved : pkg))
            .sort((a, b) => a.order - b.order);
        }
        return [...current, saved].sort((a, b) => a.order - b.order);
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStyle() {
    const variants = styleForm.variants
      .map((variant, index) => ({
        name: variant.name.trim(),
        order: index,
        price: parseRequiredNumber(variant.price),
        deposit: parseRequiredNumber(variant.deposit),
        image_url: variant.image_url.trim() || undefined,
      }))
      .filter((variant) => variant.name.length > 0);

    if (!styleForm.name.trim()) {
      setError("Style name is required.");
      return;
    }

    if (variants.length === 0) {
      setError("Add at least one variant.");
      return;
    }

    const payload = {
      name: styleForm.name.trim(),
      order: editingStyleId
        ? styles.find((style) => style._id === editingStyleId)?.order ?? styles.length
        : styles.length,
      variants,
    };

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingStyleId ? `/api/styles/${editingStyleId}` : "/api/styles",
        {
          method: editingStyleId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError("Could not save style.");
        return;
      }

      const saved = data.style as StyleItem;
      setStyles((current) => {
        if (editingStyleId) {
          return current
            .map((style) => (style._id === saved._id ? saved : style))
            .sort((a, b) => a.order - b.order);
        }
        return [...current, saved].sort((a, b) => a.order - b.order);
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
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

  const sheetTitle = {
    package: editingPackageId ? "Edit event" : "New event",
    style: editingStyleId ? "Edit style" : "New style",
    addon: editingAddOnId ? "Edit add-on" : "New add-on",
  }[sheetType];

  const handleSave = {
    package: handleSavePackage,
    style: handleSaveStyle,
    addon: handleSaveAddOn,
  }[sheetType];

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Events & styles
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
                ? "Add style"
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
            Styles
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
              disabled={reordering || sheetOpen}
              handleClassName="mt-4"
              renderItem={(pkg) => (
                <CatalogItemCard
                  icon={IconPackage}
                  title={pkg.name}
                  description={
                    chargeBy === "style"
                      ? "Priced by style"
                      : (pkg.price != null ? formatRm(pkg.price) : "No price set") +
                        (pkg.deposit != null
                          ? ` · ${formatRm(pkg.deposit)} deposit`
                          : "")
                  }
                  onEdit={() => openEditPackage(pkg)}
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
              No styles yet. Tap + to add your first style category.
            </EmptyCard>
          ) : (
            <SortableList
              items={styles}
              getItemId={(style) => style._id}
              onReorder={handleReorderStyles}
              disabled={reordering || sheetOpen}
              handleClassName="mt-4"
              renderItem={(style) => (
                <CatalogItemCard
                  icon={IconSparkles}
                  title={style.name}
                  description={`${style.variants.length} variant${
                    style.variants.length === 1 ? "" : "s"
                  }`}
                  onEdit={() => openEditStyle(style)}
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
                            {variant.image_url ? (
                              <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-white/50 dark:bg-white/10">
                                <Image
                                  src={variant.image_url}
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
                            <span className="shrink-0 font-medium tabular-nums">
                              {formatRm(variant.price)}
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
          {chargeBy === "package" ? (
            <p className="text-xs text-muted-foreground">
              Clients only see add-ons when you charge by style. You can still
              add them to bookings you create yourself.
            </p>
          ) : null}

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
                  onEdit={() => openEditAddOn(addOn)}
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
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>

          {sheetType === "addon" ? (
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
          ) : sheetType === "package" ? (
            <div className="flex flex-col gap-4 px-6">
              <Field label="Name">
                <Input
                  className={inputClassName}
                  value={packageForm.name}
                  onChange={(event) =>
                    setPackageForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Nikah & Sanding"
                />
              </Field>

              {chargeBy === "style" ? (
                <p className="text-xs text-muted-foreground">
                  You charge by style, so prices are set on your styles.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price (optional)">
                    <Input
                      className={inputClassName}
                      type="number"
                      min="0"
                      step="1"
                      value={packageForm.price}
                      onChange={(event) =>
                        setPackageForm((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                      placeholder="1500"
                    />
                  </Field>
                  <Field label="Deposit (optional)">
                    <Input
                      className={inputClassName}
                      type="number"
                      min="0"
                      step="1"
                      value={packageForm.deposit}
                      onChange={(event) =>
                        setPackageForm((current) => ({
                          ...current,
                          deposit: event.target.value,
                        }))
                      }
                      placeholder="400"
                    />
                  </Field>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-6">
              <Field label="Category name">
                <Input
                  className={inputClassName}
                  value={styleForm.name}
                  onChange={(event) =>
                    setStyleForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="SHAWL"
                />
              </Field>

              {chargeBy === "package" ? (
                <p className="text-xs text-muted-foreground">
                  You charge by event, so prices are set on your events.
                </p>
              ) : null}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStyleForm((current) => ({
                        ...current,
                        variants: [
                          ...current.variants,
                          {
                            id: createRowId(),
                            name: "",
                            price: "",
                            deposit: "",
                            image_url: "",
                          },
                        ],
                      }))
                    }
                  >
                    <IconPlus />
                    Add variant
                  </Button>
                </div>

                <SortableList
                  items={styleForm.variants}
                  getItemId={(variant) => variant.id}
                  onReorder={(nextVariants) =>
                    setStyleForm((current) => ({
                      ...current,
                      variants: nextVariants,
                    }))
                  }
                  className="gap-3"
                  renderItem={(variant) => (
                    <div className="flex flex-col gap-3 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          className={inputClassName}
                          value={variant.name}
                          onChange={(event) =>
                            setStyleForm((current) => ({
                              ...current,
                              variants: current.variants.map((item) =>
                                item.id === variant.id
                                  ? { ...item, name: event.target.value }
                                  : item
                              ),
                            }))
                          }
                          placeholder="Variant name"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={styleForm.variants.length === 1}
                          onClick={() =>
                            setStyleForm((current) => ({
                              ...current,
                              variants: current.variants.filter(
                                (item) => item.id !== variant.id
                              ),
                            }))
                          }
                          aria-label="Remove variant"
                        >
                          <IconTrash />
                        </Button>
                      </div>

                      {chargeBy === "style" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Price">
                            <Input
                              className={inputClassName}
                              type="number"
                              min="0"
                              step="1"
                              value={variant.price}
                              onChange={(event) =>
                                setStyleForm((current) => ({
                                  ...current,
                                  variants: current.variants.map((item) =>
                                    item.id === variant.id
                                      ? { ...item, price: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                            />
                          </Field>
                          <Field label="Deposit">
                            <Input
                              className={inputClassName}
                              type="number"
                              min="0"
                              step="1"
                              value={variant.deposit}
                              onChange={(event) =>
                                setStyleForm((current) => ({
                                  ...current,
                                  variants: current.variants.map((item) =>
                                    item.id === variant.id
                                      ? { ...item, deposit: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                            />
                          </Field>
                        </div>
                      ) : null}

                      <VariantImageUpload
                        value={variant.image_url}
                        onChange={(url) =>
                          setStyleForm((current) => ({
                            ...current,
                            variants: current.variants.map((item) =>
                              item.id === variant.id
                                ? { ...item, image_url: url }
                                : item
                            ),
                          }))
                        }
                        disabled={saving}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          )}

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
              onClick={handleSave}
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
              Delete {deleteTarget ? DELETE_LABELS[deleteTarget.type] : ""}?
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
