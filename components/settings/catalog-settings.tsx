"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  EyeIcon,
  ShoppingCartIcon,
  WifiIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

function extractConvexMsg(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const m = err.message.match(/Uncaught ConvexError: ([\s\S]+?)(?:\s+at handler|\s*$)/);
  return m?.[1]?.trim() ?? err.message;
}

// ─── Apple design tokens ───────────────────────────────────────────────────────
const INPUT = "w-full rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 py-2 text-[14px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73] dark:bg-white/[0.05] dark:border-white/[0.10] dark:text-white dark:placeholder:text-white/40";
const INPUT_SM = "w-full rounded-lg border border-black/[0.12] bg-black/[0.04] px-2.5 py-1.5 text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3] transition-all placeholder:text-[#6E6E73] dark:bg-white/[0.05] dark:border-white/[0.10] dark:text-white dark:placeholder:text-white/40";
const INPUT_XS = "w-full rounded-md border border-black/[0.12] bg-black/[0.04] px-2 py-1 text-[12px] text-[#1D1D1F] outline-none focus:border-[#0071E3] transition-all placeholder:text-[#6E6E73] dark:bg-white/[0.05] dark:border-white/[0.10] dark:text-white dark:placeholder:text-white/40";
const BTN_PRIMARY = "inline-flex items-center justify-center rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] text-white font-normal px-5 py-2 text-[14px] transition-colors disabled:opacity-50 gap-1.5 shrink-0";
const BTN_OUTLINE = "inline-flex items-center justify-center rounded-full border border-black/[0.12] bg-transparent hover:bg-black/[0.04] text-[#1D1D1F] font-normal px-5 py-2 text-[14px] transition-colors disabled:opacity-50 gap-1.5 shrink-0 dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.05]";
const BTN_SM = "inline-flex items-center justify-center rounded-full border border-black/[0.12] bg-transparent hover:bg-black/[0.04] text-[#1D1D1F] font-normal px-3 py-1.5 text-[13px] transition-colors disabled:opacity-50 gap-1 shrink-0 dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.05]";
const BTN_ICON = "inline-flex items-center justify-center size-8 rounded-xl text-[#6E6E73] hover:bg-black/[0.06] hover:text-[#1D1D1F] transition-colors dark:hover:bg-white/[0.08] dark:hover:text-white";
const CARD = "rounded-[22px] bg-white border border-black/[0.08] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)] dark:bg-[#1C1C1E] dark:border-white/[0.08]";
const LBL = "block text-[13px] font-medium text-[#1D1D1F] mb-1 dark:text-white/90";
const SEC = "text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] dark:text-white/40";
const DIVIDER = "border-t border-black/[0.08] dark:border-white/[0.06]";
const SELECT_TRIGGER = "w-full h-10 rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 text-[14px] text-[#1D1D1F] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all dark:bg-white/[0.05] dark:border-white/[0.10] dark:text-white";

// ─── Variant row input ────────────────────────────────────────────────────────

