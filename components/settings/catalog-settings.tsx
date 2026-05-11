"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2Icon,
  RefreshCwIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  ShoppingBagIcon,
  UploadCloudIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

function extractConvexMsg(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const m = err.message.match(/Uncaught ConvexError: ([\s\S]+?)(?:\s+at handler|\s*$)/);
  return m?.[1]?.trim() ?? err.message;
}

// ─── Product form ─────────────────────────────────────────────────────────────

interface ProductDraft {
  retailerId: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  availability: string;
}

const EMPTY_DRAFT: ProductDraft = {
  retailerId: "",
  name: "",
  description: "",
  price: "",
  currency: "",
  imageUrl: "",
  availability: "",
};

function ProductFormDialog({
  catalogDocId,
  editingProduct,
  open,
  onOpenChange,
}: {
  catalogDocId: Id<"catalogs">;
  editingProduct?: {
    _id: Id<"catalogProducts">;
    retailerId: string;
    name: string;
    description?: string;
    price?: string;
    currency?: string;
    imageUrl?: string;
    availability?: string;
  } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const isEdit = !!editingProduct;

  const [draft, setDraft] = useState<ProductDraft>(() =>
    editingProduct
      ? {
          retailerId: editingProduct.retailerId,
          name: editingProduct.name,
          description: editingProduct.description ?? "",
          price: editingProduct.price ?? "",
          currency: editingProduct.currency ?? "",
          imageUrl: editingProduct.imageUrl ?? "",
          availability: editingProduct.availability ?? "",
        }
      : EMPTY_DRAFT,
  );
  const [saving, setSaving] = useState(false);

  const createProduct = useMutation(api.catalog.createProduct);
  const updateProduct = useMutation(api.catalog.updateProduct);

  function field(key: keyof ProductDraft) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    if (!isEdit && !draft.retailerId.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct({
          productId: editingProduct!._id,
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          price: draft.price.trim() || undefined,
          currency: draft.currency.trim() || undefined,
          imageUrl: draft.imageUrl.trim() || undefined,
          availability: draft.availability.trim() || undefined,
        });
        toast.success(t("Product updated", "تم تحديث المنتج"));
      } else {
        await createProduct({
          catalogDocId,
          retailerId: draft.retailerId.trim(),
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          price: draft.price.trim() || undefined,
          currency: draft.currency.trim() || undefined,
          imageUrl: draft.imageUrl.trim() || undefined,
          availability: draft.availability.trim() || undefined,
        });
        toast.success(t("Product added", "تم إضافة المنتج"));
        setDraft(EMPTY_DRAFT);
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("RETAILER_ID_EXISTS")) {
        toast.error(t("Retailer ID already exists", "معرّف البائع موجود مسبقًا"));
      } else {
        toast.error(t("Failed to save product", "فشل حفظ المنتج"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Product", "تعديل المنتج") : t("Add Product", "إضافة منتج")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="pf-retailerId">
                {t("Retailer ID", "معرّف البائع")} *
              </Label>
              <Input
                id="pf-retailerId"
                value={draft.retailerId}
                onChange={field("retailerId")}
                placeholder="SKU-001"
                dir="ltr"
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "Must match the product_retailer_id in your Meta catalog",
                  "يجب أن يطابق product_retailer_id في كتالوج Meta الخاص بك",
                )}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="pf-name">{t("Name", "الاسم")} *</Label>
            <Input
              id="pf-name"
              value={draft.name}
              onChange={field("name")}
              placeholder={t("Product name", "اسم المنتج")}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-desc">{t("Description", "الوصف")}</Label>
            <Input
              id="pf-desc"
              value={draft.description}
              onChange={field("description")}
              placeholder={t("Optional description", "وصف اختياري")}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="pf-price">{t("Price", "السعر")}</Label>
              <Input
                id="pf-price"
                value={draft.price}
                onChange={field("price")}
                placeholder="99.99"
                dir="ltr"
              />
            </div>
            <div className="w-24 space-y-1">
              <Label htmlFor="pf-currency">{t("Currency", "العملة")}</Label>
              <Input
                id="pf-currency"
                value={draft.currency}
                onChange={field("currency")}
                placeholder="EGP"
                dir="ltr"
                maxLength={3}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-img">{t("Image URL", "رابط الصورة")}</Label>
            <Input
              id="pf-img"
              value={draft.imageUrl}
              onChange={field("imageUrl")}
              placeholder="https://…"
              dir="ltr"
              type="url"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              type="submit"
              disabled={saving || !draft.name.trim() || (!isEdit && !draft.retailerId.trim())}
            >
              {saving && <Loader2Icon className="size-3.5 animate-spin me-1.5" />}
              {t("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

type CatalogProduct = {
  _id: Id<"catalogProducts">;
  retailerId: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  imageUrl?: string;
  availability?: string;
  source?: "sync" | "manual";
};

function ProductRow({
  product,
  channelId,
  onEdit,
}: {
  product: CatalogProduct;
  channelId: Id<"channels">;
  onEdit: (p: CatalogProduct) => void;
}) {
  const t = useT();
  const deleteProduct = useMutation(api.catalog.deleteProduct);
  const pushToMeta = useAction(api.actions.metaCatalogActions.pushProductToMeta);
  const [pushing, setPushing] = useState(false);

  async function handleDelete() {
    try {
      await deleteProduct({ productId: product._id });
      toast.success(t("Product deleted", "تم حذف المنتج"));
    } catch {
      toast.error(t("Failed to delete product", "فشل حذف المنتج"));
    }
  }

  async function handlePush() {
    setPushing(true);
    try {
      await pushToMeta({ channelId, productId: product._id });
      toast.success(t("Product pushed to Meta", "تم رفع المنتج إلى Meta"));
    } catch (err) {
      toast.error(extractConvexMsg(err) || t("Failed to push product", "فشل رفع المنتج"));
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 group">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="size-9 rounded object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="size-9 rounded bg-muted flex items-center justify-center shrink-0">
          <ShoppingBagIcon className="size-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{product.name}</p>
          {product.source === "manual" && (
            <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
              {t("Manual", "يدوي")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span dir="ltr" className="font-mono">{product.retailerId}</span>
          {product.price && (
            <span>
              {product.price}
              {product.currency ? ` ${product.currency}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title={t("Push to Meta", "رفع إلى Meta")}
          onClick={handlePush}
          disabled={pushing}
        >
          {pushing ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <UploadCloudIcon className="size-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => onEdit(product)}
        >
          <PencilIcon className="size-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            className="inline-flex items-center justify-center size-7 rounded-md text-destructive hover:bg-accent transition-colors"
          >
            <Trash2Icon className="size-3.5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("Delete product?", "حذف المنتج؟")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  `"${product.name}" will be permanently removed from this catalog.`,
                  `سيتم حذف "${product.name}" نهائيًا من هذا الكتالوج.`,
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("Delete", "حذف")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Per-catalog card ─────────────────────────────────────────────────────────

function CatalogCard({
  catalog,
  channelId,
}: {
  catalog: {
    _id: Id<"catalogs">;
    name: string;
    metaCatalogId: string;
    lastSyncedAt?: number;
  };
  channelId: Id<"channels">;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(catalog.name);

  const syncStatus = useQuery(api.catalog.getSyncStatusForCatalog, {
    catalogDocId: catalog._id,
  });
  const products = useQuery(
    api.catalog.searchCatalogProducts,
    expanded ? { catalogDocId: catalog._id, q } : "skip",
  );
  const triggerSync = useMutation(api.catalog.triggerCatalogSync);
  const renameCatalog = useMutation(api.catalog.renameCatalog);
  const removeCatalog = useMutation(api.catalog.removeCatalog);

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerSync({ catalogDocId: catalog._id });
      toast.success(
        t("Sync started — products will update shortly", "بدأ التزامن — سيتم تحديث المنتجات قريبًا"),
      );
    } catch {
      toast.error(t("Failed to start sync", "فشل بدء التزامن"));
    } finally {
      setSyncing(false);
    }
  }

  async function handleRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === catalog.name) {
      setRenaming(false);
      return;
    }
    try {
      await renameCatalog({ catalogDocId: catalog._id, name: trimmed });
      toast.success(t("Catalog renamed", "تم إعادة تسمية الكتالوج"));
    } catch {
      toast.error(t("Failed to rename catalog", "فشل إعادة تسمية الكتالوج"));
    } finally {
      setRenaming(false);
    }
  }

  function openCreate() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  const lastSynced = syncStatus?.lastSyncedAt
    ? new Date(syncStatus.lastSyncedAt).toLocaleString()
    : t("Never", "لم يتزامن بعد");

  return (
    <>
      <ProductFormDialog
        catalogDocId={catalog._id}
        editingProduct={editingProduct}
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingProduct(null);
        }}
      />

      <div className="rounded-lg border">
        {/* Catalog header */}
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 flex-1 min-w-0 text-start"
          >
            {expanded ? (
              <ChevronUpIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            {renaming ? (
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-7 text-sm font-medium"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-medium truncate">{catalog.name}</span>
            )}
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="font-mono text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 cursor-pointer"
              dir="ltr"
              title={t("Click to copy Catalog ID", "انقر لنسخ معرّف الكتالوج")}
              onClick={() => {
                navigator.clipboard.writeText(catalog.metaCatalogId);
                toast.success(t("Catalog ID copied", "تم نسخ معرّف الكتالوج"));
              }}
            >
              {catalog.metaCatalogId}
            </span>

            {syncStatus !== undefined && (
              <span className="text-xs text-muted-foreground">
                {syncStatus?.productCount ?? 0} {t("items", "منتج")}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={t("Sync from Meta", "تزامن من Meta")}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={t("Rename catalog", "إعادة تسمية الكتالوج")}
              onClick={() => {
                setNameInput(catalog.name);
                setRenaming(true);
              }}
            >
              <PencilIcon className="size-3.5" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                className="inline-flex items-center justify-center size-7 rounded-md text-destructive hover:bg-accent transition-colors"
              >
                <Trash2Icon className="size-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("Remove catalog?", "حذف الكتالوج؟")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      `"${catalog.name}" and all its products will be permanently removed.`,
                      `سيتم حذف "${catalog.name}" وجميع منتجاته نهائيًا.`,
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => removeCatalog({ catalogDocId: catalog._id }).catch(() =>
                      toast.error(t("Failed to remove catalog", "فشل حذف الكتالوج")),
                    )}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("Remove", "حذف")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Expanded products section */}
        {expanded && (
          <div className="border-t p-3 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("Last sync", "آخر تزامن")}: {lastSynced}</span>
              <Button size="sm" variant="outline" onClick={openCreate}>
                <PlusIcon className="size-3.5 me-1.5" />
                {t("Add Product", "إضافة منتج")}
              </Button>
            </div>

            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search products…", "ابحث عن منتج…")}
              className="h-8 text-sm"
            />

            {products === undefined ? (
              <div className="flex items-center justify-center py-6">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <ShoppingBagIcon className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {q
                    ? t("No products found", "لا توجد منتجات")
                    : t("No products yet — add one or sync from Meta", "لا توجد منتجات — أضف منتجًا أو تزامن من Meta")}
                </p>
              </div>
            ) : (
              <div className="divide-y border rounded-md">
                {products.map((p) => (
                  <ProductRow
                    key={p._id}
                    product={p}
                    channelId={channelId}
                    onEdit={(prod) => {
                      setEditingProduct(prod);
                      setFormOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Add catalog form ─────────────────────────────────────────────────────────

function AddCatalogForm({
  channelId,
  prefillMetaId,
}: {
  channelId: Id<"channels">;
  prefillMetaId?: string;
}) {
  const t = useT();
  const [metaId, setMetaId] = useState(prefillMetaId ?? "");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState("");
  const [creating, setCreating] = useState(false);

  const addCatalog = useMutation(api.catalog.addCatalog);
  const createMetaCatalog = useAction(api.actions.metaCatalogActions.createMetaCatalog);

  async function handleAdd() {
    const trimmedId = metaId.trim();
    const trimmedName = name.trim();
    if (!trimmedId || !trimmedName) return;
    setSaving(true);
    try {
      await addCatalog({ channelId, metaCatalogId: trimmedId, name: trimmedName });
      toast.success(t("Catalog added", "تم إضافة الكتالوج"));
      setMetaId("");
      setName("");
    } catch (err) {
      const msg = extractConvexMsg(err);
      if (msg.includes("CATALOG_ALREADY_ADDED")) {
        toast.error(t("Catalog already added", "الكتالوج مضاف مسبقًا"));
      } else {
        toast.error(msg || t("Failed to add catalog", "فشل إضافة الكتالوج"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const trimmedName = newCatalogName.trim();
    if (!trimmedName) return;
    setCreating(true);
    try {
      await createMetaCatalog({ channelId, catalogName: trimmedName });
      toast.success(t("Catalog created and connected", "تم إنشاء الكتالوج وربطه"));
      setNewCatalogName("");
    } catch (err) {
      toast.error(extractConvexMsg(err) || t("Failed to create catalog", "فشل إنشاء الكتالوج"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-4">
      <p className="text-sm font-medium text-muted-foreground">
        {t("Add existing catalog", "إضافة كتالوج موجود")}
      </p>

      {/* Connect existing Meta catalog by ID */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">{t("Meta Catalog ID", "معرّف كتالوج Meta")}</Label>
          <Input
            value={metaId}
            onChange={(e) => setMetaId(e.target.value)}
            placeholder="946395248008933"
            dir="ltr"
            className="font-mono text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("Display name", "الاسم")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Summer Collection", "مثال: مجموعة الصيف")}
            className="text-sm h-8"
          />
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={saving || !metaId.trim() || !name.trim()}
      >
        {saving && <Loader2Icon className="size-3.5 animate-spin me-1.5" />}
        <PlusIcon className="size-3.5 me-1.5" />
        {t("Add Catalog", "إضافة الكتالوج")}
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("or", "أو")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Create new catalog in Meta */}
      <p className="text-sm font-medium text-muted-foreground">
        {t("Create new catalog in Meta", "إنشاء كتالوج جديد في Meta")}
      </p>
      <div className="flex gap-2">
        <Input
          value={newCatalogName}
          onChange={(e) => setNewCatalogName(e.target.value)}
          placeholder={t("Catalog name", "اسم الكتالوج")}
          className="text-sm h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={creating || !newCatalogName.trim()}
          className="shrink-0"
        >
          {creating && <Loader2Icon className="size-3.5 animate-spin me-1.5" />}
          {t("Create in Meta", "إنشاء في Meta")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Creates a catalog in your Meta Business Manager and links it automatically.",
          "ينشئ كتالوجًا في Meta Business Manager ويربطه تلقائيًا.",
        )}
      </p>
    </div>
  );
}

// ─── Per-channel card ─────────────────────────────────────────────────────────

function ChannelCatalogCard({
  channel,
}: {
  channel: {
    _id: Id<"channels">;
    displayName: string;
    displayPhone?: string;
    catalogId?: string;
  };
}) {
  const t = useT();
  const catalogs = useQuery(api.catalog.listCatalogs, { channelId: channel._id });

  if (catalogs === undefined) {
    return (
      <div className="rounded-lg border p-4">
        <p className="font-medium">{channel.displayName}</p>
        <div className="flex items-center justify-center py-4">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // If the channel has a legacy catalogId that isn't yet in the catalogs table, pre-fill it
  const legacyCatalogId =
    channel.catalogId &&
    !catalogs.some((c) => c.metaCatalogId === channel.catalogId)
      ? channel.catalogId
      : undefined;

  return (
    <div className="rounded-lg border divide-y">
      {/* Channel header */}
      <div className="p-4">
        <p className="font-medium">{channel.displayName}</p>
        {channel.displayPhone && (
          <p className="text-sm text-muted-foreground" dir="ltr">
            {channel.displayPhone}
          </p>
        )}
      </div>

      {/* Catalog list */}
      <div className="p-4 space-y-2">
        {catalogs.length === 0 && !legacyCatalogId ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t("No catalogs added yet", "لا توجد كتالوجات مضافة بعد")}
          </p>
        ) : (
          catalogs.map((catalog) => (
            <CatalogCard
              key={catalog._id}
              catalog={catalog}
              channelId={channel._id}
            />
          ))
        )}
      </div>

      {/* Add catalog form */}
      <div className="p-4">
        <AddCatalogForm channelId={channel._id} prefillMetaId={legacyCatalogId} />
      </div>
    </div>
  );
}

// ─── Top-level component ──────────────────────────────────────────────────────

export function CatalogSettings() {
  const t = useT();
  const channels = useQuery(api.channels.listForTenant);

  if (channels === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("No WhatsApp channels configured yet.", "لا توجد أرقام واتساب مضافة بعد.")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Connect Meta Commerce Manager catalogs to enable product browsing in conversations. You can add multiple catalogs per channel. Available on Growth plan and above.",
          "اربط كتالوجات Meta Commerce Manager لتفعيل تصفح المنتجات في المحادثات. يمكنك إضافة عدة كتالوجات لكل رقم. متاح في خطة Growth وما فوقها.",
        )}
      </p>
      {channels.map((channel) => (
        <ChannelCatalogCard key={channel._id} channel={channel} />
      ))}
    </div>
  );
}
