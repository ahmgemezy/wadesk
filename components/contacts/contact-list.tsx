"use client";

import { useState } from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useOrganization, useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SearchIcon,
  PlusIcon,
  UploadIcon,
  ArchiveIcon,
  DownloadIcon,
  TagIcon,
  ArchiveRestoreIcon,
  XIcon,
  MapPinIcon,
  PhoneIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { ContactDetailSheet } from "./contact-detail-sheet";
import { AddContactDialog } from "./add-contact-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { BulkTagDialog } from "./bulk-tag-dialog";
import { cn } from "@/lib/utils";
import { getCountryFromPhone } from "@/lib/phoneGeo";

// ─── Stage config ─────────────────────────────────────────────────────────────

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGE_CONFIG: Record<Stage, { en: string; ar: string; color: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل",  color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  prospect: { en: "Prospect", ar: "مرشح",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  customer: { en: "Customer", ar: "عميل",         color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  retained: { en: "Retained", ar: "عميل دائم",   color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  churned:  { en: "Churned",  ar: "مفقود",        color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
};

const STAGE_TABS: (Stage | "all")[] = ["all", "lead", "prospect", "customer", "retained", "churned"];

const PAGE_SIZE = 24;

const t = {
  ar: {
    search: "بحث بالاسم أو رقم الهاتف...",
    add: "إضافة",
    addContact: "إضافة جهة اتصال",
    import: "استيراد",
    export: "تصدير",
    archived: "المؤرشف",
    showAll: "إظهار الكل",
    noContacts: "لا توجد جهات اتصال",
    loadMore: "تحميل المزيد",
    archivedBadge: "مؤرشف",
    selected: (n: number) => `${n} محدد`,
    bulkTag: "إضافة وسوم",
    bulkArchive: "أرشفة",
    bulkUnarchive: "إلغاء أرشفة",
    bulkExport: "تصدير المحدد",
    clearSelection: "إلغاء التحديد",
    conversations: "محادثة",
    noTags: "بدون وسوم",
    selectAll: "تحديد الكل",
    viewProfile: "عرض الملف",
    all: "الكل",
  },
  en: {
    search: "Search by name or phone...",
    add: "Add",
    addContact: "Add Contact",
    import: "Import",
    export: "Export",
    archived: "Archived",
    showAll: "Show All",
    noContacts: "No contacts found",
    loadMore: "Load More",
    archivedBadge: "Archived",
    selected: (n: number) => `${n} selected`,
    bulkTag: "Add Tags",
    bulkArchive: "Archive",
    bulkUnarchive: "Unarchive",
    bulkExport: "Export Selected",
    clearSelection: "Clear",
    conversations: "conv.",
    noTags: "No tags",
    selectAll: "Select All",
    viewProfile: "View Profile",
    all: "All",
  },
} as const;

interface ContactListProps {
  locale?: "ar" | "en";
}

