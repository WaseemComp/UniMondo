"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminChangePasswordForm() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p1.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (p1 !== p2) {
      toast.error("Passwords do not match");
      return;
    }
    setPending(true);
    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        toast.error("Supabase client unavailable");
        setPending(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: p1 });
      setPending(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated");
      setP1("");
      setP2("");
    })();
  };

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="px-5 py-3 text-base">Change your password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-sm space-y-3">
          <div>
            <Label htmlFor="newp">New password</Label>
            <Input
              id="newp"
              type="password"
              autoComplete="new-password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="mt-1.5"
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="newp2">Confirm</Label>
            <Input
              id="newp2"
              type="password"
              autoComplete="new-password"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" disabled={pending} className={cn("bg-zinc-900 text-white hover:bg-zinc-800")}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
