"use client";
import { HomepagePreview } from "@/components/admin/homepage/homepage-preview";
import { FeaturedUniversitiesGrid } from "@/components/programs/featured-universities-grid";
import { OpeningsBoard } from "@/components/openings-board";
import { DestinationDetailSection } from "@/components/destinations/destinations-unified";
import {
  countryRowToDetail,
  programRowToOpening,
  type ProgramRow,
} from "@/lib/cms/maps";
import {
  mapFeaturedUniversityRow,
  type FeaturedUniversityRow,
} from "@/lib/featured-universities";
import { publicProgramme, publicUniversity } from "@/lib/academic/public";
import type {
  AcademicKind,
  AcademicRow,
  CatalogueData,
} from "@/lib/academic/model";
export function AcademicDraftPreview({
  kind,
  row,
  data,
  dirty,
}: {
  kind: AcademicKind;
  row: AcademicRow;
  data: CatalogueData;
  dirty: boolean;
}) {
  const programs = data.programmes
    .filter((program) =>
      publicProgramme(program, data.countries, data.universities),
    )
    .map((program) => programRowToOpening(program as unknown as ProgramRow));
  const universities = data.universities
    .filter((university) => publicUniversity(university, data.countries))
    .map((university) =>
      mapFeaturedUniversityRow(university as unknown as FeaturedUniversityRow),
    );
  const content =
    kind === "universities" ? (
      <FeaturedUniversitiesGrid
        universities={[
          mapFeaturedUniversityRow(row as unknown as FeaturedUniversityRow),
        ]}
      />
    ) : kind === "programmes" ? (
      <OpeningsBoard
        openings={[programRowToOpening(row as unknown as ProgramRow)]}
        featuredUniversities={[]}
      />
    ) : (
      <DestinationDetailSection
        country={countryRowToDetail({
          ...row,
          region_groups: {
            label:
              data.regions.find((region) => region.id === row.region_group_id)
                ?.label ?? "",
          },
        } as unknown as Parameters<typeof countryRowToDetail>[0])}
        openings={programs.filter((program) => program.country === row.name)}
        allOpeningsForCountry={programs.filter(
          (program) => program.country === row.name,
        )}
        featured={universities.filter(
          (university) => university.country === row.name,
        )}
        onBack={() => {}}
      />
    );
  return (
    <div className="mt-5">
      <h3 className="mb-2 font-semibold">Private public-page preview</h3>
      <p className="mb-3 text-xs text-zinc-500">
        Uses the existing website components. Links and forms are disabled;
        visibility is shown for editing only.
      </p>
      <HomepagePreview dirty={dirty} hidden={false}>
        {content}
      </HomepagePreview>
    </div>
  );
}
