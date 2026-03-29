import type { ApplicationRecord } from "@/types/application";

export async function triggerStudentEmail(application: ApplicationRecord): Promise<void> {
  const webhook = process.env.EMAIL_WEBHOOK_URL;

  if (!webhook) {
    return;
  }

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: application.payload.personalInfo.email,
      subject: `UniMondo Application Received (${application.trackingId})`,
      name: application.payload.personalInfo.fullName,
      trackingId: application.trackingId,
      screeningTag: application.screeningTag,
      submittedAt: application.submittedAt,
    }),
  });
}