function VariantRowInput({
  row,
  onChange,
  onRemove,
}: {
  row: VariantRow;
  onChange: (r: VariantRow) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr_1fr_1fr_1fr_28px] gap-1.5 items-center">
      <input
        value={row.retailerIdSuffix}
        onChange={(e) => onChange({ ...row, retailerIdSuffix: e.target.value })}
        placeholder="red-xl"
        dir="ltr"
        className={INPUT_XS + " font-mono"}
        maxLength={50}
      />
      <input value={row.color} onChange={(e) => onChange({ ...row, color: e.target.value })} placeholder="Color" className={INPUT_XS} maxLength={100} />
      <input value={row.size} onChange={(e) => onChange({ ...row, size: e.target.value })} placeholder="Size" className={INPUT_XS} maxLength={100} />
      <input value={row.material} onChange={(e) => onChange({ ...row, material: e.target.value })} placeholder="Material" className={INPUT_XS} maxLength={100} />
      <input value={row.pattern} onChange={(e) => onChange({ ...row, pattern: e.target.value })} placeholder="Pattern" className={INPUT_XS} maxLength={100} />
      <button
        type="button"
        onClick={onRemove}
        className="size-7 flex items-center justify-center text-[#6E6E73] hover:text-[#FF3B30] rounded-lg transition-colors"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
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

interface VariantRow {
  _key: string;
  retailerIdSuffix: string;
  color: string;
  size: string;
  material: string;
  pattern: string;
}

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
  salePriceEffectiveDate: string;
  videoUrl: string;
  customLabel0: string;
  customLabel1: string;
  customLabel2: string;
  customLabel3: string;
  customLabel4: string;
  customNumber0: string;
  customNumber1: string;
  customNumber2: string;
  customNumber3: string;
  customNumber4: string;
  hasVariants: boolean;
  variantRows: VariantRow[];
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
  salePriceEffectiveDate: "",
  videoUrl: "",
  customLabel0: "",
  customLabel1: "",
  customLabel2: "",
  customLabel3: "",
  customLabel4: "",
  customNumber0: "",
  customNumber1: "",
  customNumber2: "",
  customNumber3: "",
  customNumber4: "",
  hasVariants: false,
  variantRows: [],
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
    salePriceEffectiveDate?: string;
    videoUrl?: string;
    customLabels?: string[];
    customNumbers?: string[];
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
          salePriceEffectiveDate: editingProduct.salePriceEffectiveDate ?? "",
          videoUrl: editingProduct.videoUrl ?? "",
          customLabel0: editingProduct.customLabels?.[0] ?? "",
          customLabel1: editingProduct.customLabels?.[1] ?? "",
          customLabel2: editingProduct.customLabels?.[2] ?? "",
          customLabel3: editingProduct.customLabels?.[3] ?? "",
          customLabel4: editingProduct.customLabels?.[4] ?? "",
          customNumber0: editingProduct.customNumbers?.[0] ?? "",
          customNumber1: editingProduct.customNumbers?.[1] ?? "",
          customNumber2: editingProduct.customNumbers?.[2] ?? "",
          customNumber3: editingProduct.customNumbers?.[3] ?? "",
          customNumber4: editingProduct.customNumbers?.[4] ?? "",
          hasVariants: false,
          variantRows: [],
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
    if (!isEdit && draft.hasVariants && draft.variantRows.length === 0) return;
    if (!isEdit && draft.hasVariants && draft.variantRows.some((r) => !r.retailerIdSuffix.trim())) {
      toast.error(t("Each variant row needs a unique suffix", "كل صف متغير يحتاج لاحقة فريدة"));
      return;
    }
    setSaving(true);
    try {
      const baseFields = {
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
        salePriceEffectiveDate: draft.salePriceEffectiveDate.trim() || undefined,
        videoUrl: draft.videoUrl.trim() || undefined,
        customLabels: (() => {
          const arr = [draft.customLabel0, draft.customLabel1, draft.customLabel2, draft.customLabel3, draft.customLabel4].map(s => s.trim());
          return arr.some(Boolean) ? arr : undefined;
        })(),
        customNumbers: (() => {
          const arr = [draft.customNumber0, draft.customNumber1, draft.customNumber2, draft.customNumber3, draft.customNumber4].map(s => s.trim());
          return arr.some(Boolean) ? arr : undefined;
        })(),
      };
      if (isEdit) {
        await updateProduct({
          productId: editingProduct!._id,
          ...baseFields,
          itemGroupId: draft.itemGroupId.trim() || undefined,
          color: draft.color.trim() || undefined,
          size: draft.size.trim() || undefined,
          material: draft.material.trim() || undefined,
          pattern: draft.pattern.trim() || undefined,
          gender: draft.gender || undefined,
          ageGroup: draft.ageGroup || undefined,
        });
        toast.success(t("Product updated", "تم تحديث المنتج"));
      } else if (draft.hasVariants && draft.variantRows.length > 0) {
        const groupId = draft.itemGroupId.trim() || draft.retailerId.trim();
        for (const row of draft.variantRows) {
          await createProduct({
            catalogDocId,
            retailerId: `${draft.retailerId.trim()}-${row.retailerIdSuffix.trim()}`,
            ...baseFields,
            itemGroupId: groupId,
            color: row.color.trim() || undefined,
            size: row.size.trim() || undefined,
            material: row.material.trim() || undefined,
            pattern: row.pattern.trim() || undefined,
          });
        }
        toast.success(
          draft.variantRows.length === 1
            ? t("1 variant added", "تمت إضافة متغير واحد")
            : t(`${draft.variantRows.length} variants added`, `تمت إضافة ${draft.variantRows.length} متغيرات`),
        );
        setDraft(EMPTY_DRAFT);
        setImagePreview(null);
      } else {
        await createProduct({
          catalogDocId,
          retailerId: draft.retailerId.trim(),
          ...baseFields,
          itemGroupId: draft.itemGroupId.trim() || undefined,
          color: draft.color.trim() || undefined,
          size: draft.size.trim() || undefined,
          material: draft.material.trim() || undefined,
          pattern: draft.pattern.trim() || undefined,
          gender: draft.gender || undefined,
          ageGroup: draft.ageGroup || undefined,
        });
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 rounded-[28px] border-0 overflow-hidden bg-white/95 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.18)] dark:bg-[#1C1C1E]/95">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]">
          <DialogTitle className="text-[17px] font-semibold tracking-[-0.3px] text-[#1D1D1F] dark:text-white">
            {isEdit ? t("Edit Product", "تعديل المنتج") : t("Add Product", "إضافة منتج")}
          </DialogTitle>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            {t(
              "Fields marked * are required by Meta's catalog schema.",
              "الحقول المحددة بـ * مطلوبة في مخطط كتالوج Meta.",
            )}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 space-y-5 pb-2 pt-4">

            {/* ── Image section ──────────────────────────────────────── */}
            <div className="flex gap-4">
              <div className="shrink-0">
                <div
                  className="size-36 rounded-2xl border-2 border-dashed border-black/[0.12] bg-black/[0.03] flex items-center justify-center overflow-hidden relative cursor-pointer group hover:border-[#0071E3]/50 transition-colors dark:border-white/[0.10] dark:bg-white/[0.03]"
                  onClick={() => !imageUploading && fileInputRef.current?.click()}
                >
                  {imageUploading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/50 flex items-center justify-center z-10">
                      <Loader2Icon className="size-5 animate-spin text-[#0071E3]" />
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
                    <div className="flex flex-col items-center gap-1.5 text-[#6E6E73] group-hover:text-[#0071E3] transition-colors">
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
                      className="absolute top-1.5 end-1.5 size-5 rounded-full bg-white/90 dark:bg-black/60 flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors z-10 shadow-sm"
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

              <div className="flex-1 space-y-2 min-w-0">
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-img">{t("Image URL", "رابط الصورة")}</label>
                  <input
                    id="pf-img"
                    value={draft.imageUrl}
                    onChange={handleUrlChange}
                    placeholder="https://example.com/product.jpg"
                    dir="ltr"
                    className={INPUT + (imageError ? " !border-[#FF3B30]" : "")}
                  />
                  {imageError && (
                    <p className="text-[12px] text-[#FF3B30]">
                      {t("Could not load image from this URL", "تعذّر تحميل الصورة من هذا الرابط")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#0071E3] hover:text-[#0077ED] disabled:opacity-50 transition-colors"
                >
                  <UploadCloudIcon className="size-3.5" />
                  {imageUploading
                    ? t("Uploading…", "جارٍ الرفع…")
                    : t("Or upload from your device", "أو ارفع من جهازك")}
                </button>
                <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3.5 py-2.5 text-[12px] text-[#6E6E73] space-y-1">
                  <p className="font-medium text-[#1D1D1F] dark:text-white/70">{t("Meta image requirements", "متطلبات صورة Meta")}</p>
                  <p>· {t("Min 500 × 500 px (1024 × 1024 recommended)", "الحد الأدنى 500 × 500 بكسل (يوصى بـ 1024 × 1024)")}</p>
                  <p>· {t("JPG, PNG or GIF — max 8 MB", "JPG أو PNG أو GIF — الحد الأقصى 8 ميجابايت")}</p>
                  <p>· {t("Clear product shot, no promotional text", "صورة واضحة للمنتج، بدون نص إعلاني")}</p>
                </div>
              </div>
            </div>

            {/* ── Additional Images ──────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className={SEC}>{t("Additional Images", "صور إضافية")}</p>
                <span className="text-[12px] text-[#6E6E73]">{draft.additionalImages.length}/9</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {draft.additionalImages.map((url, idx) => (
                  <div key={idx} className="relative size-16 rounded-xl border border-black/[0.08] overflow-hidden group shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(idx)}
                      className="absolute top-0.5 end-0.5 size-4 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FF3B30] hover:text-white"
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
                    className="size-16 rounded-xl border-2 border-dashed border-black/[0.12] dark:border-white/[0.10] flex flex-col items-center justify-center gap-0.5 text-[#6E6E73] hover:text-[#0071E3] hover:border-[#0071E3]/40 transition-colors disabled:opacity-50"
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

            <div className={DIVIDER} />

            {/* ── Identity ──────────────────────────────────────────── */}
            <div className="space-y-3">
              {!isEdit && (
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-retailerId">
                    {t("Retailer ID", "معرّف البائع")} *
                  </label>
                  <input
                    id="pf-retailerId"
                    value={draft.retailerId}
                    onChange={field("retailerId")}
                    placeholder="SKU-001"
                    dir="ltr"
                    className={INPUT + " font-mono"}
                    required
                    maxLength={100}
                  />
                  <p className="text-[12px] text-[#6E6E73]">
                    {t(
                      "Must match product_retailer_id in your Meta catalog. Max 100 chars.",
                      "يجب أن يطابق product_retailer_id في كتالوج Meta الخاص بك. الحد الأقصى 100 حرف.",
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={LBL} htmlFor="pf-name">{t("Product Name", "اسم المنتج")} *</label>
                  <span className={`text-[12px] ${nameLen > 170 ? "text-amber-500" : "text-[#6E6E73]"}`}>
                    {nameLen}/200
                  </span>
                </div>
                <input
                  id="pf-name"
                  value={draft.name}
                  onChange={field("name")}
                  placeholder={t("e.g. Nike Air Max 270", "مثال: نايكي اير ماكس 270")}
                  required
                  maxLength={200}
                  className={INPUT}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={LBL} htmlFor="pf-desc">{t("Description", "الوصف")} *</label>
                  <span className={`text-[12px] ${descLen > 9000 ? "text-amber-500" : "text-[#6E6E73]"}`}>
                    {descLen}/9,999
                  </span>
                </div>
                <Textarea
                  id="pf-desc"
                  value={draft.description}
                  onChange={field("description")}
                  placeholder={t("Describe the product — material, size, features…", "صف المنتج — الخامة، الحجم، المميزات…")}
                  className="min-h-20 resize-none rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 py-2.5 text-[14px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73] dark:bg-white/[0.05] dark:border-white/[0.10] dark:text-white dark:placeholder:text-white/40"
                  maxLength={9999}
                />
              </div>
            </div>

            <div className={DIVIDER} />

            {/* ── Pricing ───────────────────────────────────────────── */}
            <div className="space-y-2">
              <p className={SEC}>{t("Pricing", "التسعير")}</p>
              <div className="grid grid-cols-[1fr_76px_1fr] gap-3 items-end">
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-price">{t("Price", "السعر")} *</label>
                  <input
                    id="pf-price"
                    value={draft.price}
                    onChange={field("price")}
                    placeholder="99.99"
                    dir="ltr"
                    inputMode="decimal"
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-currency">{t("Currency", "العملة")} *</label>
                  <input
                    id="pf-currency"
                    value={draft.currency}
                    onChange={field("currency")}
                    placeholder="EGP"
                    dir="ltr"
                    maxLength={3}
                    className={INPUT + " uppercase"}
                  />
                </div>
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-salePrice">{t("Sale Price", "سعر التخفيض")}</label>
                  <input
                    id="pf-salePrice"
                    value={draft.salePrice}
                    onChange={field("salePrice")}
                    placeholder={t("e.g. 79.99", "مثال: 79.99")}
                    dir="ltr"
                    inputMode="decimal"
                    className={INPUT}
                  />
                </div>
              </div>
              <p className="text-[12px] text-[#6E6E73]">
                {t(
                  "Sale price must be lower than the regular price. Currency: ISO-4217 code (e.g. EGP, USD).",
                  "سعر التخفيض يجب أن يكون أقل من السعر الأصلي. العملة: رمز ISO-4217 (مثال: EGP، USD).",
                )}
              </p>
            </div>

            <div className={DIVIDER} />

            {/* ── Classification ────────────────────────────────────── */}
            <div className="space-y-2">
              <p className={SEC}>{t("Classification", "التصنيف")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LBL}>{t("Availability", "التوفر")} *</label>
                  <Select
                    value={draft.availability}
                    onValueChange={(v) => setField("availability", v ?? "in stock")}
                  >
                    <SelectTrigger className={SELECT_TRIGGER}>
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
                  <label className={LBL}>{t("Condition", "الحالة")} *</label>
                  <Select
                    value={draft.condition}
                    onValueChange={(v) => setField("condition", v ?? "new")}
                  >
                    <SelectTrigger className={SELECT_TRIGGER}>
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

            <div className={DIVIDER} />

            {/* ── Optional extras ───────────────────────────────────── */}
            <div className="space-y-3">
              <p className={SEC}>{t("Additional Info", "معلومات إضافية")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-brand">
                    <TagIcon className="size-3 inline me-1" />
                    {t("Brand", "الماركة")}
                  </label>
                  <input
                    id="pf-brand"
                    value={draft.brand}
                    onChange={field("brand")}
                    placeholder={t("e.g. Nike", "مثال: نايكي")}
                    maxLength={100}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className={LBL} htmlFor="pf-url">
                    <LinkIcon className="size-3 inline me-1" />
                    {t("Product URL", "رابط المنتج")}
                  </label>
                  <input
                    id="pf-url"
                    value={draft.productUrl}
                    onChange={field("productUrl")}
                    placeholder="https://your-store.com/product"
                    dir="ltr"
                    type="url"
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            <div className={DIVIDER} />

            {/* ── Variants ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={SEC}>{t("Variants", "المتغيرات")}</p>
                  <p className="text-[12px] text-[#6E6E73] mt-0.5">
                    {draft.hasVariants && !isEdit
                      ? t(
                          "Each row below creates a separate product. All share the same name, price, and image.",
                          "كل صف أدناه ينشئ منتجًا منفصلاً. تتشارك جميع الصفوف الاسم والسعر والصورة.",
                        )
                      : t(
                          "Does this product come in different colors, sizes, or materials?",
                          "هل يأتي هذا المنتج بألوان أو مقاسات أو خامات مختلفة؟",
                        )}
                  </p>
                </div>
                {!isEdit && (
                  <Switch
                    checked={draft.hasVariants}
                    onCheckedChange={(v) => setField("hasVariants", v)}
                  />
                )}
              </div>

              {draft.hasVariants && !isEdit ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className={LBL} htmlFor="pf-itemGroupId">{t("Item Group ID", "معرّف مجموعة المتغيرات")}</label>
                    <input
                      id="pf-itemGroupId"
                      value={draft.itemGroupId}
                      onChange={field("itemGroupId")}
                      placeholder={t(
                        "Auto-filled from Retailer ID if empty",
                        "يُعبَّأ تلقائياً من معرّف البائع إن تُرك فارغاً",
                      )}
                      dir="ltr"
                      className={INPUT + " font-mono"}
                      maxLength={100}
                    />
                  </div>

                  <div className="grid grid-cols-[88px_1fr_1fr_1fr_1fr_28px] gap-1.5 px-0.5">
                    {[
                      t("Suffix *", "اللاحقة *"),
                      t("Color", "اللون"),
                      t("Size", "المقاس"),
                      t("Material", "الخامة"),
                      t("Pattern", "النمط"),
                      "",
                    ].map((h, i) => (
                      <span key={i} className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">{h}</span>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    {draft.variantRows.map((row, idx) => (
                      <VariantRowInput
                        key={row._key}
                        row={row}
                        onChange={(updated) =>
                          setDraft((d) => ({
                            ...d,
                            variantRows: d.variantRows.map((r, i) => (i === idx ? updated : r)),
                          }))
                        }
                        onRemove={() =>
                          setDraft((d) => ({
                            ...d,
                            variantRows: d.variantRows.filter((_, i) => i !== idx),
                          }))
                        }
                      />
                    ))}
                    {draft.variantRows.length === 0 && (
                      <p className="text-[13px] text-[#6E6E73] text-center py-3 border border-dashed border-black/[0.10] dark:border-white/[0.10] rounded-xl">
                        {t("No variants yet — click Add Variant below", "لا توجد متغيرات بعد — انقر على إضافة متغير أدناه")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className={BTN_SM}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        variantRows: [
                          ...d.variantRows,
                          {
                            _key: Math.random().toString(36).slice(2),
                            retailerIdSuffix: "",
                            color: "",
                            size: "",
                            material: "",
                            pattern: "",
                          },
                        ],
                      }))
                    }
                  >
                    <PlusIcon className="size-3.5" />
                    {t("Add Variant", "إضافة متغير")}
                  </button>

                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3.5 py-2.5 text-[12px] text-[#6E6E73] space-y-1">
                    <p>
                      · {t(
                        'Suffix appended to Retailer ID — e.g. base "SKU-001" + suffix "red-xl" → "SKU-001-red-xl"',
                        'اللاحقة تُضاف لمعرّف البائع — مثال: الأساس "SKU-001" + اللاحقة "red-xl" → "SKU-001-red-xl"',
                      )}
                    </p>
                    <p>
                      · {t(
                        "Each row is a separate product in Meta Commerce Manager, grouped as variants.",
                        "كل صف منتج منفصل في Meta Commerce Manager، مجمَّعة كمتغيرات.",
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className={LBL} htmlFor="pf-itemGroupId">{t("Item Group ID", "معرّف مجموعة المتغيرات")}</label>
                    <input
                      id="pf-itemGroupId"
                      value={draft.itemGroupId}
                      onChange={field("itemGroupId")}
                      placeholder={t("e.g. nike-air-max-270", "مثال: nike-air-max-270")}
                      dir="ltr"
                      className={INPUT + " font-mono"}
                      maxLength={100}
                    />
                    <p className="text-[12px] text-[#6E6E73]">
                      {t("Leave empty if this product has no variants.", "اتركه فارغاً إذا لم تكن لهذا المنتج متغيرات.")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={LBL} htmlFor="pf-color">{t("Color", "اللون")}</label>
                      <input id="pf-color" value={draft.color} onChange={field("color")} placeholder={t("e.g. Red", "مثال: أحمر")} maxLength={100} className={INPUT} />
                    </div>
                    <div className="space-y-1">
                      <label className={LBL} htmlFor="pf-size">{t("Size", "المقاس")}</label>
                      <input id="pf-size" value={draft.size} onChange={field("size")} placeholder={t("e.g. XL, 42", "مثال: XL، 42")} maxLength={100} className={INPUT} />
                    </div>
                    <div className="space-y-1">
                      <label className={LBL} htmlFor="pf-material">{t("Material", "الخامة")}</label>
                      <input id="pf-material" value={draft.material} onChange={field("material")} placeholder={t("e.g. Cotton", "مثال: قطن")} maxLength={100} className={INPUT} />
                    </div>
                    <div className="space-y-1">
                      <label className={LBL} htmlFor="pf-pattern">{t("Pattern", "النمط")}</label>
                      <input id="pf-pattern" value={draft.pattern} onChange={field("pattern")} placeholder={t("e.g. Striped", "مثال: مقلّم")} maxLength={100} className={INPUT} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={LBL}>{t("Gender", "الجنس")}</label>
                      <Select value={draft.gender} onValueChange={(v) => setField("gender", v ?? "")}>
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <span>{GENDER_OPTIONS.find(o => o.value === draft.gender)?.labelEn ?? "— None —"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((o) => (
                            <SelectItem key={o.value || "__none__"} value={o.value}>{o.labelEn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className={LBL}>{t("Age Group", "الفئة العمرية")}</label>
                      <Select value={draft.ageGroup} onValueChange={(v) => setField("ageGroup", v ?? "")}>
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <span>{AGE_GROUP_OPTIONS.find(o => o.value === draft.ageGroup)?.labelEn ?? "— None —"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_GROUP_OPTIONS.map((o) => (
                            <SelectItem key={o.value || "__none__"} value={o.value}>{o.labelEn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={DIVIDER} />

            {/* ── Advanced / Meta optional fields ───────────────────── */}
            <div className="space-y-3">
              <p className={SEC}>{t("Advanced Fields", "الحقول المتقدمة")}</p>

              <div className="space-y-2">
                <label className={LBL}>{t("Sale Price Effective Date", "فترة سريان سعر التخفيض")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6E6E73]">{t("Start", "البداية")}</p>
                    <input
                      type="datetime-local"
                      dir="ltr"
                      className={INPUT}
                      value={draft.salePriceEffectiveDate.split("/")[0]?.replace(/\+.*$/, "") ?? ""}
                      onChange={(e) => {
                        const start = e.target.value;
                        const end = draft.salePriceEffectiveDate.split("/")[1]?.replace(/\+.*$/, "") ?? "";
                        setField("salePriceEffectiveDate", start || end ? `${start ? `${start}+00:00` : ""}/${end ? `${end}+00:00` : ""}` : "");
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6E6E73]">{t("End", "النهاية")}</p>
                    <input
                      type="datetime-local"
                      dir="ltr"
                      className={INPUT}
                      value={draft.salePriceEffectiveDate.split("/")[1]?.replace(/\+.*$/, "") ?? ""}
                      onChange={(e) => {
                        const end = e.target.value;
                        const start = draft.salePriceEffectiveDate.split("/")[0]?.replace(/\+.*$/, "") ?? "";
                        setField("salePriceEffectiveDate", start || end ? `${start ? `${start}+00:00` : ""}/${end ? `${end}+00:00` : ""}` : "");
                      }}
                    />
                  </div>
                </div>
                <p className="text-[12px] text-[#6E6E73]">
                  {t("Leave both empty for an indefinite sale.", "اتركهما فارغَين للبيع المفتوح.")}
                </p>
              </div>

              <div className="space-y-1">
                <label className={LBL} htmlFor="pf-video">{t("Product Video URL", "رابط فيديو المنتج")}</label>
                <input
                  id="pf-video"
                  value={draft.videoUrl}
                  onChange={field("videoUrl")}
                  placeholder="https://example.com/product.mp4"
                  dir="ltr"
                  type="url"
                  className={INPUT}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[12px] text-[#6E6E73] font-medium">
                  {t("Custom Labels (custom_label_0 … 4)", "تسميات مخصصة (custom_label_0 … 4)")}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {([0, 1, 2, 3, 4] as const).map((i) => {
                    const key = `customLabel${i}` as keyof ProductDraft;
                    return (
                      <div key={i} className="space-y-0.5">
                        <span className="text-[10px] text-[#6E6E73] font-medium">{i}</span>
                        <input
                          value={draft[key] as string}
                          onChange={field(key)}
                          placeholder="—"
                          className={INPUT_XS}
                          maxLength={100}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[12px] text-[#6E6E73] font-medium">
                  {t("Custom Numbers (custom_number_0 … 4)", "أرقام مخصصة (custom_number_0 … 4)")}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {([0, 1, 2, 3, 4] as const).map((i) => {
                    const key = `customNumber${i}` as keyof ProductDraft;
                    return (
                      <div key={i} className="space-y-0.5">
                        <span className="text-[10px] text-[#6E6E73] font-medium">{i}</span>
                        <input
                          value={draft[key] as string}
                          onChange={field(key)}
                          placeholder="—"
                          dir="ltr"
                          inputMode="numeric"
                          className={INPUT_XS + " font-mono"}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="h-2" />
          </div>

          <div className="shrink-0 border-t border-black/[0.06] dark:border-white/[0.06] px-6 py-4 flex items-center justify-end gap-2 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-sm">
            <button type="button" className={BTN_OUTLINE} onClick={() => onOpenChange(false)}>
              {t("Cancel", "إلغاء")}
            </button>
            <button
              type="submit"
              className={BTN_PRIMARY}
              disabled={
                saving ||
                imageUploading ||
                additionalImageUploading ||
                !draft.name.trim() ||
                (!isEdit && !draft.retailerId.trim()) ||
                (!isEdit && draft.hasVariants && draft.variantRows.length === 0)
              }
            >
              {saving && <Loader2Icon className="size-3.5 animate-spin" />}
              {isEdit
                ? t("Save Changes", "حفظ التغييرات")
                : draft.hasVariants && draft.variantRows.length > 0
                  ? t(`Add ${draft.variantRows.length} Variant${draft.variantRows.length > 1 ? "s" : ""}`, `إضافة ${draft.variantRows.length} متغير`)
                  : t("Add Product", "إضافة منتج")}
            </button>
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
  salePriceEffectiveDate?: string;
  videoUrl?: string;
  customLabels?: string[];
  customNumbers?: string[];
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
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] group transition-colors">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="size-10 rounded-xl object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="size-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
          <ShoppingBagIcon className="size-4 text-[#6E6E73]" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-medium text-[#1D1D1F] dark:text-white truncate">{product.name}</p>
          {product.source === "manual" && (
            <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
              {t("Manual", "يدوي")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#6E6E73]">
          <span dir="ltr" className="font-mono">{product.retailerId}</span>
          {product.price && (
            <span>
              {product.price}
              {product.currency ? ` ${product.currency}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className={BTN_ICON}
          title={t("Push to Meta", "رفع إلى Meta")}
          onClick={handlePush}
          disabled={pushing}
        >
          {pushing ? <Loader2Icon className="size-3.5 animate-spin" /> : <UploadCloudIcon className="size-3.5" />}
        </button>
        <button className={BTN_ICON} onClick={() => onEdit(product)}>
          <PencilIcon className="size-3.5" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger className={BTN_ICON + " hover:!bg-[#FF3B30]/10 hover:!text-[#FF3B30]"}>
            <Trash2Icon className="size-3.5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete product?", "حذف المنتج؟")}</AlertDialogTitle>
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
  activeCatalogId,
  isCatalogVisible,
  isCartEnabled,
}: {
  catalog: {
    _id: Id<"catalogs">;
    name: string;
    metaCatalogId: string;
    lastSyncedAt?: number;
  };
  channelId: Id<"channels">;
  activeCatalogId?: string;
  isCatalogVisible?: boolean;
  isCartEnabled?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(catalog.name);
  const [activating, setActivating] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [togglingCart, setTogglingCart] = useState(false);

  const isActive = activeCatalogId === catalog.metaCatalogId;

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
  const setCommerceSettings = useAction(api.actions.metaCatalogActions.setCommerceSettings);

  async function handleActivate() {
    setActivating(true);
    try {
      await setCommerceSettings({
        channelId,
        metaCatalogId: catalog.metaCatalogId,
        isVisible: true,
        isCartEnabled: true,
      });
      toast.success(t("Catalog activated in WhatsApp", "تم تفعيل الكتالوج في WhatsApp"));
    } catch (err) {
      toast.error(extractConvexMsg(err) || t("Failed to activate catalog", "فشل تفعيل الكتالوج"));
    } finally {
      setActivating(false);
    }
  }

  async function handleToggleVisibility(checked: boolean) {
    setTogglingVisibility(true);
    try {
      await setCommerceSettings({ channelId, isVisible: checked });
      toast.success(
        checked
          ? t("Catalog now visible to customers", "الكتالوج مرئي للعملاء الآن")
          : t("Catalog hidden from customers", "تم إخفاء الكتالوج عن العملاء"),
      );
    } catch (err) {
      toast.error(extractConvexMsg(err) || t("Failed to update visibility", "فشل تحديث الرؤية"));
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function handleToggleCart(checked: boolean) {
    setTogglingCart(true);
    try {
      await setCommerceSettings({ channelId, isCartEnabled: checked });
      toast.success(
        checked
          ? t("Cart enabled for customers", "تم تفعيل عربة التسوق للعملاء")
          : t("Cart disabled", "تم تعطيل عربة التسوق"),
      );
    } catch (err) {
      toast.error(extractConvexMsg(err) || t("Failed to update cart setting", "فشل تحديث إعداد العربة"));
    } finally {
      setTogglingCart(false);
    }
  }

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

      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.07] overflow-hidden bg-white dark:bg-[#1C1C1E]">
        {/* Catalog header */}
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 flex-1 min-w-0 text-start"
          >
            {expanded ? (
              <ChevronUpIcon className="size-4 shrink-0 text-[#6E6E73]" />
            ) : (
              <ChevronDownIcon className="size-4 shrink-0 text-[#6E6E73]" />
            )}
            {renaming ? (
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-7 flex-1 rounded-lg border border-black/[0.12] bg-black/[0.04] px-2.5 text-[14px] text-[#1D1D1F] outline-none focus:border-[#0071E3] dark:bg-white/[0.05] dark:border-white/[0.10] dark:text-white"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-[14px] font-medium text-[#1D1D1F] dark:text-white truncate">{catalog.name}</span>
            )}
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {isActive ? (
              <span className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-950 px-2.5 py-1 text-[12px] font-medium text-green-700 dark:text-green-300 shrink-0">
                <WifiIcon className="size-3" />
                {t("Active in WhatsApp", "نشط في واتساب")}
              </span>
            ) : (
              <button
                className={BTN_SM}
                onClick={(e) => { e.stopPropagation(); handleActivate(); }}
                disabled={activating}
              >
                {activating ? <Loader2Icon className="size-3 animate-spin" /> : <WifiIcon className="size-3" />}
                {t("Activate in WhatsApp", "تفعيل في واتساب")}
              </button>
            )}

            <span
              className="font-mono text-[11px] text-[#6E6E73] bg-black/[0.04] dark:bg-white/[0.05] rounded-lg px-2 py-1 cursor-pointer hover:bg-black/[0.07] transition-colors"
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
              <span className="text-[12px] text-[#6E6E73]">
                {syncStatus?.productCount ?? 0} {t("items", "منتج")}
              </span>
            )}

            <button
              className={BTN_ICON}
              title={t("Sync from Meta", "تزامن من Meta")}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? <Loader2Icon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
            </button>

            <button
              className={BTN_ICON}
              title={t("Rename catalog", "إعادة تسمية الكتالوج")}
              onClick={() => { setNameInput(catalog.name); setRenaming(true); }}
            >
              <PencilIcon className="size-3.5" />
            </button>

            <AlertDialog>
              <AlertDialogTrigger className={BTN_ICON + " hover:!bg-[#FF3B30]/10 hover:!text-[#FF3B30]"}>
                <Trash2Icon className="size-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Remove catalog?", "حذف الكتالوج؟")}</AlertDialogTitle>
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

        {/* WhatsApp commerce settings strip */}
        {isActive && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 bg-[#F0FBF0] dark:bg-green-950/20 border-t border-green-200/60 dark:border-green-900/40 text-[13px]">
            <p className="text-[#1D1D1F] dark:text-white/70 font-medium shrink-0">
              {t("WhatsApp Storefront", "واجهة المتجر")}
            </p>
            <div className="flex items-center gap-2">
              <Switch checked={isCatalogVisible ?? false} onCheckedChange={handleToggleVisibility} disabled={togglingVisibility} />
              <span className="flex items-center gap-1 text-[#6E6E73]">
                <EyeIcon className="size-3.5" />
                {t("Visible to customers", "مرئي للعملاء")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isCartEnabled ?? false} onCheckedChange={handleToggleCart} disabled={togglingCart} />
              <span className="flex items-center gap-1 text-[#6E6E73]">
                <ShoppingCartIcon className="size-3.5" />
                {t("Cart enabled", "عربة التسوق")}
              </span>
            </div>
          </div>
        )}

        {/* Expanded products section */}
        {expanded && (
          <div className="border-t border-black/[0.06] dark:border-white/[0.05] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#6E6E73]">{t("Last sync", "آخر تزامن")}: {lastSynced}</span>
              <button className={BTN_SM} onClick={openCreate}>
                <PlusIcon className="size-3.5" />
                {t("Add Product", "إضافة منتج")}
              </button>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search products…", "ابحث عن منتج…")}
              className={INPUT_SM}
            />

            {products === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-4 animate-spin text-[#6E6E73]" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShoppingBagIcon className="size-9 text-[#6E6E73]/40" />
                <p className="text-[14px] text-[#6E6E73]">
                  {q
                    ? t("No products found", "لا توجد منتجات")
                    : t("No products yet — add one or sync from Meta", "لا توجد منتجات — أضف منتجًا أو تزامن من Meta")}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.05]">
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
    <div className="rounded-2xl border border-dashed border-black/[0.10] dark:border-white/[0.08] p-4 space-y-4">
      <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-white/80">
        {t("Add existing catalog", "إضافة كتالوج موجود")}
      </p>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <label className={LBL}>{t("Meta Catalog ID", "معرّف كتالوج Meta")}</label>
          <input
            value={metaId}
            onChange={(e) => setMetaId(e.target.value)}
            placeholder="946395248008933"
            dir="ltr"
            className={INPUT_SM + " font-mono"}
          />
        </div>
        <div className="space-y-1">
          <label className={LBL}>{t("Display name", "الاسم")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Summer Collection", "مثال: مجموعة الصيف")}
            className={INPUT_SM}
          />
        </div>
      </div>
      <button
        className={BTN_SM}
        onClick={handleAdd}
        disabled={saving || !metaId.trim() || !name.trim()}
      >
        {saving && <Loader2Icon className="size-3.5 animate-spin" />}
        <PlusIcon className="size-3.5" />
        {t("Add Catalog", "إضافة الكتالوج")}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
        <span className="text-[12px] text-[#6E6E73]">{t("or", "أو")}</span>
        <div className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
      </div>

      <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-white/80">
        {t("Create new catalog in Meta", "إنشاء كتالوج جديد في Meta")}
      </p>
      <div className="flex gap-2">
        <input
          value={newCatalogName}
          onChange={(e) => setNewCatalogName(e.target.value)}
          placeholder={t("Catalog name", "اسم الكتالوج")}
          className={INPUT_SM}
        />
        <button
          className={BTN_SM}
          onClick={handleCreate}
          disabled={creating || !newCatalogName.trim()}
        >
          {creating && <Loader2Icon className="size-3.5 animate-spin" />}
          {t("Create in Meta", "إنشاء في Meta")}
        </button>
      </div>
      <p className="text-[12px] text-[#6E6E73]">
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
    isCatalogVisible?: boolean;
    isCartEnabled?: boolean;
  };
}) {
  const t = useT();
  const catalogs = useQuery(api.catalog.listCatalogs, { channelId: channel._id });

  if (catalogs === undefined) {
    return (
      <div className={CARD + " p-5"}>
        <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-white">{channel.displayName}</p>
        <div className="flex items-center justify-center py-6">
          <Loader2Icon className="size-4 animate-spin text-[#6E6E73]" />
        </div>
      </div>
    );
  }

  const legacyCatalogId =
    channel.catalogId &&
    !catalogs.some((c) => c.metaCatalogId === channel.catalogId)
      ? channel.catalogId
      : undefined;

  return (
    <div className={CARD}>
      {/* Channel header */}
      <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.05]">
        <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#1D1D1F] dark:text-white">{channel.displayName}</p>
        {channel.displayPhone && (
          <p className="text-[13px] text-[#6E6E73] mt-0.5" dir="ltr">
            {channel.displayPhone}
          </p>
        )}
      </div>

      {/* Catalog list */}
      <div className="p-4 space-y-2">
        {catalogs.length === 0 && !legacyCatalogId ? (
          <p className="text-[14px] text-[#6E6E73] text-center py-3">
            {t("No catalogs added yet", "لا توجد كتالوجات مضافة بعد")}
          </p>
        ) : (
          catalogs.map((catalog) => (
            <CatalogCard
              key={catalog._id}
              catalog={catalog}
              channelId={channel._id}
              activeCatalogId={channel.catalogId}
              isCatalogVisible={channel.isCatalogVisible}
              isCartEnabled={channel.isCartEnabled}
            />
          ))
        )}
      </div>

      {/* Add catalog form */}
      <div className="px-4 pb-4">
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
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-5 animate-spin text-[#6E6E73]" />
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <p className="text-[14px] text-[#6E6E73]">
        {t("No WhatsApp channels configured yet.", "لا توجد أرقام واتساب مضافة بعد.")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[#6E6E73] leading-relaxed">
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
