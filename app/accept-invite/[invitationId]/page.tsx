"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-hooks";
import { Loader2 } from "lucide-react";

type State = "loading" | "redirecting" | "accepting" | "accepted" | "error";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const invitationId = params.invitationId as string;

  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setState("redirecting");
      router.replace(`/sign-in?redirectTo=/accept-invite/${invitationId}`);
      return;
    }

    setState("accepting");
    authClient.organization
      .acceptInvitation({ invitationId })
      .then(({ error }) => {
        if (error) {
          setErrorMsg(error.message ?? "Failed to accept invitation");
          setState("error");
        } else {
          setState("accepted");
          router.replace("/inbox");
        }
      })
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : "Failed to accept invitation");
        setState("error");
      });
  }, [isLoaded, isSignedIn, invitationId, router]);

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <h1 className="text-xl font-bold text-destructive">فشل قبول الدعوة</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => router.push("/inbox")}
            className="text-sm text-primary underline"
          >
            العودة للرئيسية / Go to inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="size-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          {state === "accepting"
            ? "جارٍ قبول الدعوة... / Accepting invitation..."
            : "جارٍ التحميل... / Loading..."}
        </p>
      </div>
    </div>
  );
}
