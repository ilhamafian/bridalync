"use client";

import Image from "next/image";
import { useState } from "react";
import {
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  session_templates: { name: string; order: number }[];
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

type Tab = "packages" | "styles";

type SessionRow = {
  id: string;
  name: string;
};

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
  session_templates: SessionRow[];
};

type StyleFormState = {
  name: string;
  variants: VariantRow[];
};

type DeleteTarget = {
  type: "package" | "style";
  id: string;
  name: string;
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
    session_templates: [{ id: createRowId(), name: "" }],
  };
}

function packageToForm(pkg: PackageItem): PackageFormState {
  return {
    name: pkg.name,
    price: pkg.price?.toString() ?? "",
    deposit: pkg.deposit?.toString() ?? "",
    session_templates:
      pkg.session_templates.length > 0
        ? pkg.session_templates.map((session) => ({
            id: createRowId(),
            name: session.name,
          }))
        : [{ id: createRowId(), name: "" }],
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

export function PackagesManager({
  initialPackages,
  initialStyles,
}: {
  initialPackages: PackageItem[];
  initialStyles: StyleItem[];
}) {
  const [tab, setTab] = useState<Tab>("packages");
  const [packages, setPackages] = useState(initialPackages);
  const [styles, setStyles] = useState(initialStyles);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm);
  const [styleForm, setStyleForm] = useState<StyleFormState>(emptyStyleForm);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function openCreatePackage() {
    setTab("packages");
    setEditingPackageId(null);
    setEditingStyleId(null);
    setPackageForm(emptyPackageForm());
    setError(null);
    setSheetOpen(true);
  }

  function openEditPackage(pkg: PackageItem) {
    setTab("packages");
    setEditingPackageId(pkg._id);
    setEditingStyleId(null);
    setPackageForm(packageToForm(pkg));
    setError(null);
    setSheetOpen(true);
  }

  function openCreateStyle() {
    setTab("styles");
    setEditingStyleId(null);
    setEditingPackageId(null);
    setStyleForm(emptyStyleForm());
    setError(null);
    setSheetOpen(true);
  }

  function openEditStyle(style: StyleItem) {
    setTab("styles");
    setEditingStyleId(style._id);
    setEditingPackageId(null);
    setStyleForm(styleToForm(style));
    setError(null);
    setSheetOpen(true);
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
        setError("Failed to reorder packages.");
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

  async function confirmDelete() {
    if (!deleteTarget) return;

    const endpoint =
      deleteTarget.type === "package"
        ? `/api/packages/${deleteTarget.id}`
        : `/api/styles/${deleteTarget.id}`;

    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      setError(`Failed to delete ${deleteTarget.type}.`);
      setDeleteTarget(null);
      return;
    }

    if (deleteTarget.type === "package") {
      setPackages((current) =>
        current.filter((pkg) => pkg._id !== deleteTarget.id)
      );
    } else {
      setStyles((current) =>
        current.filter((style) => style._id !== deleteTarget.id)
      );
    }

    setDeleteTarget(null);
  }

  async function handleSavePackage() {
    const session_templates = packageForm.session_templates
      .map((session, index) => ({
        name: session.name.trim(),
        order: index,
      }))
      .filter((session) => session.name.length > 0);

    if (!packageForm.name.trim()) {
      setError("Package name is required.");
      return;
    }

    if (session_templates.length === 0) {
      setError("Add at least one session.");
      return;
    }

    const payload = {
      name: packageForm.name.trim(),
      price: parseOptionalNumber(packageForm.price),
      deposit: parseOptionalNumber(packageForm.deposit),
      order: editingPackageId
        ? packages.find((pkg) => pkg._id === editingPackageId)?.order ?? packages.length
        : packages.length,
      session_templates,
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
        setError("Could not save package.");
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

  const isPackageSheet = tab === "packages" && !editingStyleId;
  const isStyleSheet = tab === "styles" || editingStyleId !== null;

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Packages & Styles</h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Manage what clients can book from your profile.
          </p>
        </div>
        <Button
          size="icon"
          onClick={tab === "packages" ? openCreatePackage : openCreateStyle}
          aria-label={tab === "packages" ? "Add package" : "Add style"}
        >
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="styles">Styles</TabsTrigger>
        </TabsList>

        {error && !sheetOpen ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <TabsContent value="packages" className="mt-0">
          {packages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No packages yet. Tap + to add your first package.
              </CardContent>
            </Card>
          ) : (
            <SortableList
              items={packages}
              getItemId={(pkg) => pkg._id}
              onReorder={handleReorderPackages}
              disabled={reordering || sheetOpen}
              renderItem={(pkg) => (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{pkg.name}</CardTitle>
                        <CardDescription>
                          {pkg.session_templates.length} session
                          {pkg.session_templates.length === 1 ? "" : "s"}
                          {pkg.price != null ? ` · ${formatRm(pkg.price)}` : ""}
                          {pkg.deposit != null
                            ? ` · ${formatRm(pkg.deposit)} deposit`
                            : ""}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditPackage(pkg)}
                          aria-label={`Edit ${pkg.name}`}
                        >
                          <IconPencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setDeleteTarget({
                              type: "package",
                              id: pkg._id,
                              name: pkg.name,
                            })
                          }
                          aria-label={`Delete ${pkg.name}`}
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {pkg.session_templates.map((session) => session.name).join(", ")}
                  </CardContent>
                </Card>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="styles" className="mt-0">
          {styles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No styles yet. Tap + to add your first style category.
              </CardContent>
            </Card>
          ) : (
            <SortableList
              items={styles}
              getItemId={(style) => style._id}
              onReorder={handleReorderStyles}
              disabled={reordering || sheetOpen}
              renderItem={(style) => (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{style.name}</CardTitle>
                        <CardDescription>
                          {style.variants.length} variant
                          {style.variants.length === 1 ? "" : "s"}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditStyle(style)}
                          aria-label={`Edit ${style.name}`}
                        >
                          <IconPencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setDeleteTarget({
                              type: "style",
                              id: style._id,
                              name: style.name,
                            })
                          }
                          aria-label={`Delete ${style.name}`}
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {style.variants.map((variant) => (
                      <div
                        key={`${style._id}-${variant.order}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {variant.image_url ? (
                            <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
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
                        <span className="shrink-0 text-muted-foreground">
                          {formatRm(variant.price)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            />
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" contained className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {isPackageSheet
                ? editingPackageId
                  ? "Edit package"
                  : "New package"
                : editingStyleId
                  ? "Edit style"
                  : "New style"}
            </SheetTitle>
          </SheetHeader>

          {isPackageSheet ? (
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

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Sessions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPackageForm((current) => ({
                        ...current,
                        session_templates: [
                          ...current.session_templates,
                          { id: createRowId(), name: "" },
                        ],
                      }))
                    }
                  >
                    <IconPlus />
                    Add session
                  </Button>
                </div>

                <SortableList
                  items={packageForm.session_templates}
                  getItemId={(session) => session.id}
                  onReorder={(nextSessions) =>
                    setPackageForm((current) => ({
                      ...current,
                      session_templates: nextSessions,
                    }))
                  }
                  className="gap-2"
                  renderItem={(session, index) => (
                    <div className="flex items-center gap-2">
                      <Input
                        className={inputClassName}
                        value={session.name}
                        onChange={(event) =>
                          setPackageForm((current) => ({
                            ...current,
                            session_templates: current.session_templates.map(
                              (item) =>
                                item.id === session.id
                                  ? { ...item, name: event.target.value }
                                  : item
                            ),
                          }))
                        }
                        placeholder={`Session ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={packageForm.session_templates.length === 1}
                        onClick={() =>
                          setPackageForm((current) => ({
                            ...current,
                            session_templates: current.session_templates.filter(
                              (item) => item.id !== session.id
                            ),
                          }))
                        }
                        aria-label="Remove session"
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  )}
                />
              </div>
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
              onClick={isStyleSheet ? handleSaveStyle : handleSavePackage}
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
              Delete {deleteTarget?.type === "package" ? "package" : "style"}?
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
