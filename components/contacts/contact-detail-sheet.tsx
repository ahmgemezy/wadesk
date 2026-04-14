"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useOrganization } from "@clerk/nextjs";
import { getCountryFromPhone } from "@/lib/phoneGeo";
import { getCitiesForCountry, OTHER_CITY_VALUE } from "@/lib/cityData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  PhoneIcon,
  MapPinIcon,
  TagIcon,
  FolderIcon,
  DollarSignIcon,
  MessageSquareIcon,
  CheckIcon,
  SendIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const tl = {
  ar: {
    title: "ملف جهة الاتصال",
    notFound: "لم يتم العثور على جهة الاتصال",
    phone: "رقم الهاتف",
    conversations: "المحادثات",
    tags: "الوسوم",
    notes: "ملاحظات",
    country: "الدولة",
    city: "المدينة",
    category: "الفئة",
    spent: "إجمالي الإنفاق",
    customFields: "حقول مخصصة",
    conversationLog: "سجل المحادثات",
    noTags: "بدون وسوم",
    noNotes: "بدون ملاحظات",
    noCustomFields: "لا توجد حقول مخصصة",
    noConversations: "لا توجد محادثات",
    namePlaceholder: "الاسم",
    tagsPlaceholder: "وسوم مفصولة بفواصل",
    notesPl: "أضف ملاحظات...",
    keyPl: "المفتاح",
    valuePl: "القيمة",
    save: "حفظ",
    cancel: "إلغاء",
    archive: "أرشفة",
    unarchive: "إلغاء الأرشفة",
    open: "مفتوح",
    pending: "معلق",
    resolved: "مغلق",
    addField: "إضافة حقل",
    journeyStage: "مرحلة الرحلة",
    stageLead: "عميل محتمل",
    stageProspect: "مهتم",
    stageCustomer: "عميل",
    stageRetained: "عميل وفي",
    stageChurned: "خسرناه",
    lastEditedBy: "آخر تعديل",
    sendMessage: "إرسال رسالة",
    selectChannel: "اختر القناة",
    selectChannelDesc: "اختر القناة التي تريد بدء المحادثة منها",
    startConversation: "بدء المحادثة",
    noChannels: "لا توجد قنوات متاحة",
  },
  en: {
    title: "Contact Profile",
    notFound: "Contact not found",
    phone: "Phone",
    conversations: "Conversations",
    tags: "Tags",
    notes: "Notes",
    country: "Country",
    city: "City",
    category: "Category",
    spent: "Total Spent",
    customFields: "Custom Fields",
    conversationLog: "Conversation History",
    noTags: "No tags",
    noNotes: "No notes",
    noCustomFields: "No custom fields",
    noConversations: "No conversations",
    namePlaceholder: "Name",
    tagsPlaceholder: "Comma-separated tags",
    notesPl: "Add notes...",
    keyPl: "Key",
    valuePl: "Value",
    save: "Save",
    cancel: "Cancel",
    archive: "Archive",
    unarchive: "Unarchive",
    open: "Open",
    pending: "Pending",
    resolved: "Resolved",
    addField: "Add Field",
    journeyStage: "Journey Stage",
    stageLead: "Lead",
    stageProspect: "Prospect",
    stageCustomer: "Customer",
    stageRetained: "Retained",
    stageChurned: "Churned",
    lastEditedBy: "Last edited by",
    sendMessage: "Send Message",
    selectChannel: "Select Channel",
    selectChannelDesc: "Choose which channel to start the conversation from",
    startConversation: "Start Conversation",
    noChannels: "No channels available",
  },
};

interface ContactDetailSheetProps {
  contactId: Id<"contacts"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale?: "ar" | "en";
}

