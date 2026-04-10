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

type Props = {
  initial: SiteSettings;
};

export function SiteSettingsForm({ initial }: Props) {
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
      toast.success("Settings saved");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Site settings</h1>
        <p className="mt-1 text-sm text-zinc-600">Top announcement marquee under the main navigation.</p>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">Ticker</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="tt">Ticker text</Label>
              <Textarea
                id="tt"
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ta"
                type="checkbox"
                checked={tickerActive}
                onChange={(e) => setTickerActive(e.target.checked)}
              />
              <Label htmlFor="ta" className="font-normal">
                Show ticker on public site
              </Label>
            </div>
            <Button type="submit" disabled={pending} className="bg-zinc-900 text-white">
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
