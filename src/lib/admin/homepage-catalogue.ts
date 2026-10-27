import { getCountryDetails } from "@/lib/data/countries";
import { getOpenings } from "@/lib/data/openings";
import { getFeaturedUniversities } from "@/lib/data/featured-universities";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getAdminAccess } from "@/lib/auth/admin";
import type { HomepageReferences } from "@/lib/homepage/items";
import type { SuccessStoryRow } from "@/lib/data/success-stories";
export type EditableStory = SuccessStoryRow & { updated_at: string; is_published: boolean };
export async function loadHomepageReferences(user: {id:string;email?:string|null}): Promise<HomepageReferences> {
  const access=await getAdminAccess(user);
  const [countryPermission,academicPermission]=await Promise.all([hasAdminPermission(user,"countries.view"),hasAdminPermission(user,"universities.view")]);
  const area = access.isSuper || access.permissions.academic !== false;
  const countriesAllowed = area && countryPermission, universitiesAllowed = area && academicPermission;
  // Only public master-record fields are returned. No application or private student queries.
  const [countries,programs,universities]=await Promise.all([getCountryDetails(),getOpenings(),getFeaturedUniversities()]);
  const service = createSupabaseServiceClient();
  const tables = [...(countriesAllowed ? ["countries","region_groups"] : []), ...(universitiesAllowed ? ["programs","featured_universities"] : [])];
  const health = service ? await Promise.all(tables.map(table=>service.from(table).select("id",{head:true,count:"exact"}))) : [];
  const healthy = Boolean(service) && health.every(result=>!result.error || ["42P01","PGRST205"].includes(result.error.code));
  return {countries,programs,universities,available:healthy&&(countriesAllowed||universitiesAllowed),permissions:{countries:countriesAllowed,academic:universitiesAllowed}};
}
export async function readEditableStories(user: {id:string;email?:string|null}): Promise<{rows:EditableStory[];available:boolean}> {
  const access=await getAdminAccess(user);
  if((!access.isSuper && access.permissions.content===false)||!await hasAdminPermission(user,"blog.view"))return {rows:[],available:false};
  const service=createSupabaseServiceClient();if(!service)return {rows:[],available:false};
  const {data,error}=await service.from("success_stories").select("id,profile_image_url,full_name,testimonial,country,program,university,sort_order,is_published,updated_at").order("sort_order",{ascending:true}).limit(1000);
  return {rows:(data??[]) as EditableStory[],available:!error};
}