export function ContactList({ locale = "ar" }: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Id<"contacts">>>(new Set());

  const router = useRouter();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const labels = t[locale];

  const { isLoaded, orgId } = useAuth();
  const hasOrg = isLoaded && !!orgId;

  const { membership } = useOrganization();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgRole = (membership as any)?.role as string | undefined;
  const isAdminOrSupervisor =
    orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";

  const isSearching = searchQuery.trim().length > 0;
  // When a stage tab is active (and not searching), use listByStage
  const isStageFiltered = !isSearching && stageFilter !== "all";

  const archiveContact = useMutation(api.contacts.archive);
  const updateStage = useMutation(api.contacts.updateStage);

  // Stage-filtered query (non-paginated — listByStage returns up to 500)
  const stageContacts = useQuery(
    api.contacts.listByStage,
    hasOrg && isStageFiltered ? { stage: stageFilter as Stage } : "skip",
  );

  const listResults = usePaginatedQuery(
    api.contacts.listForTenant,
    hasOrg && !isSearching && !isStageFiltered ? { includeArchived } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const searchResults = usePaginatedQuery(
    api.contacts.search,
    hasOrg && isSearching ? { query: searchQuery.trim(), includeArchived } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  // Unified contact list
  let contacts: Doc<"contacts">[] = [];
  if (isSearching) {
    contacts = (searchResults?.results ?? []) as Doc<"contacts">[];
  } else if (isStageFiltered) {
    contacts = (stageContacts ?? []) as Doc<"contacts">[];
  } else {
    contacts = (listResults?.results ?? []) as Doc<"contacts">[];
  }

  const results = isSearching ? searchResults : isStageFiltered ? null : listResults;

  function handleRowClick(contactId: Id<"contacts">) {
    setSelectedContactId(contactId);
    setSheetOpen(true);
  }

  function toggleSelect(id: Id<"contacts">) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c) => c._id)));
    }
  }

  const selectedContacts = contacts.filter((c) => selected.has(c._id));

  function handleExportCsv(subset?: Doc<"contacts">[]) {
    const list = subset ?? contacts;
    if (list.length === 0) return;
    const rows = [
      ["name", "phone", "country", "city", "category", "spent", "tags", "notes"],
      ...list.map((c) => [
        c.customName ?? c.displayName ?? "",
        c.phone,
        c.country ?? "",
        c.city ?? "",
        c.category ?? "",
        c.spent != null ? String(c.spent) : "",
        c.tags.join(";"),
        c.notes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkArchive(archive: boolean) {
    await Promise.all(
      [...selected].map((id) => archiveContact({ contactId: id, archive })),
    );
    setSelected(new Set());
  }

  const hasArchived = selectedContacts.some((c) => c.isArchived);
  const hasActive = selectedContacts.some((c) => !c.isArchived);

  const isLoading = results === undefined;

  return (
    <div dir={dir} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b space-y-2 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute inset-s-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.search}
              className="ps-9"
            />
          </div>
          {isAdminOrSupervisor && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <PlusIcon className="size-4 me-1" />
                {labels.add}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <UploadIcon className="size-4 me-1" />
                {labels.import}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCsv()}
            disabled={contacts.length === 0}
          >
            <DownloadIcon className="size-4 me-1" />
            {labels.export}
          </Button>
        </div>

        {/* Stage filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {STAGE_TABS.map((tab) => {
            const isActive = stageFilter === tab;
            const cfg = tab !== "all" ? STAGE_CONFIG[tab] : null;
            return (
              <button
                key={tab}
                onClick={() => { setStageFilter(tab); setSelected(new Set()); }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {tab === "all"
                  ? labels.all
                  : locale === "ar" ? cfg!.ar : cfg!.en}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isStageFiltered && (
              <Button
                variant={includeArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludeArchived(!includeArchived)}
              >
                <ArchiveIcon className="size-4 me-1" />
                {includeArchived ? labels.showAll : labels.archived}
              </Button>
            )}
            {contacts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-muted-foreground">
                <Checkbox
                  checked={selected.size === contacts.length && contacts.length > 0}
                  className="me-2"
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={toggleSelectAll}
                />
                {labels.selectAll}
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
              <span className="text-xs font-medium text-primary me-1">{labels.selected(selected.size)}</span>
              {isAdminOrSupervisor && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setBulkTagOpen(true)}>
                  <TagIcon className="size-3 me-1" />
                  {labels.bulkTag}
                </Button>
              )}
              {isAdminOrSupervisor && hasActive && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleBulkArchive(true)}>
                  <ArchiveIcon className="size-3 me-1" />
                  {labels.bulkArchive}
                </Button>
              )}
              {isAdminOrSupervisor && hasArchived && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleBulkArchive(false)}>
                  <ArchiveRestoreIcon className="size-3 me-1" />
                  {labels.bulkUnarchive}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleExportCsv(selectedContacts)}>
                <DownloadIcon className="size-3 me-1" />
                {labels.bulkExport}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(new Set())}>
                <XIcon className="size-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div key={i} variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}>
                <Skeleton className="h-48 rounded-xl" />
              </motion.div>
            ))}
          </motion.div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <PhoneIcon className="size-7 opacity-40" />
            </div>
            <p>{labels.noContacts}</p>
            {isAdminOrSupervisor && !isSearching && (
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <PlusIcon className="size-4 me-1" />
                {labels.addContact}
              </Button>
            )}
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {contacts.map((contact) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    key={contact._id}
                  >
                    <ContactCard
                      contact={contact}
                      isSelected={selected.has(contact._id)}
                      archivedLabel={labels.archivedBadge}
                      noTagsLabel={labels.noTags}
                      conversationsLabel={labels.conversations}
                      viewProfileLabel={labels.viewProfile}
                      locale={locale}
                      onToggle={() => toggleSelect(contact._id)}
                      onClick={handleRowClick}
                      onViewProfile={(id) => router.push(`/contacts/${id}`)}
                      onUpdateStage={(id, stage) => updateStage({ contactId: id, stage }).catch(()=>{})}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            {results?.status === "CanLoadMore" && (
              <div className="pt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => results.loadMore(PAGE_SIZE)}>
                  {labels.loadMore}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ContactDetailSheet
        contactId={selectedContactId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
      />

      <CsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onComplete={() => setImportDialogOpen(false)}
      />

      <AddContactDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        locale={locale}
        onSuccess={(contactId) => {
          setSelectedContactId(contactId);
          setSheetOpen(true);
        }}
      />

      <BulkTagDialog
        open={bulkTagOpen}
        onOpenChange={setBulkTagOpen}
        contactIds={[...selected]}
        locale={locale}
        onDone={() => { setBulkTagOpen(false); setSelected(new Set()); }}
      />
    </div>
  );
}

// ─── Contact Card ────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: Doc<"contacts">;
  isSelected: boolean;
  archivedLabel: string;
  noTagsLabel: string;
  conversationsLabel: string;
  viewProfileLabel: string;
  locale: "ar" | "en";
  onToggle: () => void;
  onClick: (id: Id<"contacts">) => void;
  onViewProfile: (id: Id<"contacts">) => void;
  onUpdateStage?: (id: Id<"contacts">, stage: Stage) => void;
}

function ContactCard({
  contact,
  isSelected,
  archivedLabel,
  noTagsLabel,
  conversationsLabel,
  viewProfileLabel,
  locale,
  onToggle,
  onClick,
  onViewProfile,
  onUpdateStage,
}: ContactCardProps) {
  const stage = (contact.stage ?? "lead") as Stage;
  const stageCfg = STAGE_CONFIG[stage];
  const initials = (contact.customName ?? contact.displayName ?? contact.phone)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const avatarColors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const colorIndex = contact.phone.charCodeAt(contact.phone.length - 1) % avatarColors.length;

  return (
    <div
      onClick={() => onClick(contact._id)}
      className={cn(
        "group relative rounded-xl border bg-card p-4 cursor-pointer",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30",
        "dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
        "transform-3d",
        isSelected && "border-primary ring-1 ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
        contact.isArchived && "opacity-60",
      )}
      style={{
        perspective: "1000px",
      }}
    >
      {/* Checkbox */}
      <div
        className="absolute top-3 inset-s-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className={cn(
            "transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />
      </div>

      {/* Stage badge + archived badge */}
      <div className="absolute top-3 inset-e-3 flex flex-col items-end gap-1">
        {contact.isArchived && (
          <Badge variant="outline" className="text-xs">
            {archivedLabel}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:ring-2 hover:ring-primary/20",
                  stageCfg.color
                )}
              />
            }
          >
            {locale === "ar" ? stageCfg.ar : stageCfg.en}
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {STAGE_TABS.filter((t) => t !== "all").map((tab) => {
              const cfg = STAGE_CONFIG[tab as Stage];
              return (
                <DropdownMenuItem
                  key={tab}
                  className="text-xs focus:bg-primary/5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStage?.(contact._id, tab as Stage);
                  }}
                >
                  <div className={cn("size-2 rounded-full me-2", cfg.color.replace(/bg-([a-z]+)-100.*/, 'bg-$1-500'))} />
                  {locale === "ar" ? cfg.ar : cfg.en}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={cn(
          "size-14 rounded-full bg-linear-to-br flex items-center justify-center text-white font-semibold text-lg shadow-inner",
          avatarColors[colorIndex],
        )}>
          {initials || "?"}
        </div>

        {/* Name */}
        <div className="text-center min-w-0 w-full">
          <p className="font-medium text-sm truncate">
            {contact.customName ?? contact.displayName}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
            {contact.phone}
          </p>
        </div>
      </div>

      {/* Meta row */}
      {(() => {
        const geo = getCountryFromPhone(contact.phone);
        const countryIso = geo?.countryIso ?? null;
        const hasLocation = contact.city || countryIso;
        return (
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            {hasLocation && (
              <span className="flex items-center gap-1 truncate">
                <MapPinIcon className="size-3 shrink-0" />
                {[contact.city, countryIso].filter(Boolean).join(", ")}
              </span>
            )}
            {contact.category && (
              <Badge variant="secondary" className="text-xs font-normal">
                {contact.category}
              </Badge>
            )}
          </div>
        );
      })()}

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1 justify-center min-h-5.5">
        {contact.tags.length > 0 ? (
          <>
            {contact.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {contact.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{contact.tags.length - 2}
              </Badge>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground/50">{noTagsLabel}</span>
        )}
      </div>

      {/* Spend */}
      {contact.spent != null && (
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-emerald-500">
            ${contact.spent.toLocaleString()}
          </span>
        </div>
      )}

      {/* View Profile link */}
      <div
        className="mt-3 flex justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onViewProfile(contact._id)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLinkIcon className="size-3" />
          {viewProfileLabel}
        </button>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-linear-to-br from-primary/5 to-transparent" />
    </div>
  );
}