export function ContactDetailSheet({
  contactId,
  open,
  onOpenChange,
  locale = "ar",
}: ContactDetailSheetProps) {
  const l = tl[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const data = useQuery(api.contacts.getById, contactId ? { contactId } : "skip");
  const customFields = useQuery(api.customFields.list, contactId ? { contactId } : "skip");
  const conversations = useQuery(api.conversations.listForCaller, open ? {} : "skip");
  const updateContact = useMutation(api.contacts.update);
  const updateStage = useMutation(api.contacts.updateStage);
  const upsertField = useMutation(api.customFields.upsert);
  const deleteField = useMutation(api.customFields.delete_);
  const archiveContact = useMutation(api.contacts.archive);

  const router = useRouter();
  const channels = useQuery(api.channels.listForTenant);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);

  const { membership, memberships } = useOrganization({ memberships: { infinite: true } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgRole = (membership as any)?.role as string | undefined;
  const canEdit =
    orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor" || orgRole === "org:agent";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [city, setCity] = useState("");
  const [cityOther, setCityOther] = useState("");
  const [category, setCategory] = useState("");
  const [spent, setSpent] = useState("");
  const [spentCurrency, setSpentCurrency] = useState<"EGP" | "SAR" | "AED" | "USD">("USD");
  const [stage, setStage] = useState<string>("lead");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showNewField, setShowNewField] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null);
  const [startingConversation, setStartingConversation] = useState(false);

  const contact = data?.contact ?? null;

  function startEditing() {
    if (!contact) return;
    setName(contact.customName ?? "");
    setTags(contact.tags.join(", "));
    setNotes(contact.notes ?? "");
    const geo = getCountryFromPhone(contact.phone);
    const availableCities = getCitiesForCountry(geo?.countryIso ?? "");
    const storedCity = contact.city ?? "";
    if (storedCity && availableCities.length > 0 && !availableCities.includes(storedCity)) {
      setCity(OTHER_CITY_VALUE);
      setCityOther(storedCity);
    } else {
      setCity(storedCity);
      setCityOther("");
    }
    setCategory(contact.category ?? "");
    setSpent(contact.spent != null ? String(contact.spent) : "");
    setSpentCurrency((contact.spentCurrency as "EGP" | "SAR" | "AED" | "USD") ?? "USD");
    setStage(contact.stage ?? "lead");
    setEditing(true);
  }

  async function saveEdits() {
    if (!contact || !contactId) return;
    const patch: Record<string, unknown> = {};
    const newName = name.trim() || undefined;
    if (newName !== contact.customName) patch.customName = newName;
    const newTags = tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean);
    if (JSON.stringify(newTags) !== JSON.stringify(contact.tags)) patch.tags = newTags;
    if (notes.trim() !== (contact.notes ?? "")) patch.notes = notes.trim();
    const resolvedCity = city === OTHER_CITY_VALUE ? cityOther.trim() : city.trim();
    if (resolvedCity !== (contact.city ?? "")) patch.city = resolvedCity;
    if (category.trim() !== (contact.category ?? "")) patch.category = category.trim();
    const spentNum = spent.trim() ? parseFloat(spent) : undefined;
    if (spentNum !== contact.spent) patch.spent = spentNum;
    if (spentNum != null && spentCurrency !== (contact.spentCurrency ?? "USD")) patch.spentCurrency = spentCurrency;

    if (Object.keys(patch).length > 0) {
      await updateContact({ contactId, ...patch } as Parameters<typeof updateContact>[0]);
    }
    if (stage !== (contact.stage ?? "lead")) {
      await updateStage({ contactId, stage: stage as any });
    }
    setEditing(false);
  }

  async function handleStartConversation() {
    if (!contactId || !selectedChannelId) return;
    setStartingConversation(true);
    try {
      const convId = await getOrCreateConversation({
        contactId,
        channelId: selectedChannelId,
      });
      setShowChannelPicker(false);
      onOpenChange(false);
      router.push(`/inbox/${convId}`);
    } finally {
      setStartingConversation(false);
    }
  }

  function handleSendMessageClick() {
    if (!channels) return;
    if (channels.length === 1) {
      setSelectedChannelId(channels[0]._id);
      setShowChannelPicker(true);
    } else {
      setSelectedChannelId(null);
      setShowChannelPicker(true);
    }
  }

  async function handleAddField() {
    if (!contactId) return;
    const key = newFieldKey.trim();
    const value = newFieldValue.trim();
    if (!key) return;
    await upsertField({ contactId, key, value });
    setNewFieldKey("");
    setNewFieldValue("");
    setShowNewField(false);
  }

  const contactConversations = conversations?.filter((c) => c.contactId === contactId);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-xs p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle dir={dir}>
            {data === undefined ? <Skeleton className="h-5 w-36" /> : l.title}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-0">
          <div dir={dir} className="p-5 space-y-5">
            {data === undefined || customFields === undefined ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !contact ? (
              <p className="text-center text-muted-foreground py-8">{l.notFound}</p>
            ) : (
              <>
                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                    {(contact.customName ?? contact.displayName ?? contact.phone)
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("") || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={l.namePlaceholder}
                        className="text-base font-medium"
                      />
                    ) : (
                      <h3 className="text-base font-semibold truncate">
                        {contact.customName ?? contact.displayName}
                      </h3>
                    )}
                    <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
                      {contact.phone}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      {editing ? (
                        <>
                          <Button variant="default" size="icon-sm" onClick={saveEdits} aria-label={l.save}>
                            <CheckIcon className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(false)}>
                            <XIcon className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon-sm" onClick={startEditing} aria-label="Edit">
                          <PencilIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Send Message */}
                <Button
                  className="w-full"
                  onClick={handleSendMessageClick}
                  disabled={!channels || channels.length === 0}
                >
                  <SendIcon className="size-4 me-2" />
                  {l.sendMessage}
                </Button>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<MessageSquareIcon className="size-4" />} label={l.conversations} value={String(data?.conversationCount ?? 0)} />
                  {contact.spent != null && (
                    <StatCard icon={<DollarSignIcon className="size-4" />} label={l.spent} value={`${contact.spent.toLocaleString()} ${contact.spentCurrency ?? "USD"}`} highlight />
                  )}
                </div>

                <Separator />

                {/* Location + Category */}
                <Section label={locale === "ar" ? "التفاصيل" : "Details"}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={l.journeyStage as string} icon={<MapPinIcon className="size-3.5" />}>
                      {editing ? (
                        <Select value={stage} onValueChange={(v) => { if (v) setStage(v); }}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">{l.stageLead as string}</SelectItem>
                            <SelectItem value="prospect">{l.stageProspect as string}</SelectItem>
                            <SelectItem value="customer">{l.stageCustomer as string}</SelectItem>
                            <SelectItem value="retained">{l.stageRetained as string}</SelectItem>
                            <SelectItem value="churned">{l.stageChurned as string}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">
                            {contact.stage === "lead" ? l.stageLead :
                             contact.stage === "prospect" ? l.stageProspect :
                             contact.stage === "customer" ? l.stageCustomer :
                             contact.stage === "retained" ? l.stageRetained :
                             contact.stage === "churned" ? l.stageChurned : l.stageLead}
                          </span>
                          {contact.stageUpdatedBy && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {l.lastEditedBy as string}: {(() => {
                                const m = memberships?.data?.find(mem => mem.publicUserData?.userId === contact.stageUpdatedBy);
                                const r = m?.role === "org:admin" ? "Admin" : m?.role === "org:supervisor" ? "Supervisor" : m?.role === "org:agent" ? "Agent" : "";
                                return `${m?.publicUserData?.firstName ?? contact.stageUpdatedBy} ${r ? `(${r})` : ""}`;
                              })()}
                            </span>
                          )}
                        </div>
                      )}
                    </Field>

                    {/* Country — always read-only, auto-detected from phone */}
                    <Field label={l.country} icon={<MapPinIcon className="size-3.5" />}>
                      {(() => {
                        const geo = getCountryFromPhone(contact.phone);
                        return geo ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-xs font-mono">{geo.countryIso}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {locale === "ar" ? geo.countryAr : geo.countryEn}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        );
                      })()}
                    </Field>

                    {/* City — dropdown based on detected country */}
                    <Field label={l.city} icon={<MapPinIcon className="size-3.5" />}>
                      {editing ? (
                        <div className="space-y-1.5">
                          {(() => {
                            const geo = getCountryFromPhone(contact.phone);
                            const cities = getCitiesForCountry(geo?.countryIso ?? "");
                            if (cities.length === 0) {
                              return (
                                <Input
                                  value={city === OTHER_CITY_VALUE ? cityOther : city}
                                  onChange={(e) => {
                                    setCity(e.target.value);
                                    setCityOther("");
                                  }}
                                  placeholder={l.city}
                                  className="h-8 text-sm"
                                />
                              );
                            }
                            return (
                              <>
                                <Select
                                  value={city}
                                  onValueChange={(v) => {
                                    if (v) setCity(v);
                                    if (v && v !== OTHER_CITY_VALUE) setCityOther("");
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder={l.city} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {cities.map((c) => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                    <SelectItem value={OTHER_CITY_VALUE}>
                                      {locale === "ar" ? "أخرى..." : "Other..."}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {city === OTHER_CITY_VALUE && (
                                  <Input
                                    value={cityOther}
                                    onChange={(e) => setCityOther(e.target.value)}
                                    placeholder={locale === "ar" ? "اكتب المدينة" : "Type city name"}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-sm">{contact.city || "—"}</span>
                      )}
                    </Field>

                    <Field label={l.category} icon={<FolderIcon className="size-3.5" />}>
                      {editing ? (
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={l.category} className="h-8 text-sm" />
                      ) : (
                        <span className="text-sm">{contact.category || "—"}</span>
                      )}
                    </Field>
                    <Field label={l.spent} icon={<DollarSignIcon className="size-3.5" />}>
                      {editing ? (
                        <div className="flex flex-col gap-1.5" dir="ltr">
                          <Select value={spentCurrency} onValueChange={(v) => setSpentCurrency(v as "EGP" | "SAR" | "AED" | "USD")}>
                            <SelectTrigger className="h-8 text-sm w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EGP">EGP</SelectItem>
                              <SelectItem value="SAR">SAR</SelectItem>
                              <SelectItem value="AED">AED</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" type="number" className="h-8 text-sm w-full" dir="ltr" />
                        </div>
                      ) : (
                        <span className="text-sm" dir="ltr">
                          {contact.spent != null
                            ? `${contact.spent.toLocaleString()} ${contact.spentCurrency ?? "USD"}`
                            : "—"}
                        </span>
                      )}
                    </Field>
                  </div>
                </Section>

                <Separator />

                {/* Tags */}
                <Section label={l.tags} icon={<TagIcon className="size-3.5" />}>
                  {editing ? (
                    <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={l.tagsPlaceholder} />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">{l.noTags}</span>
                      )}
                    </div>
                  )}
                </Section>

                {/* Notes */}
                <Section label={l.notes}>
                  {editing ? (
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={l.notesPl} rows={3} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {contact.notes || l.noNotes}
                    </p>
                  )}
                </Section>

                <Separator />

                {/* Custom Fields */}
                <Section
                  label={l.customFields}
                  action={canEdit && !editing ? (
                    <Button variant="ghost" size="icon-sm" onClick={() => setShowNewField(true)}>
                      <PlusIcon className="size-4" />
                    </Button>
                  ) : undefined}
                >
                  <div className="space-y-2">
                    {customFields.map((field: Doc<"customFields">) => (
                      <div key={field._id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/40">
                        <span className="text-muted-foreground text-xs w-24 shrink-0 truncate">{field.key}</span>
                        <span className="flex-1 text-xs">{field.value}</span>
                        {canEdit && (
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteField({ customFieldId: field._id })}>
                            <Trash2Icon className="size-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {showNewField && (
                      <div className="flex items-center gap-2">
                        <Input value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} placeholder={l.keyPl} className="w-24 h-8 text-xs" />
                        <Input value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} placeholder={l.valuePl} className="flex-1 h-8 text-xs" />
                        <Button variant="ghost" size="icon-sm" onClick={handleAddField}><PlusIcon className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => { setShowNewField(false); setNewFieldKey(""); setNewFieldValue(""); }}><XIcon className="size-4" /></Button>
                      </div>
                    )}
                    {!showNewField && customFields.length === 0 && (
                      <span className="text-xs text-muted-foreground">{l.noCustomFields}</span>
                    )}
                  </div>
                </Section>

                <Separator />

                {/* Conversation History */}
                <Section label={l.conversationLog} icon={<MessageSquareIcon className="size-3.5" />}>
                  {!contactConversations || contactConversations.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{l.noConversations}</span>
                  ) : (
                    <div className="space-y-2">
                      {contactConversations.map((conv) => (
                        <div key={conv._id} className="text-sm p-2.5 rounded-lg bg-muted/40 border border-border/50">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-xs">
                              {conv.status === "open" ? l.open : conv.status === "pending" ? l.pending : l.resolved}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground truncate">{conv.lastMessagePreview}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Archive */}
                {canEdit && contactId && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => archiveContact({ contactId, archive: !contact.isArchived })}
                    >
                      {contact.isArchived ? (
                        <><ArchiveRestoreIcon className="size-4 me-2" />{l.unarchive}</>
                      ) : (
                        <><ArchiveIcon className="size-4 me-2" />{l.archive}</>
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {/* Channel Picker Dialog */}
    <Dialog open={showChannelPicker} onOpenChange={setShowChannelPicker}>
      <DialogContent dir={dir}>
        <DialogHeader>
          <DialogTitle>{l.selectChannel}</DialogTitle>
          <p className="text-sm text-muted-foreground">{l.selectChannelDesc}</p>
        </DialogHeader>
        {!channels || channels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{l.noChannels}</p>
        ) : (
          <div className="space-y-2 py-2">
            {channels.map((ch) => (
              <button
                key={ch._id}
                onClick={() => setSelectedChannelId(ch._id)}
                className={`w-full text-start p-3 rounded-lg border transition-colors ${
                  selectedChannelId === ch._id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <p className="font-medium text-sm">{ch.displayName || ch.displayPhone || ch.phoneNumberId}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">{ch.displayPhone || ch.phoneNumberId}</p>
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowChannelPicker(false)}>
            {l.cancel}
          </Button>
          <Button
            onClick={handleStartConversation}
            disabled={!selectedChannelId || startingConversation}
          >
            {l.startConversation}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2">
      <div className={highlight ? "text-emerald-500" : "text-muted-foreground"}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? "text-emerald-500" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function Section({ label, icon, action, children }: { label: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {icon}
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
