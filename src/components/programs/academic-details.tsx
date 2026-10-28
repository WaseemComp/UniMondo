import { programmeFacts } from "@/lib/academic/public";
import { object, text } from "@/lib/academic/model";
import { safeDestination } from "@/lib/homepage/validation";
export function ProgrammeDetails({
  details,
  deadline = "",
}: {
  details?: Record<string, unknown>;
  deadline?: string;
}) {
  if (!details || !Object.keys(details).length) return null;
  const facts = programmeFacts(details, deadline),
    links = [
      ["Official programme page", details.official_url],
      ["Official application page", details.application_url],
    ].filter(
      ([, url]) =>
        text(url).startsWith("https://") && safeDestination(text(url)),
    );
  return (
    <details className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-zinc-800">
        Programme information and official sources
      </summary>
      <dl className="mt-3 space-y-3">
        {facts.map(([label, value]) => (
          <div key={text(label)}>
            <dt className="text-xs font-semibold text-zinc-500">
              {text(label)}
            </dt>
            <dd className="whitespace-pre-line break-words text-zinc-700">
              {text(value)}
            </dd>
          </div>
        ))}
        {typeof details.tuition_amount === "number" && (
          <div>
            <dt className="text-xs font-semibold text-zinc-500">
              Listed tuition amount
            </dt>
            <dd>
              {details.tuition_amount} {text(details.currency)}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-3 flex flex-col gap-2">
        {links.map(([label, url]) => (
          <a
            key={text(label)}
            href={text(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#244B50] underline"
          >
            {text(label)}
          </a>
        ))}
      </div>
      {details.verification !== "verified" && (
        <p className="mt-3 text-xs text-zinc-500">
          Information is incomplete or has not been verified against an official
          source. Confirm requirements with the institution.
        </p>
      )}
    </details>
  );
}
export function UniversityDetails({
  profile,
}: {
  profile?: Record<string, unknown>;
}) {
  const p = object(profile);
  if (!Object.keys(p).length) return null;
  const url = text(p.official_url);
  return (
    <div className="mt-3 space-y-2 text-sm text-zinc-600">
      {text(p.location) && <p>{text(p.location)}</p>}
      {text(p.description) && (
        <p className="whitespace-pre-line">{text(p.description)}</p>
      )}
      {url.startsWith("https://") && safeDestination(url) && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#244B50] underline"
        >
          Official university website
        </a>
      )}
    </div>
  );
}
