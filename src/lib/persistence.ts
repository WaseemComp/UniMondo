import type {
  ApplicationPayload,
  ApplicationRecord,
  ReviewStatus,
  UploadedDocument,
} from "@/types/application";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "application-documents";

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const inMemoryApplications: ApplicationRecord[] = [];

async function supabaseRequest(path: string, init: RequestInit): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }

  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  });
}

export async function uploadDocuments(
  files: File[],
  trackingId: string
): Promise<UploadedDocument[]> {
  if (!files.length) {
    return [];
  }

  if (!hasSupabase) {
    return files.map((file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      url: `/uploads/mock/${trackingId}/${encodeURIComponent(file.name)}`,
    }));
  }

  const uploaded: UploadedDocument[] = [];

  for (const file of files) {
    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const objectPath = `${trackingId}/${safeName}`;

    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY as string,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "x-upsert": "false",
          "Content-Type": file.type || "application/octet-stream",
        },
        body: await file.arrayBuffer(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload ${file.name}: ${errorText}`);
    }

    uploaded.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      url: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`,
    });
  }

  return uploaded;
}

export async function saveApplication(record: ApplicationRecord): Promise<ApplicationRecord> {
  if (!hasSupabase) {
    inMemoryApplications.unshift(record);
    return record;
  }

  const response = await supabaseRequest("/rest/v1/applications", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        tracking_id: record.trackingId,
        submitted_at: record.submittedAt,
        screening_tag: record.screeningTag,
        review_status: record.reviewStatus,
        payload: record.payload,
        documents: record.documents,
      },
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save application: ${errorText}`);
  }

  return record;
}

export async function getApplications(status?: ReviewStatus): Promise<ApplicationRecord[]> {
  if (!hasSupabase) {
    if (!status) {
      return inMemoryApplications;
    }

    return inMemoryApplications.filter((application) => application.reviewStatus === status);
  }

  const params = new URLSearchParams({
    select: "tracking_id,submitted_at,screening_tag,review_status,payload,documents",
    order: "submitted_at.desc",
  });

  if (status) {
    params.append("review_status", `eq.${status}`);
  }

  const response = await supabaseRequest(`/rest/v1/applications?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load applications: ${errorText}`);
  }

  const rows = (await response.json()) as Array<{
    tracking_id: string;
    submitted_at: string;
    screening_tag: ApplicationRecord["screeningTag"];
    review_status: ApplicationRecord["reviewStatus"];
    payload: ApplicationPayload;
    documents: UploadedDocument[];
  }>;

  return rows.map((row) => ({
    trackingId: row.tracking_id,
    submittedAt: row.submitted_at,
    screeningTag: row.screening_tag,
    reviewStatus: row.review_status,
    payload: row.payload,
    documents: row.documents || [],
  }));
}

export async function updateApplicationStatus(
  trackingId: string,
  reviewStatus: ReviewStatus
): Promise<boolean> {
  if (!hasSupabase) {
    const index = inMemoryApplications.findIndex((item) => item.trackingId === trackingId);

    if (index < 0) {
      return false;
    }

    inMemoryApplications[index] = {
      ...inMemoryApplications[index],
      reviewStatus,
    };

    return true;
  }

  const response = await supabaseRequest(`/rest/v1/applications?tracking_id=eq.${trackingId}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ review_status: reviewStatus }),
  });

  return response.ok;
}
