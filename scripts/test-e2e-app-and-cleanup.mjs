import assert from "node:assert";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
let url = "", key = "";
for (const line of envContent.split("\n")) {
  const [k, ...v] = line.split("=");
  const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
  if (k.trim() === "NEXT_PUBLIC_SUPABASE_URL") url = val;
  if (k.trim() === "SUPABASE_SERVICE_ROLE_KEY" || k.trim() === "SUPABASE_SECRET_KEY") key = val;
}

const supabase = createClient(url, key);

async function runE2E() {
  console.log("=== 1. SUBMITTING APPLICATION WITH CLEARLY LABELLED TEST DATA ===");
  const testTrackingId = "TEST-AUDIT-" + Date.now();
  const testPayload = {
    personalInfo: {
      fullName: "AUDIT TEST APPLICANT (TEMPORARY)",
      email: "audit.test@example.com",
      phone: "+92 300 0000000",
      dateOfBirth: "2000-01-01",
      nationality: "Pakistani",
    },
    academicBackground: {
      highestQualification: "Bachelor of Science in Computer Science",
      institutionName: "National University of Sciences & Technology",
      gpa: 3.8,
      ieltsScore: 7.5,
      graduationYear: "2024",
    },
    programPreferences: {
      intake: "Fall 2026",
      preferredContinent: "Europe",
      destinationChoices: [{ rank: 1, country: "Germany" }],
      programInterest: "Data Science & Artificial Intelligence",
    },
    packageSelection: {
      packageSlug: "comprehensive-guidance",
      packageName: "Comprehensive European Guidance",
      addonIds: [],
    },
  };

  const { data: insertedApp, error: appError } = await supabase
    .from("applications")
    .insert({
      tracking_id: testTrackingId,
      status: "submitted",
      review_status: "Pending",
      screening_tag: "Direct Admission Eligible",
      application_type: "university",
      personal_info: testPayload.personalInfo,
      academic_info: testPayload.academicBackground,
      study_preferences: testPayload.programPreferences,
      selected_package: "comprehensive-guidance",
      payload: testPayload,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (appError) {
    throw new Error(`Failed to insert test application: ${appError.message}`);
  }
  console.log(`✓ Application persisted successfully: Tracking ID = ${testTrackingId}`);

  // 2. Query application and verify visibility
  const { data: fetchedApp, error: fetchErr } = await supabase
    .from("applications")
    .select("*")
    .eq("tracking_id", testTrackingId)
    .single();

  assert(!fetchErr && fetchedApp, "Application must be queryable in database");
  assert.strictEqual(fetchedApp.tracking_id, testTrackingId);
  console.log("✓ Application verified in database query and admin portal dataset");

  // 3. Link an agreement draft to this application in site_content / payload
  const agreementId = "agr-test-" + Date.now();
  const testAgreementRef = "UM/2026/AUDIT-" + Math.floor(1000 + Math.random() * 9000);
  const agreementRecord = {
    id: agreementId,
    referenceNumber: testAgreementRef,
    templateVersion: "1.0",
    applicationId: testTrackingId,
    status: "finalized",
    consultantEntityName: "UniMondo Ltd",
    consultantRegNumber: "14829023",
    consultantAddress: "Tripoli Tower, Suit 22, Block A, Floor 47, Tripoli, Libya",
    studentFullName: "AUDIT TEST APPLICANT (TEMPORARY)",
    studentParentGuardian: "Mr. Test Parent",
    studentCnicPassport: "42101-0000000-1",
    studentAddress: "Test House 1, Street 2, Islamabad",
    studentEmail: "audit.test@example.com",
    studentPhone: "+92 300 0000000",
    degreeLevel: "Master of Science",
    fieldOfStudy: "Data Science & Artificial Intelligence",
    preferredDestination: "Germany",
    academicYearIntake: "Fall 2026",
    financials: {
      baseFeeEUR: 1000,
      paymentCurrency: "PKR",
      agreedExchangeRate: 305,
      exchangeRateDate: "25 / 10 / 2026",
      discountType: "percentage",
      discountValue: 10,
      discountPercent: 10,
      discountEUR: 100,
      discountPKR: 30500,
      netFeeEUR: 900,
      netFeePKR: 274500,
      firstInstalmentEUR: 270,
      firstInstalmentPKR: 82350,
      secondInstalmentEUR: 360,
      secondInstalmentPKR: 109800,
      thirdInstalmentEUR: 270,
      thirdInstalmentPKR: 82350,
    },
    repName: "Waseem Akram",
    repDesignation: "Admissions Director",
    repDate: "25 October 2026",
    studentSignatureDate: "25 October 2026",
    agreementDate: "25 October 2026",
    createdBy: "admin@unimondo.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { error: saveAgrErr } = await supabase.from("site_content").upsert({
    key: `agreement:${agreementId}`,
    value: JSON.stringify(agreementRecord),
    label: `Agreement ${testAgreementRef}`,
    page: "admin",
    section: "agreements",
    sort_order: 0,
    updated_at: new Date().toISOString(),
  });
  assert(!saveAgrErr, "Agreement must save without error");
  console.log(`✓ Agreement saved with Reference: ${testAgreementRef}, linked to Application: ${testTrackingId}`);

  // 4. Update application with agreement link
  const updatedPayload = { ...testPayload, agreementReference: testAgreementRef, agreementId };
  await supabase.from("applications").update({ payload: updatedPayload }).eq("tracking_id", testTrackingId);

  const { data: verifiedApp } = await supabase.from("applications").select("payload").eq("tracking_id", testTrackingId).single();
  assert.strictEqual(verifiedApp.payload.agreementReference, testAgreementRef);
  console.log("✓ Application payload linked with agreement reference");

  // 5. Cleanup test records completely
  console.log("\n=== CLEANUP OF TEMPORARY TEST RECORDS ===");
  await supabase.from("site_content").delete().eq("key", `agreement:${agreementId}`);
  console.log(`✓ Deleted test agreement from site_content: agreement:${agreementId}`);

  await supabase.from("applications").delete().eq("tracking_id", testTrackingId);
  console.log(`✓ Deleted test application from applications: ${testTrackingId}`);

  const { data: checkApp } = await supabase.from("applications").select("id").eq("tracking_id", testTrackingId).maybeSingle();
  const { data: checkAgr } = await supabase.from("site_content").select("key").eq("key", `agreement:${agreementId}`).maybeSingle();

  assert(!checkApp, "Application record must be cleaned up");
  assert(!checkAgr, "Agreement record must be cleaned up");
  console.log("✓ Confirmed 100% of temporary audit test records are removed from database");
}

runE2E().catch(err => {
  console.error("E2E check failed:", err);
  process.exit(1);
});
