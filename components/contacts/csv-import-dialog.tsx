"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import PapaParse from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  UploadIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react";

import type { Id } from "@/convex/_generated/dataModel";

 type ImportRow = {
  phone: string;
  name?: string;
  tags?: string[];
  notes?: string;
 };

 type ImportStep = "upload" | "preview" | "options" | "importing" | "summary";
 type DuplicateMode = "skip" | "overwrite";

 interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
 }

 const MAX_ROWS = 10000;
 const PREVIEW_ROWS = 10;

 export function CsvImportDialog({
  open,
  onOpenChange,
  onComplete,
 }: CsvImportDialogProps) {
   const [step, setStep] = useState<ImportStep>("upload");
   const [rows, setRows] = useState<ImportRow[]>([]);
   const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");
   const [fileName, setFileName] = useState("");
   const [importResult, setImportResult] = useState<{
     added: number;
     skipped: number;
     failed: number;
     failedRows: { row: number; reason: string }[];
   } | null>(null);

   const importContacts = useAction(api.contactsImport.importBatch);

   const handleFile = useCallback(
     (file: File) => {
       PapaParse.parse(file, {
         header: true,
         skipEmptyLines: true,
         complete: (results) => {
           const mapped: ImportRow[] = results.data
             .map((row: Record<string, unknown>) => ({
               phone: String(row.phone ?? ""),
               name: row.name ? String(row.name) : undefined,
               tags: row.tags
                 ? String(row.tags)
                     .split(",")
                     .map((t: string) => t.trim())
                     .filter(Boolean)
                 : undefined,
               notes: row.notes ? String(row.notes) : undefined,
             }))
             .filter((r) => r.phone.length > 0);

           if (mapped.length > MAX_ROWS) {
               setRows(mapped.slice(0, MAX_ROWS));
           } else {
               setRows(mapped);
           }
           setFileName(file.name);
           setStep("preview");
         },
         error: () => {
           setStep("upload");
         },
       });
     },
     [],
   );

   async function handleImport() {
     setStep("importing");
     try {
         const result = await importContacts({
             rows,
             onDuplicate: duplicateMode,
         });
         setImportResult(result);
         setStep("summary");
         if (onComplete) onComplete();
     } catch {
         setStep("options");
     }
   }

   function handleReset() {
     setStep("upload");
     setRows([]);
     setFileName("");
     setImportResult(null);
     setDuplicateMode("skip");
  }

   const totalRows = rows.length;
   const previewRows = rows.slice(0, PREVIEW_ROWS);

   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle>
             {step === "upload" && "استيراد جهات اتصال"}
             {step === "preview" && "معاينةة الاستيراد"}
             {step === "options" && "خيارات الاستيراد"}
             {step === "importing" && "جاري الاستيراد..."}
             {step === "summary" && "ملخص الاستيراد"}
           </DialogTitle>
           <DialogDescription>
             {step === "upload" && "قم بتحميل ملف CSV يحتوي على بيانات جهات الاتصال"}
             {step === "preview" && `عرض أول ${PREVIEW_ROWS} صفوف من ${totalRows} صف`}
           </DialogDescription>
         </DialogHeader>

         {step === "upload" && (
           <div
             className="flex flex-col items-center gap-4 py-8"
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => {
               e.preventDefault();
               const file = e.dataTransfer.files[0];
               if (file) handleFile(file);
             }}
           >
             <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 w-full">
               <UploadIcon className="size-8 text-muted-foreground" />
               <span className="text-sm text-muted-foreground">
                 {fileName || "اسحب ملف CSV أو اسحبه هنا"}
               </span>
               <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) handleFile(file);
                  }}
                />
             </label>
             {totalRows > MAX_ROWS && (
               <p className="text-xs text-destructive">
                 الحد الأقصى {MAX_ROWS.toLocaleString("ar")} صف - يتم عرض أول {MAX_ROWS} فقط
               </p>
             )}
           </div>
         )}

         {step === "preview" && (
           <div className="space-y-3">
             <div className="flex items-center justify-between text-sm">
               <span>{totalRows} صف</span>
               <span className="text-muted-foreground">{fileName}</span>
             </div>
             <ScrollArea className="max-h-64">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="border-b">
                     <th className="p-2 text-start">الهاتف</th>
                     <th className="p-2 text-start">الاسم</th>
                     <th className="p-2 text-start">الوسوم</th>
                   </tr>
                 </thead>
                 <tbody>
                   {previewRows.map((row, i) => (
                     <tr key={i} className="border-b">
                       <td className="p-2 font-mono" dir="ltr">{row.phone}</td>
                       <td className="p-2">{row.name ?? "—"}</td>
                       <td className="p-2">
                         {row.tags?.map((t) => (
                           <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                         ))}
                       </td>
                     </tr>
                   ))}
                   {totalRows > PREVIEW_ROWS && (
                    <tr className="border-b">
                      <td colSpan={3} className="p-2 text-center text-muted-foreground text-xs">
                        +{totalRows - PREVIEW_ROWS} صف إخرى...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                إلغاء
              </Button>
              <Button onClick={() => setStep("options")}>
                التالي → خيارات الاستيراد
              </Button>
            </DialogFooter>
          </div>
         )}

         {step === "options" && (
           <div className="space-y-4">
             <p className="text-sm font-medium">كيفية التعامل مع جهات الاتصال المكررة؟</p>
             <div className="flex gap-4">
               <button
                 onClick={() => setDuplicateMode("skip")}
                 className={`flex-1 p-3 rounded-md border text-sm ${
                   duplicateMode === "skip" ? "bg-primary text-primary-foreground" : "bg-muted"
                 }`}
               >
                 تخطى جهات الاتصال المكررة
               </button>
               <button
                 onClick={() => setDuplicateMode("overwrite")}
                 className={`flex-1 p-3 rounded-md border text-sm ${
                   duplicateMode === "overwrite" ? "bg-primary text-primary-foreground" : "bg-muted"
                 }`}
               >
                 الكتابة فوق جهات الاتصال المكرر
               </button>
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={handleReset}>
                 إلغاء
               </Button>
               <Button onClick={handleImport}>
                 بدء الاستيراد ({totalRows} صف)
               </Button>
             </DialogFooter>
           </div>
         )}

         {step === "importing" && (
           <div className="flex flex-col items-center gap-4 py-12">
             <div className="animate-spin size-8 rounded-full border-4 border-muted border-t-primary" />
             <p className="text-sm text-muted-foreground">جاري استيراد {totalRows} جهة اتصال...</p>
           </div>
         )}

         {step === "summary" && importResult && (
           <div className="space-y-4">
             <div className="flex items-center gap-3 text-sm">
               <CheckCircle2Icon className="size-5 text-green-500 shrink-0" />
               <span>{importResult.added} مضاف</span>
             </div>
             {importResult.skipped > 0 && (
               <div className="flex items-center gap-3 text-sm text-muted-foreground">
                 <span>{importResult.skipped} مكرر تم تخطيه/تحديثه</span>
               </div>
             )}
             {importResult.failed > 0 && (
               <div className="space-y-2">
                 <div className="flex items-center gap-3 text-sm text-destructive">
                   <AlertCircleIcon className="size-5 shrink-0" />
                   <span>{importResult.failed} فاشل</span>
                 </div>
                 {importResult.failedRows.length > 0 && (
                   <ScrollArea className="max-h-32">
                     <div className="space-y-1">
                       {importResult.failedRows.map((f) => (
                          <div key={f.row} className="text-xs text-muted-foreground">
                            صف {f.row}: {f.reason}
                          </div>
                       ))}
                     </div>
                   </ScrollArea>
                 )}
               </div>
             )}
             <DialogFooter>
               <Button onClick={handleReset}>استيراد آخر</Button>
               <Button variant="outline" onClick={() => onOpenChange(false)}>
                 تم
               </Button>
             </DialogFooter>
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 }
