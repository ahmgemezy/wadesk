"use client";

import { useState, useRef } from "react";
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
  ImageIcon,
  LinkIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function extractConvexMsg(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const m = err.message.match(/Uncaught ConvexError: ([\s\S]+?)(?:\s+at handler|\s*$)/);
  return m?.[1]?.trim() ?? err.message;
}

// ─── Product form ─────────────────────────────────────────────────────────────

const AVAILABILITY_OPTIONS = [
  { value: "in stock", labelEn: "In Stock", labelAr: "متوفر" },
  { value: "out of stock", labelEn: "Out of Stock", labelAr: "غير متوفر" },
  { value: "preorder", labelEn: "Pre-order", labelAr: "طلب مسبق" },
  { value: "available for order", labelEn: "Available for Order", labelAr: "متاح للطلب" },
  { value: "discontinued", labelEn: "Discontinued", labelAr: "متوقف" },
];

const CONDITION_OPTIONS = [
  { value: "new", labelEn: "New", labelAr: "جديد" },
  { value: "refurbished", labelEn: "Refurbished", labelAr: "مجدد" },
  { value: "used", labelEn: "Used", labelAr: "مستعمل" },
];

const GENDER_OPTIONS = [
  { value: "", labelEn: "— None —" },
  { value: "male", labelEn: "Male" },
  { value: "female", labelEn: "Female" },
  { value: "unisex", labelEn: "Unisex" },
];

const AGE_GROUP_OPTIONS = [
  { value: "", labelEn: "— None —" },
  { value: "adult", labelEn: "Adult" },
  { value: "teen", labelEn: "Teen" },
  { value: "kids", labelEn: "Kids" },
  { value: "toddler", labelEn: "Toddler" },
  { value: "newborn", labelEn: "Newborn" },
];

interface ProductDraft {
  retailerId: string;
  name: string;
  description: string;
  price: string;
  salePrice: string;
  currency: string;
  imageUrl: string;
  additionalImages: string[];
  availability: string;
  condition: string;
  brand: string;
  productUrl: string;
  itemGroupId: string;
  color: string;
  size: string;
  material: string;
  pattern: string;
  gender: string;
  ageGroup: string;
}

