"use client";

import { Button } from "@/components/ui/button";
import { PERMISSION_TREE, type PermissionNode } from "@/lib/auth/permission-definitions";
import { permissionLeafKeys, permissionNodeKeys } from "@/lib/auth/permission-selection";

type Props = {
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  idPrefix: string;
  disabled?: boolean;
};

/** One permission matrix for both account creation and the existing Detailed modal. */
export function PermissionMatrix({ value, onChange, idPrefix, disabled = false }: Props) {
  function toggleSection(node: PermissionNode, allowed: boolean) {
    const next = { ...value };
    for (const key of permissionNodeKeys(node)) next[key] = allowed;
    onChange(next);
  }

  function renderNode(node: PermissionNode, depth = 0) {
    if (!node.children?.length) {
      const id = `${idPrefix}-${node.key}`;
      return <label key={node.key} htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50">
        <input id={id} type="checkbox" className="h-4 w-4 shrink-0" checked={value[node.key] === true}
          disabled={disabled} data-permission-key={node.key}
          onChange={event => onChange({ ...value, [node.key]: event.target.checked })} />
        <span>{node.label}</span>
      </label>;
    }
    const selected = permissionLeafKeys(node).filter(key => value[key] === true).length;
    return <details key={node.key} className={depth === 0 ? "rounded-lg border border-zinc-200 bg-white" : "rounded-lg border border-zinc-200 bg-zinc-50/50"}>
      <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-zinc-900">
        {node.label}<span className="ml-2 font-normal text-zinc-500">{selected ? `${selected} enabled` : "No access selected"}</span>
      </summary>
      <div className="space-y-2 border-t border-zinc-200 px-3 pb-3 pt-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => toggleSection(node, true)}>Enable all</Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => toggleSection(node, false)}>Disable all</Button>
        </div>
        <div className="space-y-2">{node.children.map(child => renderNode(child, depth + 1))}</div>
      </div>
    </details>;
  }

  return <div className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-zinc-50 p-3" aria-label="Detailed access permissions">
    <div className="space-y-3">{PERMISSION_TREE.map(node => renderNode(node))}</div>
  </div>;
}
