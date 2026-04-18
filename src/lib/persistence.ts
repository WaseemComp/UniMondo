import type {
  ApplicationFormValues,
} from "@/lib/apply/schema";
import type {
  ApplicationPayload,
  ApplicationRecord,
  ReviewStatus,
  ScreeningTag,
  UploadedDocument,
} from "@/types/application";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";

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

export type DocumentUploadItem = {
  file: File;
  category: string;
  description: string;
};

export type CreateApplicationInput = {
  trackingId: string;
  submittedAt: string;
  screeningTag: ScreeningTag;
  reviewStatus: ReviewStatus;
  payload: ApplicationPayload;
  personalInfo: ApplicationFormValues["personalInfo"];
  academicInfo: ApplicationFormValues["academicInfo"];
  studyPreferences: ApplicationFormValues["studyPreferences"];
  selectedPackage: string;
  selectedAddons: ApplicationFormValues["packageSelection"]["addonIds"];
  documentItems: DocumentUploadItem[];
};

function mapDbDocumentRow(d: {
  file_url: string;
  file_name: string;
  category: string;
  description: string | null;
}): UploadedDocument {
  return {
    name: d.file_name,
    url: d.file_url,
    category: d.category,
    description: d.description ?? undefined,
    type: "application/octet-stream",
    size: 0,
  };
}

/**
 * Inserts the application row, uploads each file to the `documents` storage bucket,
 * then inserts rows into `public.documents`.
 */
export async function createApplicationWithDocuments(
  input: CreateApplicationInput
): Promise<ApplicationRecord> {
  const uploadedDocs: UploadedDocument[] = [];

  if (!hasSupabase) {
    for (const item of input.documentItems) {
      uploadedDocs.push({
        name: item.file.name,
        type: item.file.type || "application/octet-stream",
        size: item.file.size,
        url: `/uploads/mock/${input.trackingId}/${item.category}/${encodeURIComponent(item.file.name)}`,
        category: item.category,
        description: item.description,
      });
    }
    const record: ApplicationRecord = {
      trackingId: input.trackingId,
      submittedAt: input.submittedAt,
      screeningTag: input.screeningTag,
      reviewStatus: input.reviewStatus,
      payload: input.payload,
      documents: uploadedDocs,
    };
    inMemoryApplications.unshift(record);
    return record;
  }

  const insResponse = await supabaseRequest("/rest/v1/applications", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        tracking_id: input.trackingId,
        submitted_at: input.submittedAt,
        screening_tag: input.screeningTag,
        review_status: input.reviewStatus,
        status: "submitted",
        personal_info: input.personalInfo,
        academic_info: input.academicInfo,
        study_preferences: input.studyPreferences,
        selected_package: input.selectedPackage,
        selected_addons: input.selectedAddons,
        payload: input.payload,
      },
    ]),
  });

  if (!insResponse.ok) {
    const errorText = await insResponse.text();
    throw new Error(`Failed to save application: ${errorText}`);
  }

  const inserted = (await insResponse.json()) as Array<{ id: string; tracking_id: string }>;
  const applicationId = inserted[0]?.id;
  if (!applicationId) {
    throw new Error("Failed to save application: no id returned.");
  }

  const docRows: Array<{
    application_id: string;
    file_url: string;
    file_name: string;
    category: string;
    description: string | null;
  }> = [];

  for (const item of input.documentItems) {
    const safeName = `${Date.now()}-${item.file.name.replace(/\s+/g, "-")}`;
    const objectPath = `${input.trackingId}/${item.category}/${safeName}`;

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY as string,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "x-upsert": "false",
          "Content-Type": item.file.type || "application/octet-stream",
        },
        body: await item.file.arrayBuffer(),
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      let message = errorText;
      try {
        const j = JSON.parse(errorText) as { message?: string; error?: string; statusCode?: string };
        message = [j.message, j.error].filter(Boolean).join(" — ") || errorText;
      } catch {
        /* keep raw */
      }
      throw new Error(`Failed to upload ${item.file.name}: ${message}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;

    docRows.push({
      application_id: applicationId,
      file_url: publicUrl,
      file_name: item.file.name,
      category: item.category,
      description: item.description.trim() ? item.description.trim() : null,
    });

    uploadedDocs.push({
      name: item.file.name,
      type: item.file.type || "application/octet-stream",
      size: item.file.size,
      url: publicUrl,
      category: item.category,
      description: item.description,
    });
  }

  if (docRows.length > 0) {
    const docRes = await supabaseRequest("/rest/v1/documents", {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(docRows),
    });

    if (!docRes.ok) {
      const errorText = await docRes.text();
      throw new Error(`Failed to save document metadata: ${errorText}`);
    }
  }

  return {
    trackingId: input.trackingId,
    submittedAt: input.submittedAt,
    screeningTag: input.screeningTag,
    reviewStatus: input.reviewStatus,
    payload: input.payload,
    documents: uploadedDocs,
  };
}

export async function getApplications(status?: ReviewStatus): Promise<ApplicationRecord[]> {
  if (!hasSupabase) {
    if (!status) {
      return inMemoryApplications;
    }

    return inMemoryApplications.filter((application) => application.reviewStatus === status);
  }

  const params = new URLSearchParams({
    select:
      "tracking_id,submitted_at,screening_tag,review_status,payload,documents(file_url,file_name,category,description)",
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
    documents:
      | Array<{
          file_url: string;
          file_name: string;
          category: string;
          description: string | null;
        }>
      | null;
  }>;

  return rows.map((row) => ({
    trackingId: row.tracking_id,
    submittedAt: row.submitted_at,
    screeningTag: row.screening_tag,
    reviewStatus: row.review_status,
    payload: row.payload,
    documents: (row.documents ?? []).map(mapDbDocumentRow),
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
