"use client";
/* eslint-disable @next/next/no-img-element -- Existing Media Library thumbnails preserve their current image hosts. */
import { useState } from "react";
import { ArrowDown, ArrowUp, Archive, Plus, Save } from "lucide-react";
import type {
  HomepageEditorData,
  HomepageSnapshot,
} from "@/lib/admin/homepage-editor";
import {
  COLLECTIONS,
  ICON_CHOICES,
  newHomepageItem,
  resolveCollection,
  collectionBlock,
  withCollection,
  withPresentation,
  presentationBlock,
  presentationDefaults,
  resolvePresentation,
  type CollectionId,
  type HomepageItem,
} from "@/lib/homepage/items";
import { DESTINATION_DEFAULTS } from "@/lib/homepage/item-defaults";
import { publicHeroSlides, type SectionId } from "@/lib/homepage/content";
import {
  validateItems,
  validatePresentation,
} from "@/lib/homepage/item-validation";
import {
  saveHomepageCollection,
  saveHomepagePresentation,
} from "@/app/admin/cms/homepage-items-actions";
import {
  CmsActionArea,
  CmsFieldContext,
} from "@/components/admin/cms/cms-foundation";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { HomepagePreview, HomepageSectionRendering } from "./homepage-preview";
export type ItemEditorProps = {
  data: HomepageEditorData;
  section: SectionId;
  initialSelection?: string;
  onRememberSelection?: (identity: string) => void;
  onSelectOther?: (identity: string) => void;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
  onSaved: (snapshot: HomepageSnapshot) => void;
};
const labels: Record<string, string> = {
  title: "Title",
  description: "Description",
  icon: "Icon",
  value: "Verified numeric value",
  suffix: "Suffix",
  label: "Label",
};
const iconLabel = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/2$/, "");
export function HomepageItemsEditor({
  data,
  section,
  collection,
  onDirty,
  onBusy,
  onSaved,
  initialSelection,
  onRememberSelection,
  onSelectOther,
}: ItemEditorProps & { collection: CollectionId }) {
  const definition = COLLECTIONS[collection],
    refs = data.references;
  const initial = resolveCollection(
    data.blocks,
    collection,
    refs,
    data.openings,
  );
  const [items, setItems] = useState(initial.items),
    [selected, setSelected] = useState(
      initialSelection ??
        initial.items.find((item) => !item.archived)?.id ??
        initial.items[0]?.id ??
        "",
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [picker, setPicker] = useState(false),
    [query, setQuery] = useState("");
  const dirty = JSON.stringify(items) !== JSON.stringify(initial.items),
    item = items.find((row) => row.id === selected);
  const canEdit =
    data.available &&
    (collection === "why_stats"
      ? data.permissions.editStats
      : data.permissions.editHome) &&
    (!(collection === "featured" || collection === "destinations") ||
      (refs?.available &&
        (collection === "destinations"
          ? (refs.permissions?.countries ?? true)
          : (refs.permissions?.academic ?? true))));
  const locked = !canEdit || busy;
  const validation = validateItems(collection, items, undefined, initial.items);
  const update = (next: HomepageItem[]) => {
    setItems(next);
    setError("");
    onDirty(JSON.stringify(next) !== JSON.stringify(initial.items));
  };
  const patch = (values: Partial<HomepageItem>) =>
    update(
      items.map((row) => (row.id === selected ? { ...row, ...values } : row)),
    );
  const move = (direction: number) => {
    const index = items.findIndex((row) => row.id === selected),
      next = [...items];
    if (index + direction < 0 || index + direction >= items.length) return;
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    update(next);
  };
  const previewData = {
    ...data,
    blocks: withCollection(data.blocks, collection, items),
  };
  const references =
    collection === "destinations"
      ? (refs?.countries ?? []).map((row) => ({
          value: row.country,
          label: row.country,
          type: "country",
        }))
      : collection === "featured"
        ? [
            ...(refs?.universities ?? []).map((row) => ({
              value: row.id,
              label: `University · ${row.name} · ${row.country}`,
              type: "university",
            })),
            ...(refs?.programs ?? []).map((row) => ({
              value: row.id,
              label: `Program · ${row.programName} · ${row.university}`,
              type: "program",
            })),
          ]
        : [];
  const choose = (value: string) => {
    const record = references.find(
      (row) => `${row.type}:${row.value}` === value,
    );
    if (!record) return;
    const fallback = DESTINATION_DEFAULTS.find(
      (row) => row.country === record.value,
    );
    patch({
      reference: record.value,
      recordType: record.type,
      title: record.label,
      ...(collection === "destinations"
        ? {
            description:
              fallback?.description ??
              refs?.countries.find((row) => row.country === record.value)
                ?.description ??
              refs?.countries.find((row) => row.country === record.value)
                ?.whyStudyThere ??
              "",
            imageUrl: fallback?.imageUrl ?? "",
            imageAlt: `${record.label} — study destination`,
          }
        : {}),
    });
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (locked || !dirty) return;
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      const result = await saveHomepageCollection({
        collection,
        items,
        expectedUpdatedAt:
          collectionBlock(data.blocks, collection)?.updated_at ?? null,
      });
      if (!result.ok) setError(result.error);
      else {
        onDirty(false);
        onRememberSelection?.(selected);
        onSaved(result.snapshot);
      }
    } catch {
      setError(
        "The connection was interrupted. Reload to confirm saved content before retrying.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <>
      <section
        className="hp-fields-panel"
        aria-label="Individual item editing controls"
      >
        <div className="hp-panel-heading">
          <div>
            <p className="cms-eyebrow">EDIT INDIVIDUAL ITEMS</p>
            <h2>{definition.label}</h2>
          </div>
          <button
            className="cms-button-secondary"
            type="button"
            disabled={locked || items.length >= 80}
            onClick={() => {
              const row = newHomepageItem(crypto.randomUUID());
              update([...items, row]);
              setSelected(row.id);
            }}
          >
            <Plus size={15} />
            Add {definition.singular}
          </button>
        </div>
        <div className="hp-item-list" aria-label={definition.label}>
          {items.map((row, index) => (
            <button
              key={row.id}
              type="button"
              aria-pressed={selected === row.id}
              disabled={busy}
              onClick={() => setSelected(row.id)}
            >
              <span>
                {index + 1}.{" "}
                {row.title || row.label || row.description || "New item"}
              </span>
              <small>
                {row.archived ? "Archived" : row.visible ? "Visible" : "Hidden"}
              </small>
            </button>
          ))}
        </div>
        <form className="hp-section-form" onSubmit={save}>
          <CmsFieldContext
            source={initial.source}
            description={
              initial.source === "saved"
                ? "Saved homepage collection. Changes stay private after Save Draft."
                : "Current website defaults or existing records. First save preserves the entire current collection."
            }
          />
          {!canEdit && (
            <p className="hp-help">
              You can inspect this collection. Existing edit and master-record
              view permissions are required to save changes.
            </p>
          )}
          {!items.length && (
            <p className="hp-help">
              No items are configured. Add an item when you have approved
              content to display.
            </p>
          )}
          {item && (
            <>
              <div className="hp-item-actions">
                <button
                  type="button"
                  className="cms-button-secondary"
                  disabled={locked || items[0]?.id === selected}
                  onClick={() => move(-1)}
                  aria-label="Move item earlier"
                >
                  <ArrowUp size={15} />
                  Earlier
                </button>
                <button
                  type="button"
                  className="cms-button-secondary"
                  disabled={locked || items.at(-1)?.id === selected}
                  onClick={() => move(1)}
                  aria-label="Move item later"
                >
                  <ArrowDown size={15} />
                  Later
                </button>
                <button
                  type="button"
                  className="cms-button-secondary"
                  disabled={locked}
                  onClick={() => {
                    if (item.archived) patch({ archived: false });
                    else if (
                      window.confirm(
                        "Archive this item? It will stop appearing publicly after approval and Publish. Its content is retained and can be restored.",
                      )
                    )
                      patch({ archived: true });
                  }}
                >
                  <Archive size={15} />
                  {item.archived ? "Restore item" : "Archive item"}
                </button>
              </div>
              <label className="hp-inherit-toggle">
                <input
                  type="checkbox"
                  checked={item.visible}
                  disabled={locked || item.archived}
                  onChange={(event) => patch({ visible: event.target.checked })}
                />
                Visible on homepage
              </label>
              {(collection === "destinations" || collection === "featured") && (
                <>
                  <div className="hp-field">
                    <label htmlFor="hp-record-search">
                      Search existing records
                    </label>
                    <input
                      id="hp-record-search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name, country or program"
                      disabled={locked}
                    />
                  </div>
                  <div className="hp-field">
                    <label htmlFor="hp-record">
                      {collection === "destinations"
                        ? "Country"
                        : "University or program"}
                    </label>
                    <select
                      id="hp-record"
                      value={`${item.recordType}:${item.reference}`}
                      disabled={locked || item.archived}
                      onChange={(event) => choose(event.target.value)}
                    >
                      <option value=":">Choose an existing record</option>
                      {!references.some(
                        (row) =>
                          row.value === item.reference &&
                          row.type === item.recordType,
                      ) &&
                        item.reference && (
                          <option
                            value={`${item.recordType}:${item.reference}`}
                          >
                            {item.title || item.reference} · unavailable
                          </option>
                        )}
                      {references
                        .filter(
                          (row) =>
                            `${row.type}:${row.value}` ===
                              `${item.recordType}:${item.reference}` ||
                            row.label
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        )
                        .map((row) => (
                          <option
                            key={`${row.type}:${row.value}`}
                            value={`${row.type}:${row.value}`}
                          >
                            {row.label}
                          </option>
                        ))}
                    </select>
                    <p className="hp-help">
                      Only this homepage selection changes. The underlying
                      country, university and program records remain intact.
                    </p>
                  </div>
                </>
              )}
              {definition.fields
                .filter((key) => key !== "reference" && key !== "imageUrl")
                .map((key) => (
                  <div className="hp-field" key={key}>
                    <label htmlFor={`hp-item-${key}`}>{labels[key]}</label>
                    {key === "icon" ? (
                      <select
                        id={`hp-item-${key}`}
                        value={item[key]}
                        disabled={locked || item.archived}
                        onChange={(event) =>
                          patch({ icon: event.target.value })
                        }
                      >
                        {ICON_CHOICES.map((icon) => (
                          <option value={icon} key={icon}>
                            {iconLabel(icon)}
                          </option>
                        ))}
                      </select>
                    ) : key === "description" ? (
                      <textarea
                        id={`hp-item-${key}`}
                        rows={4}
                        maxLength={5000}
                        value={String(item[key])}
                        disabled={locked || item.archived}
                        onChange={(event) =>
                          patch({ [key]: event.target.value })
                        }
                      />
                    ) : (
                      <input
                        id={`hp-item-${key}`}
                        type={key === "value" ? "number" : "text"}
                        min={key === "value" ? 1 : undefined}
                        maxLength={key === "suffix" ? 30 : 500}
                        value={String(item[key])}
                        disabled={locked || item.archived}
                        onChange={(event) =>
                          patch({
                            [key]:
                              key === "value"
                                ? Number(event.target.value)
                                : event.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              {collection === "destinations" && (
                <div className="hp-field">
                  <p className="hp-field-label">Destination image</p>
                  {item.imageUrl && (
                    <div className="hp-image-thumbnail">
                      <img src={item.imageUrl} alt={item.imageAlt} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="cms-button-secondary"
                    disabled={locked || item.archived}
                    onClick={() => setPicker(true)}
                  >
                    Change Image
                  </button>
                  <label htmlFor="hp-item-alt">Image description</label>
                  <input
                    id="hp-item-alt"
                    value={item.imageAlt}
                    disabled={locked || item.archived}
                    onChange={(event) =>
                      patch({ imageAlt: event.target.value })
                    }
                  />
                </div>
              )}
            </>
          )}
          {(error || validation) && (
            <p className="hp-form-error" role="alert">
              {error || validation}
            </p>
          )}
          <CmsActionArea>
            <button
              type="button"
              className="cms-button-secondary"
              disabled={locked || !dirty}
              onClick={() => {
                if (
                  window.confirm("Discard unsaved changes to this collection?")
                ) {
                  setItems(initial.items);
                  setSelected(
                    initial.items.some((row) => row.id === selected)
                      ? selected
                      : (initial.items[0]?.id ?? ""),
                  );
                  setError("");
                  onDirty(false);
                }
              }}
            >
              Discard changes
            </button>
            <button
              className="cms-button-primary"
              type="submit"
              disabled={locked || !dirty || Boolean(validation)}
            >
              <Save size={15} />
              {busy ? "Saving…" : "Save Draft"}
            </button>
          </CmsActionArea>
        </form>
      </section>
      {picker && item && (
        <MediaPicker
          title="Destination image"
          category="destinations"
          currentUrl={item.imageUrl}
          onSelect={(asset) =>
            patch({ imageUrl: asset.url, imageAlt: asset.alt || asset.name })
          }
          onClose={() => setPicker(false)}
        />
      )}
      <HomepagePreview
        dirty={dirty}
        hidden={false}
        selectedItem={`${collection}:${selected}`}
        onSelectItem={(identity) => {
          const prefix = collection + ":";
          if (identity.startsWith(prefix))
            setSelected(identity.slice(prefix.length));
          else onSelectOther?.(identity);
        }}
      >
        <HomepageSectionRendering
          section={section}
          data={previewData}
          slide={publicHeroSlides(data.blocks)[0]}
        />
      </HomepagePreview>
    </>
  );
}
const settingLabels: Record<string, string> = {
  visible: "Show this section on the homepage",
  supportingText: "Supporting statement",
  buttonHref: "Button destination",
  showEligibility: "Show GPA and IELTS inputs",
  gpaLabel: "GPA input label",
  gpaPlaceholder: "GPA input hint",
  ieltsLabel: "IELTS input label",
  ieltsPlaceholder: "IELTS input hint",
  imageAlt: "Background image description",
  applyLabel: "Apply button text",
  applyHref: "Apply button destination",
  detailsLabel: "Details button text",
  detailsHref: "Details button destination",
  destinationLabel: "Destination card button text",
};
export function HomepagePresentationEditor({
  data,
  section,
  onDirty,
  onBusy,
  onSaved,
}: ItemEditorProps) {
  const initial = resolvePresentation(data.blocks, section),
    [values, setValues] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [picker, setPicker] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial),
    locked =
      !data.available ||
      busy ||
      !(section === "journey_cta"
        ? data.permissions.editCta
        : data.permissions.editHome);
  const validation = validatePresentation(section, values),
    update = (patch: Record<string, string | boolean>) => {
      const next = { ...values, ...patch };
      setValues(next);
      setError("");
      onDirty(JSON.stringify(next) !== JSON.stringify(initial));
    };
  const previewData = {
    ...data,
    blocks: withPresentation(data.blocks, section, values),
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (locked || !dirty) return;
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      const result = await saveHomepagePresentation({
        section,
        values,
        expectedUpdatedAt:
          presentationBlock(data.blocks, section)?.updated_at ?? null,
      });
      if (!result.ok) setError(result.error);
      else {
        onDirty(false);
        onSaved(result.snapshot);
      }
    } catch {
      setError("Saving confirmation is unavailable. Reload before retrying.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <>
      <section className="hp-fields-panel" aria-label="Section settings">
        <div className="hp-panel-heading">
          <h2>Section settings</h2>
        </div>
        <form className="hp-section-form" onSubmit={save}>
          <CmsFieldContext
            source={
              presentationBlock(data.blocks, section) ? "saved" : "default"
            }
            description="These are the current presentation settings. Save Draft privately; publication requires approval and a separate Publish action."
          />
          {Object.entries(presentationDefaults(section)).map(
            ([key, fallback]) =>
              key === "imageUrl" ? (
                <div className="hp-field" key={key}>
                  <p>Background image</p>
                  <div className="hp-image-thumbnail">
                    <img
                      src={String(values.imageUrl)}
                      alt={String(values.imageAlt)}
                    />
                  </div>
                  <button
                    type="button"
                    className="cms-button-secondary"
                    disabled={locked}
                    onClick={() => setPicker(true)}
                  >
                    Change Image
                  </button>
                </div>
              ) : typeof fallback === "boolean" ? (
                <label className="hp-inherit-toggle" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(values[key])}
                    disabled={locked}
                    onChange={(event) =>
                      update({ [key]: event.target.checked })
                    }
                  />
                  {settingLabels[key]}
                </label>
              ) : (
                <div className="hp-field" key={key}>
                  <label htmlFor={`hp-setting-${key}`}>
                    {settingLabels[key]}
                  </label>
                  <input
                    id={`hp-setting-${key}`}
                    maxLength={5000}
                    value={String(values[key])}
                    disabled={locked}
                    onChange={(event) => update({ [key]: event.target.value })}
                  />
                </div>
              ),
          )}
          {values.visible === false && (
            <p className="hp-help">
              This section is hidden. The preview still shows its content so you
              can edit before making it visible again.
            </p>
          )}
          {(error || validation) && (
            <p role="alert" className="hp-form-error">
              {error || validation}
            </p>
          )}
          <CmsActionArea>
            <button
              type="button"
              className="cms-button-secondary"
              disabled={locked || !dirty}
              onClick={() => {
                if (window.confirm("Discard unsaved section settings?")) {
                  setValues(initial);
                  setError("");
                  onDirty(false);
                }
              }}
            >
              Discard changes
            </button>
            <button
              type="submit"
              className="cms-button-primary"
              disabled={locked || !dirty || Boolean(validation)}
            >
              {busy ? "Saving…" : "Save Draft"}
            </button>
          </CmsActionArea>
        </form>
      </section>
      {picker && (
        <MediaPicker
          title="Section background"
          category="general"
          currentUrl={String(values.imageUrl)}
          onSelect={(asset) =>
            update({ imageUrl: asset.url, imageAlt: asset.alt || asset.name })
          }
          onClose={() => setPicker(false)}
        />
      )}
      <HomepagePreview dirty={dirty} hidden={false}>
        <HomepageSectionRendering
          section={section}
          data={previewData}
          slide={publicHeroSlides(data.blocks)[0]}
        />
      </HomepagePreview>
    </>
  );
}
