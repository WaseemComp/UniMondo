"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSiteSettings } from "@/app/admin/cms/site-settings-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettings } from "@/lib/data/site-settings";
import { cn } from "@/lib/utils";

type Props = {
  initial: SiteSettings;
};

export function TickerSiteStripForm({ initial }: Props) {
  const router = useRouter();
  const [tickerText, setTickerText] = useState(initial.tickerText);
  const [tickerActive, setTickerActive] = useState(initial.tickerActive);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveSiteSettings({
        ticker_text: tickerText,
        ticker_active: tickerActive,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Strip settings saved");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="px-5 py-3 text-base">Public strip (under main navigation)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-zinc-600">
            Turn the gold announcement strip on or off, and set a <strong>fallback line</strong> that shows only if no
            ticker lines are published in the list below.
          </p>
          <div>
            <Label htmlFor="strip-fallback">Fallback text</Label>
            <Textarea
              id="strip-fallback"
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
              className="mt-1.5 min-h-[88px]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                id="strip-on"
                type="checkbox"
                checked={tickerActive}
                onChange={(e) => setTickerActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="strip-on" className="font-normal">
                Show strip on the public site
              </Label>
            </div>
            <Button type="submit" disabled={pending} className={cn("min-w-[120px] bg-amber-600 text-white hover:bg-amber-500")}>
              {pending ? "Saving…" : "Save strip settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