const EMPTY_DRAFT: ProductDraft = {
  retailerId: "",
  name: "",
  description: "",
  price: "",
  salePrice: "",
  currency: "",
  imageUrl: "",
  additionalImages: [],
  availability: "in stock",
  condition: "new",
  brand: "",
  productUrl: "",
  itemGroupId: "",
  color: "",
  size: "",
  material: "",
  pattern: "",
  gender: "",
  ageGroup: "",
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
    salePrice?: string;
    currency?: string;
    imageUrl?: string;
    additionalImages?: string[];
    availability?: string;
    condition?: string;
    brand?: string;
    productUrl?: string;
    itemGroupId?: string;
    color?: string;
    size?: string;
    material?: string;
    pattern?: string;
    gender?: string;
    ageGroup?: string;
  } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const isEdit = !!editingProduct;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ProductDraft>(() =>
    editingProduct
      ? {
          retailerId: editingProduct.retailerId,
          name: editingProduct.name,
          description: editingProduct.description ?? "",
          price: editingProduct.price ?? "",
          salePrice: editingProduct.salePrice ?? "",
          currency: editingProduct.currency ?? "",
          imageUrl: editingProduct.imageUrl ?? "",
          additionalImages: editingProduct.additionalImages ?? [],
          availability: editingProduct.availability ?? "in stock",
          condition: editingProduct.condition ?? "new",
          brand: editingProduct.brand ?? "",
          productUrl: editingProduct.productUrl ?? "",
          itemGroupId: editingProduct.itemGroupId ?? "",
          color: editingProduct.color ?? "",
          size: editingProduct.size ?? "",
          material: editingProduct.material ?? "",
          pattern: editingProduct.pattern ?? "",
          gender: editingProduct.gender ?? "",
          ageGroup: editingProduct.ageGroup ?? "",
        }
      : EMPTY_DRAFT,
  );
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    editingProduct?.imageUrl ?? null,
  );
  const [imageError, setImageError] = useState(false);
  const [additionalImageUploading, setAdditionalImageUploading] = useState(false);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = useMutation(api.catalog.createProduct);
  const updateProduct = useMutation(api.catalog.updateProduct);
  const generateUploadUrl = useMutation(api.catalog.generateProductImageUploadUrl);
  const resolveUrl = useMutation(api.catalog.resolveProductImageUrl);

  function setField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function field(key: keyof ProductDraft) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(key, e.target.value);
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Only image files are allowed", "يُسمح بالصور فقط"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("Image must be under 8 MB", "يجب أن تكون الصورة أقل من 8 ميجابايت"));
      return;
    }
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setImageError(false);
    setImageUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("upload_failed");
      const { storageId } = await res.json() as { storageId: Id<"_storage"> };
      const url = await resolveUrl({ storageId });
      setField("imageUrl", url);
      setImagePreview(url);
      toast.success(t("Image uploaded", "تم رفع الصورة"));
    } catch {
      toast.error(t("Failed to upload image", "فشل رفع الصورة"));
      setImagePreview(draft.imageUrl || null);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setField("imageUrl", val);
    setImagePreview(val || null);
    setImageError(false);
  }

  async function handleAdditionalImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Only image files are allowed", "يُسمح بالصور فقط"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("Image must be under 8 MB", "يجب أن تكون الصورة أقل من 8 ميجابايت"));
      return;
    }
    setAdditionalImageUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("upload_failed");
      const { storageId } = await res.json() as { storageId: Id<"_storage"> };
      const url = await resolveUrl({ storageId });
      setDraft((d) => ({ ...d, additionalImages: [...d.additionalImages, url] }));
      toast.success(t("Image uploaded", "تم رفع الصورة"));
    } catch {
      toast.error(t("Failed to upload image", "فشل رفع الصورة"));
    } finally {
      setAdditionalImageUploading(false);
      if (additionalFileInputRef.current) additionalFileInputRef.current.value = "";
    }
  }

  function removeAdditionalImage(idx: number) {
    setDraft((d) => ({
      ...d,
      additionalImages: d.additionalImages.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    if (!isEdit && !draft.retailerId.trim()) return;
    setSaving(true);
    try {
      const shared = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        price: draft.price.trim() || undefined,
        salePrice: draft.salePrice.trim() || undefined,
        currency: draft.currency.trim() || undefined,
        imageUrl: draft.imageUrl.trim() || undefined,
        additionalImages: draft.additionalImages.length > 0 ? draft.additionalImages : undefined,
        availability: draft.availability || undefined,
        condition: draft.condition || undefined,
        brand: draft.brand.trim() || undefined,
        productUrl: draft.productUrl.trim() || undefined,
        itemGroupId: draft.itemGroupId.trim() || undefined,
        color: draft.color.trim() || undefined,
        size: draft.size.trim() || undefined,
        material: draft.material.trim() || undefined,
        pattern: draft.pattern.trim() || undefined,
        gender: draft.gender || undefined,
        ageGroup: draft.ageGroup || undefined,
      };
      if (isEdit) {
        await updateProduct({ productId: editingProduct!._id, ...shared });
        toast.success(t("Product updated", "تم تحديث المنتج"));
      } else {
        await createProduct({ catalogDocId, retailerId: draft.retailerId.trim(), ...shared });
        toast.success(t("Product added", "تم إضافة المنتج"));
        setDraft(EMPTY_DRAFT);
        setImagePreview(null);
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

  const nameLen = draft.name.length;
  const descLen = draft.description.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-base">
            {isEdit ? t("Edit Product", "تعديل المنتج") : t("Add Product", "إضافة منتج")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "Fields marked * are required by Meta's catalog schema.",
              "الحقول المحددة بـ * مطلوبة في مخطط كتالوج Meta.",
            )}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 space-y-5 pb-2">

            {/* ── Image section ──────────────────────────────────────── */}
            <div className="flex gap-4">
              {/* Preview box */}
              <div className="shrink-0">
                <div
                  className="size-36 rounded-lg border-2 border-dashed bg-muted/40 flex items-center justify-center overflow-hidden relative cursor-pointer group"
                  onClick={() => !imageUploading && fileInputRef.current?.click()}
                >
                  {imageUploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10">
                      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {imagePreview && !imageError ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="size-full object-cover"
                        onError={() => setImageError(true)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="size-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                      <ImageIcon className="size-7" />
                      <span className="text-[10px] font-medium">
                        {t("Click to upload", "انقر للرفع")}
                      </span>
                    </div>
                  )}
                  {imagePreview && !imageError && !imageUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setField("imageUrl", "");
                        setImagePreview(null);
                        setImageError(false);
                      }}
                      className="absolute top-1 end-1 size-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
                    >
                      <XIcon className="size-3" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleImageFile}
                />
              </div>

              {/* Image URL input + requirements */}
              <div className="flex-1 space-y-2 min-w-0">
                <div className="space-y-1">
                  <Label htmlFor="pf-img">{t("Image URL", "رابط الصورة")}</Label>
                  <Input
                    id="pf-img"
                    value={draft.imageUrl}
                    onChange={handleUrlChange}
                    placeholder="https://example.com/product.jpg"
                    dir="ltr"
                    className={imageError ? "border-destructive" : ""}
                  />
                  {imageError && (
                    <p className="text-xs text-destructive">
                      {t("Could not load image from this URL", "تعذّر تحميل الصورة من هذا الرابط")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  <UploadCloudIcon className="size-3.5" />
                  {imageUploading
                    ? t("Uploading…", "جارٍ الرفع…")
                    : t("Or upload from your device", "أو ارفع من جهازك")}
                </button>
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground/70">{t("Meta image requirements", "متطلبات صورة Meta")}</p>
                  <p>· {t("Min 500 × 500 px (1024 × 1024 recommended)", "الحد الأدنى 500 × 500 بكسل (يوصى بـ 1024 × 1024)")}</p>
                  <p>· {t("JPG, PNG or GIF — max 8 MB", "JPG أو PNG أو GIF — الحد الأقصى 8 ميجابايت")}</p>
                  <p>· {t("Clear product shot, no promotional text", "صورة واضحة للمنتج، بدون نص إعلاني")}</p>
                </div>
              </div>
            </div>

            {/* ── Additional Images ──────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("Additional Images", "صور إضافية")}
                </p>
                <span className="text-xs text-muted-foreground">
                  {draft.additionalImages.length}/9
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {draft.additionalImages.map((url, idx) => (
                  <div key={idx} className="relative size-16 rounded border overflow-hidden group shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(idx)}
                      className="absolute top-0.5 end-0.5 size-4 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  </div>
                ))}
                {draft.additionalImages.length < 9 && (
                  <button
                    type="button"
                    onClick={() => additionalFileInputRef.current?.click()}
                    disabled={additionalImageUploading}
                    className="size-16 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                  >
                    {additionalImageUploading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <>
                        <PlusIcon className="size-4" />
                        <span className="text-[9px]">{t("Add", "إضافة")}</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={additionalFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleAdditionalImageFile}
                />
              </div>
            </div>

            <Separator />

            {/* ── Identity ──────────────────────────────────────────── */}
            <div className="space-y-3">
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
                    className="font-mono"
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Must match product_retailer_id in your Meta catalog. Max 100 chars.",
                      "يجب أن يطابق product_retailer_id في كتالوج Meta الخاص بك. الحد الأقصى 100 حرف.",
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pf-name">{t("Product Name", "اسم المنتج")} *</Label>
                  <span className={`text-xs ${nameLen > 130 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {nameLen}/150
                  </span>
                </div>
                <Input
                  id="pf-name"
                  value={draft.name}
                  onChange={field("name")}
                  placeholder={t("e.g. Nike Air Max 270", "مثال: نايكي اير ماكس 270")}
                  required
                  maxLength={150}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pf-desc">{t("Description", "الوصف")} *</Label>
                  <span className={`text-xs ${descLen > 9000 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {descLen}/9,999
                  </span>
                </div>
                <Textarea
                  id="pf-desc"
                  value={draft.description}
                  onChange={field("description")}
                  placeholder={t("Describe the product — material, size, features…", "صف المنتج — الخامة، الحجم، المميزات…")}
                  className="min-h-20 resize-none"
                  maxLength={9999}
                />
              </div>
            </div>

            <Separator />

            {/* ── Pricing ───────────────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("Pricing", "التسعير")}
              </p>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label htmlFor="pf-price">{t("Price", "السعر")} *</Label>
                  <Input
                    id="pf-price"
                    value={draft.price}
                    onChange={field("price")}
                    placeholder="99.99"
                    dir="ltr"
                    inputMode="decimal"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor="pf-currency">{t("Currency", "العملة")} *</Label>
                  <Input
                    id="pf-currency"
                    value={draft.currency}
                    onChange={field("currency")}
                    placeholder="EGP"
                    dir="ltr"
                    maxLength={3}
                    className="uppercase"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pf-salePrice">{t("Sale Price", "سعر التخفيض")}</Label>
                <Input
                  id="pf-salePrice"
                  value={draft.salePrice}
                  onChange={field("salePrice")}
                  placeholder={t("e.g. 79.99 (leave empty if no discount)", "مثال: 79.99 (اتركه فارغاً إن لم يوجد خصم)")}
                  dir="ltr"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  {t("Discounted price shown to customers — must be lower than the regular price.", "السعر المخفّض المعروض للعملاء — يجب أن يكون أقل من السعر الأصلي.")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Meta format: amount and ISO-4217 currency code (e.g. 99.99 EGP)",
                  "تنسيق Meta: المبلغ ورمز العملة ISO-4217 (مثال: 99.99 EGP)",
                )}
              </p>
            </div>

            <Separator />

            {/* ── Classification ────────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("Classification", "التصنيف")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("Availability", "التوفر")} *</Label>
                  <Select
                    value={draft.availability}
                    onValueChange={(v) => setField("availability", v ?? "in stock")}
                  >
                    <SelectTrigger className="w-full">
                      <span>
                        {AVAILABILITY_OPTIONS.find(o => o.value === draft.availability)?.labelEn ?? draft.availability}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("Condition", "الحالة")} *</Label>
                  <Select
                    value={draft.condition}
                    onValueChange={(v) => setField("condition", v ?? "new")}
                  >
                    <SelectTrigger className="w-full">
                      <span>
                        {CONDITION_OPTIONS.find(o => o.value === draft.condition)?.labelEn ?? draft.condition}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Optional extras ───────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("Additional Info", "معلومات إضافية")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pf-brand">
                    <TagIcon className="size-3 inline me-1" />
                    {t("Brand", "الماركة")}
                  </Label>
                  <Input
                    id="pf-brand"
                    value={draft.brand}
                    onChange={field("brand")}
                    placeholder={t("e.g. Nike", "مثال: نايكي")}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-url">
                    <LinkIcon className="size-3 inline me-1" />
                    {t("Product URL", "رابط المنتج")}
                  </Label>
                  <Input
                    id="pf-url"
                    value={draft.productUrl}
                    onChange={field("productUrl")}
                    placeholder="https://your-store.com/product"
                    dir="ltr"
                    type="url"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Variants ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("Variants", "المتغيرات")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "Products with the same Item Group ID are shown as variants in Meta Commerce Manager.",
                    "المنتجات التي تشترك في نفس معرّف المجموعة تُعرض كمتغيرات في Meta Commerce Manager.",
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pf-itemGroupId">{t("Item Group ID", "معرّف مجموعة المتغيرات")}</Label>
                <Input
                  id="pf-itemGroupId"
                  value={draft.itemGroupId}
                  onChange={field("itemGroupId")}
                  placeholder={t("e.g. nike-air-max-270", "مثال: nike-air-max-270")}
                  dir="ltr"
                  className="font-mono"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {t("Leave empty if this product has no variants.", "اتركه فارغاً إذا لم تكن لهذا المنتج متغيرات.")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pf-color">{t("Color", "اللون")}</Label>
                  <Input
                    id="pf-color"
                    value={draft.color}
                    onChange={field("color")}
                    placeholder={t("e.g. Red", "مثال: أحمر")}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-size">{t("Size", "المقاس")}</Label>
                  <Input
                    id="pf-size"
                    value={draft.size}
                    onChange={field("size")}
                    placeholder={t("e.g. XL, 42", "مثال: XL، 42")}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-material">{t("Material", "الخامة")}</Label>
                  <Input
                    id="pf-material"
                    value={draft.material}
                    onChange={field("material")}
                    placeholder={t("e.g. Cotton", "مثال: قطن")}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-pattern">{t("Pattern", "النمط")}</Label>
                  <Input
                    id="pf-pattern"
                    value={draft.pattern}
                    onChange={field("pattern")}
                    placeholder={t("e.g. Striped", "مثال: مقلّم")}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("Gender", "الجنس")}</Label>
                  <Select
                    value={draft.gender}
                    onValueChange={(v) => setField("gender", v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <span>
                        {GENDER_OPTIONS.find(o => o.value === draft.gender)?.labelEn ?? "— None —"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value || "__none__"} value={o.value}>
                          {o.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("Age Group", "الفئة العمرية")}</Label>
                  <Select
                    value={draft.ageGroup}
                    onValueChange={(v) => setField("ageGroup", v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <span>
                        {AGE_GROUP_OPTIONS.find(o => o.value === draft.ageGroup)?.labelEn ?? "— None —"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_GROUP_OPTIONS.map((o) => (
                        <SelectItem key={o.value || "__none__"} value={o.value}>
                          {o.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* bottom breathing room */}
            <div className="h-2" />
          </div>

          <div className="shrink-0 border-t px-6 py-4 flex items-center justify-end gap-2 bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              type="submit"
              disabled={saving || imageUploading || additionalImageUploading || !draft.name.trim() || (!isEdit && !draft.retailerId.trim())}
            >
              {saving && <Loader2Icon className="size-3.5 animate-spin me-1.5" />}
              {isEdit ? t("Save Changes", "حفظ التغييرات") : t("Add Product", "إضافة منتج")}
            </Button>
          </div>
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
  salePrice?: string;
  currency?: string;
  imageUrl?: string;
  additionalImages?: string[];
  availability?: string;
  condition?: string;
  brand?: string;
  productUrl?: string;
  itemGroupId?: string;
  color?: string;
  size?: string;
  material?: string;
  pattern?: string;
  gender?: string;
  ageGroup?: string;
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
