// components/contacts/contact-view-props.ts
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Stage } from "./contact-stage-config";

export interface ContactViewProps {
  contacts: Doc<"contacts">[];
  selected: Set<Id<"contacts">>;
  locale: "ar" | "en";
  isLoading: boolean;
  onToggle: (id: Id<"contacts">) => void;
  onClick: (id: Id<"contacts">) => void;       // opens detail sheet
  onViewProfile: (id: Id<"contacts">) => void; // navigates to /contacts/[id]
  onUpdateStage: (id: Id<"contacts">, stage: Stage) => void;
}
