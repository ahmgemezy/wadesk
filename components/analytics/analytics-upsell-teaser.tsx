"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AnalyticsUpsellTeaserProps {
  locale?: "ar" | "en";
}

export function AnalyticsUpsellTeaser({ locale = "ar" }: AnalyticsUpsellTeaserProps) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-3 blur-[6px] pointer-events-none select-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm">
          <CardContent className="text-center space-y-4 pt-6">
            <p className="text-lg font-medium">
              {locale === "ar"
                ? "ترقية إلى Growth للوصول إلى التحليلات"
                : "Upgrade to Growth for Analytics"}
            </p>
            <Link href="/settings/billing">
              <Button>
                {locale === "ar" ? "ترقية الآن" : "Upgrade Now"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
