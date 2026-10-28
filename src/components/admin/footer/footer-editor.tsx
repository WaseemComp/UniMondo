"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, Save } from "lucide-react";
import { WorkflowPanel } from "@/components/admin/publishing/workflow-panel";
import { HomepagePreview } from "@/components/admin/homepage/homepage-preview";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { FooterView } from "@/components/footer-view";
import { CmsPageHeader } from "@/components/admin/cms/cms-foundation";
import {
  FOOTER_ICONS,
  FOOTER_RESOURCE,
  footerSchema,
  resolveFooter,
  type FooterConfig,
} from "@/lib/footer/model";
import { isWorking, rowsFor } from "@/lib/publishing/model";
import { saveFooterDraft } from "@/app/admin/cms/footer-actions";
import "@/components/admin/homepage/homepage-editor.css";
import "./footer-editor.css";
const tabs = [
  "Branding",
  "Navigation",
  "Contact",
  "Social links",
  "Bottom notices",
  "Sections",
];
type List =
  "explore" | "company" | "contacts" | "social" | "notices" | "sections";
function Field({
  label,
  value,
  onChange,
  multiline = false,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  help?: string;
}) {
  return (
    <label className="ft-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}{" "}
      {help && <small>{help}</small>}
    </label>
  );
}
export function FooterEditor({ defaults }: { defaults: FooterConfig }) {
  const [config, setConfig] = useState(defaults),
    [saved, setSaved] = useState(defaults),
    [tab, setTab] = useState(tabs[0]),
    [busy, setBusy] = useState(false),
    [editable, setEditable] = useState(false),
    [version, setVersion] = useState(0),
    [refresh, setRefresh] = useState(0),
    [picker, setPicker] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [source, setSource] = useState("Default / inherited");
  const dirty = JSON.stringify(config) !== JSON.stringify(saved),
    parsed = footerSchema.safeParse(config);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]");
      if (
        link &&
        link.getAttribute("target") !== "_blank" &&
        !confirm("Leave without saving your footer changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  const patch = (value: Partial<FooterConfig>) => {
    setConfig((old) => ({ ...old, ...value }));
    setError("");
    setMessage("");
  };
  const row = (key: List, index: number, value: Record<string, unknown>) =>
    patch({
      [key]: config[key].map((item, i) =>
        i === index ? { ...item, ...value } : item,
      ),
    } as Partial<FooterConfig>);
  const move = (key: List, index: number, delta: number) => {
    const items = [...config[key]];
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    patch({ [key]: items } as Partial<FooterConfig>);
  };
  const add = (key: Exclude<List, "sections">) => {
    const id = crypto.randomUUID(),
      base = { id, visible: true };
    const item =
      key === "contacts"
        ? { ...base, kind: "email", label: "", value: "" }
        : key === "social"
          ? { ...base, icon: "website", label: "", href: "" }
          : key === "notices"
            ? { ...base, text: "", links: [] }
            : { ...base, label: "", href: "" };
    patch({ [key]: [...config[key], item] } as Partial<FooterConfig>);
  };
  function collection(
    key: List,
    title: string,
    fields: (item: Record<string, unknown>, index: number) => ReactNode,
  ) {
    return (
      <section className="ft-collection">
        <h3>{title}</h3>
        {config[key].map((item, index) => (
          <details key={item.id} open={index === 0} className="ft-item">
            <summary>
              {String(
                ("label" in item && item.label) ||
                  ("title" in item && item.title) ||
                  ("text" in item && item.text) ||
                  `Item ${index + 1}`,
              ).slice(0, 100)}
              {!item.visible ? " · hidden" : ""}
            </summary>
            <div className="ft-item-body">
              {fields(item as unknown as Record<string, unknown>, index)}
              <div className="ft-row-actions">
                <label>
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={(event) =>
                      row(key, index, { visible: event.target.checked })
                    }
                  />
                  Visible after publication
                </label>
                <button
                  type="button"
                  disabled={!index}
                  aria-label={`Move ${title} item ${index + 1} up`}
                  onClick={() => move(key, index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={index === config[key].length - 1}
                  aria-label={`Move ${title} item ${index + 1} down`}
                  onClick={() => move(key, index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                {!saved[key].some((old) => old.id === item.id) && (
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        [key]: config[key].filter((old) => old.id !== item.id),
                      } as Partial<FooterConfig>)
                    }
                  >
                    Remove unsaved item
                  </button>
                )}
              </div>
            </div>
          </details>
        ))}
        {key !== "sections" && (
          <button
            type="button"
            className="cms-button-secondary"
            onClick={() => add(key)}
          >
            <Plus size={15} />
            Add {title.toLowerCase().replace(/s$/, "")}
          </button>
        )}
      </section>
    );
  }
  const linkFields = (
    key: "explore" | "company",
    item: Record<string, unknown>,
    index: number,
  ) => (
    <>
      <Field
        label="Link text"
        value={String(item.label)}
        onChange={(label) => row(key, index, { label })}
      />
      <Field
        label="Link destination"
        help="Use a website path such as /contact, or a secure https:// address."
        value={String(item.href)}
        onChange={(href) => row(key, index, { href })}
      />
    </>
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editable || busy || !dirty || !parsed.success) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await saveFooterDraft({
        config: parsed.data,
        expectedDefaults: JSON.stringify(defaults),
        expectedVersion: version,
      });
      if (!result.ok) setError(result.error);
      else {
        setSaved(parsed.data);
        setConfig(parsed.data);
        setEditable(false);
        setRefresh((value) => value + 1);
        setMessage(
          "Footer draft saved privately. The public footer has not changed.",
        );
      }
    } catch {
      setError("The save could not be confirmed. Reload before retrying.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hp-editor ft-editor">
      <CmsPageHeader
        eyebrow="WEBSITE PAGES"
        title="Footer"
        description="Manage the footer across the public website. Save privately, review changes and publish an approved version explicitly."
      />
      <WorkflowPanel
        resource={FOOTER_RESOURCE}
        dirty={dirty}
        busy={busy}
        refresh={refresh}
        onLoad={(view, published) => {
          if (!view.ready) {
            setEditable(false);
            return;
          }
          const payload =
            !published && isWorking(view.document)
              ? view.document!.proposed
              : view.published;
          const next = resolveFooter(
            defaults,
            rowsFor(payload, "cms_content_blocks"),
          );
          setConfig(next.config);
          setSaved(next.config);
          setSource(next.source);
          setVersion(view.document?.version ?? 0);
          setEditable(
            !published &&
              view.permissions.edit &&
              !Boolean(
                view.document &&
                ["in_review", "approved"].includes(view.document.status),
              ),
          );
        }}
      />
      <div className="ft-workspace">
        <nav className="ft-tabs" aria-label="Footer sections">
          {tabs.map((name) => (
            <button
              type="button"
              key={name}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
          <a className="text-sm underline" href="/admin/home">
            Homepage editor
          </a>
        </nav>
        <form
          className="hp-fields-panel ft-fields"
          onSubmit={save}
          aria-label="Footer editor"
        >
          <p className="ft-source">
            {source === "Saved"
              ? "Saved footer configuration"
              : "Existing website values · contact details inherited from Contact"}
            . Changes here affect only the footer.
          </p>
          {message && (
            <p className="ft-success" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="ft-error" role="alert">
              {error}
            </p>
          )}
          {!parsed.success && dirty && (
            <p className="ft-error" role="alert">
              {parsed.error.issues[0]?.message}
            </p>
          )}
          <fieldset disabled={!editable || busy}>
            {tab === "Branding" && (
              <>
                <h2>Branding</h2>
                <Field
                  label="Company name"
                  value={config.brandName}
                  onChange={(brandName) => patch({ brandName })}
                />
                <Field
                  label="Company description"
                  multiline
                  value={config.description}
                  onChange={(description) => patch({ description })}
                />
                {config.logoUrl && (
                  <Image
                    className="ft-logo"
                    src={config.logoUrl}
                    alt={config.logoAlt}
                    width={240}
                    height={80}
                  />
                )}
                <button
                  type="button"
                  className="cms-button-secondary"
                  onClick={() => setPicker(true)}
                >
                  Change branding image
                </button>
                {config.logoUrl && (
                  <button
                    type="button"
                    className="cms-button-secondary"
                    onClick={() => patch({ logoUrl: "", logoAlt: "" })}
                  >
                    Use company name instead
                  </button>
                )}
                <Field
                  label="Image description"
                  value={config.logoAlt}
                  onChange={(logoAlt) => patch({ logoAlt })}
                />
                <p className="ft-help">
                  Branding image:{" "}
                  {config.logoUrl
                    ? "Selected website / Media Library image"
                    : "Existing company-name branding"}
                </p>
              </>
            )}
            {tab === "Navigation" && (
              <>
                {collection("explore", "Explore links", (item, i) =>
                  linkFields("explore", item, i),
                )}
                {collection("company", "Company links", (item, i) =>
                  linkFields("company", item, i),
                )}
              </>
            )}
            {tab === "Contact" &&
              collection("contacts", "Contact details", (item, i) => (
                <>
                  <label className="ft-field">
                    <span>Contact type</span>
                    <select
                      value={String(item.kind)}
                      onChange={(event) =>
                        row("contacts", i, { kind: event.target.value })
                      }
                    >
                      {["address", "email", "phone", "text"].map((value) => (
                        <option value={value} key={value}>
                          {
                            {
                              address: "Office address",
                              email: "Email address",
                              phone: "Telephone number",
                              text: "Supporting text",
                            }[value as "address"]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Label (optional)"
                    value={String(item.label)}
                    onChange={(label) => row("contacts", i, { label })}
                  />
                  <Field
                    label="Contact information"
                    multiline={item.kind === "address"}
                    value={String(item.value)}
                    onChange={(value) => row("contacts", i, { value })}
                  />
                </>
              ))}
            {tab === "Social links" &&
              collection("social", "Social links", (item, i) => (
                <>
                  <Field
                    label="Accessible link name"
                    value={String(item.label)}
                    onChange={(label) => row("social", i, { label })}
                  />
                  <Field
                    label="Link destination"
                    help="Secure https:// address, or mailto: followed by an email address."
                    value={String(item.href)}
                    onChange={(href) => row("social", i, { href })}
                  />
                  <label className="ft-field">
                    <span>Icon</span>
                    <select
                      value={String(item.icon)}
                      onChange={(event) =>
                        row("social", i, { icon: event.target.value })
                      }
                    >
                      {FOOTER_ICONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon === "x"
                            ? "X"
                            : icon.charAt(0).toUpperCase() + icon.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ))}
            {tab === "Bottom notices" && (
              <>
                <h2>Copyright and notices</h2>
                <Field
                  label="Copyright line"
                  help="{year} automatically displays the current year."
                  value={config.copyright}
                  onChange={(copyright) => patch({ copyright })}
                />
                {collection("notices", "Notices", (item, i) => (
                  <>
                    <Field
                      label="Notice or disclaimer"
                      multiline
                      value={String(item.text)}
                      onChange={(text) => row("notices", i, { text })}
                    />
                    <p className="ft-help">
                      Matching link text becomes clickable in this notice. Other
                      links appear after it.
                    </p>
                    {config.notices[i].links.map((link, j) => (
                      <div key={link.id} className="ft-notice-link">
                        <Field
                          label="Notice link text"
                          value={link.label}
                          onChange={(label) =>
                            row("notices", i, {
                              links: config.notices[i].links.map((old, k) =>
                                k === j ? { ...old, label } : old,
                              ),
                            })
                          }
                        />
                        <Field
                          label="Notice link destination"
                          value={link.href}
                          onChange={(href) =>
                            row("notices", i, {
                              links: config.notices[i].links.map((old, k) =>
                                k === j ? { ...old, href } : old,
                              ),
                            })
                          }
                        />
                        <label>
                          <input
                            type="checkbox"
                            checked={link.visible}
                            onChange={(event) =>
                              row("notices", i, {
                                links: config.notices[i].links.map((old, k) =>
                                  k === j
                                    ? { ...old, visible: event.target.checked }
                                    : old,
                                ),
                              })
                            }
                          />
                          Show this link
                        </label>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cms-button-secondary"
                      onClick={() =>
                        row("notices", i, {
                          links: [
                            ...config.notices[i].links,
                            {
                              id: crypto.randomUUID(),
                              label: "",
                              href: "",
                              visible: true,
                            },
                          ],
                        })
                      }
                    >
                      Add notice link
                    </button>
                  </>
                ))}
              </>
            )}
            {tab === "Sections" && (
              <>
                <label className="ft-field">
                  <span>
                    <input
                      type="checkbox"
                      checked={config.visible}
                      onChange={(event) =>
                        patch({ visible: event.target.checked })
                      }
                    />
                    Show footer after publication
                  </span>
                </label>
                {collection("sections", "Footer sections", (item, i) =>
                  item.id === "branding" ? (
                    <p className="ft-help">
                      The company name is edited in Branding.
                    </p>
                  ) : (
                    <Field
                      label="Section heading"
                      value={String(item.title)}
                      onChange={(title) => row("sections", i, { title })}
                    />
                  ),
                )}
              </>
            )}
          </fieldset>
          <div className="ft-save-actions">
            <button
              type="submit"
              className="cms-button-primary"
              disabled={!editable || busy || !dirty || !parsed.success}
            >
              <Save size={15} />
              {busy ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              className="cms-button-secondary"
              disabled={!dirty || busy}
              onClick={() => {
                setConfig(saved);
                setError("");
                setMessage("");
              }}
            >
              Discard unsaved changes
            </button>
            <button
              type="button"
              className="cms-button-secondary"
              disabled={!editable || busy}
              onClick={() => {
                if (
                  confirm(
                    "Use the existing website defaults and inherited contact details in this private draft?",
                  )
                )
                  patch(defaults);
              }}
            >
              Use existing website values
            </button>
          </div>
        </form>
        <HomepagePreview label="Footer" hiddenMessage="This footer is hidden. Preview shows how it would look if made visible." dirty={dirty} hidden={!config.visible}>
          <FooterView config={{ ...config, visible: true }} />
        </HomepagePreview>
      </div>
      {picker && (
        <MediaPicker
          title="Footer branding"
          category="general"
          currentUrl={config.logoUrl}
          onClose={() => setPicker(false)}
          onSelect={(asset) =>
            patch({ logoUrl: asset.url, logoAlt: asset.alt || asset.name })
          }
        />
      )}
    </div>
  );
}
