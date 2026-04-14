"use client";

import { useState } from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useOrganization, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SearchIcon,
  PlusIcon,
  UploadIcon,
  ArchiveIcon,
  DownloadIcon,
  TagIcon,
  ArchiveRestoreIcon,
  XIcon,
  PhoneIcon,
  LayoutGrid,
  Table as TableIcon,
  List as ListIcon,
} from "lucide-react";
import { ContactDetailSheet } from "./contact-detail-sheet";
import { AddContactDialog } from "./add-contact-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { BulkTagDialog } from "./bulk-tag-dialog";
import { ContactCardGrid } from "./contact-card-grid";
import { ContactTable } from "./contact-table";
import { ContactCompactList } from "./contact-compact-list";
import { cn } from "@/lib/utils";
import { type Stage, STAGE_CONFIG, STAGE_TABS } from "./contact-stage-config";

type ViewMode = "cards" | "table" | "compact";

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
    selected: (n: number) => `${n} محدد`,
    bulkTag: "إضافة وسوم",
    bulkArchive: "أرشفة",
    bulkUnarchive: "إلغاء أرشفة",
    bulkExport: "تصدير المحدد",
    selectAll: "تحديد الكل",
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
    selected: (n: number) => `${n} selected`,
    bulkTag: "Add Tags",
    bulkArchive: "Archive",
    bulkUnarchive: "Unarchive",
    bulkExport: "Export Selected",
    selectAll: "Select All",
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "cards";
    const stored = localStorage.getItem("contacts-view");
    if (stored === "cards" || stored === "table" || stored === "compact") return stored;
    return "cards";
  });

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
  const isStageFiltered = !isSearching && stageFilter !== "all";

  const archiveContact = useMutation(api.contacts.archive);
  const updateStage = useMutation(api.contacts.updateStage);

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

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("contacts-view", mode);
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

  const isLoading =
    (isSearching && searchResults === undefined) ||
    (isStageFiltered && stageContacts === undefined) ||
    (!isSearching && !isStageFiltered && listResults === undefined);

  const viewProps = {
    contacts,
    selected,
    locale,
    isLoading,
    onToggle: toggleSelect,
    onClick: handleRowClick,
    onViewProfile: (id: Id<"contacts">) => router.push(`/contacts/${id}`),
    onUpdateStage: (id: Id<"contacts">, stage: Stage) =>
      updateStage({ contactId: id, stage }).catch(() => {}),
  };

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

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center border rounded-lg p-0.5">
              {([
                { mode: "cards" as ViewMode, Icon: LayoutGrid, label: locale === "ar" ? "بطاقات" : "Cards" },
                { mode: "table" as ViewMode, Icon: TableIcon, label: locale === "ar" ? "جدول" : "Table" },
                { mode: "compact" as ViewMode, Icon: ListIcon, label: locale === "ar" ? "قائمة" : "List" },
              ]).map(({ mode, Icon, label: viewLabel }) => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  aria-label={viewLabel}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!isLoading && contacts.length === 0 ? (
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
            {viewMode === "cards" && <ContactCardGrid {...viewProps} />}
            {viewMode === "table" && <ContactTable {...viewProps} />}
            {viewMode === "compact" && <ContactCompactList {...viewProps} />}
            {!isLoading && results?.status === "CanLoadMore" && (
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
        locale={locale}
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
