"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignIn } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const token = params.token as string;

  const validateAndJoin = useAction(api.actions.validateInvite.validateAndJoin);

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const result = await validateAndJoin({ token });
      setJoined(true);
      setTimeout(() => router.push("/inbox"), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("INVITE_INVALID")) {
        setError("الدعوة منتهية أو غير صالحة / Invite expired or invalid");
      } else if (msg.includes("PLAN_LIMIT")) {
        setError("تم بلوغ الحد الأقصى لعدد الأعضاء / Plan member limit reached");
      } else if (msg.includes("ALREADY_MEMBER")) {
        router.push("/inbox");
      } else {
        setError(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertTriangle className="size-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">{error}</h1>
          <p className="text-sm text-muted-foreground">
            تواصل مع المسؤول / Contact your organization admin
          </p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold">تم الانضمام! / Joined!</h1>
          <p className="text-sm text-muted-foreground">جارٍ التحويل... / Redirecting...</p>
        </div>
      </div>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold">انضم إلى الفريق / Join Team</h1>
          <p className="text-sm text-muted-foreground">
            اضغط للانضمام / Click to join
          </p>
          <Button onClick={handleJoin} disabled={joining} className="w-full">
            {joining ? "جارٍ الانضمام... / Joining..." : "انضمام / Join"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        <h1 className="text-xl font-bold text-center">
          انضم إلى الفريق / Join the Team
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          سجّل أو سجّل دخولك للانضمام / Sign up or sign in to join
        </p>
        <SignIn />
      </div>
    </div>
  );
}
