import { PERMISSION_TREE, type PermissionNode } from "./permission-definitions";
import type { AdminAreaPermission } from "./admin";

/** Match the existing Detailed dialog's section/subsection toggles. */
export function permissionNodeKeys(node: PermissionNode): string[] {
  return [node.key.includes(".") ? node.key : "", ...(node.children ?? []).flatMap(permissionNodeKeys)].filter(Boolean);
}

export const DETAILED_PERMISSION_KEYS = PERMISSION_TREE.flatMap(permissionNodeKeys);
const supported = new Set(DETAILED_PERMISSION_KEYS);

export function permissionLeafKeys(node: PermissionNode): string[] {
  return node.children?.length ? node.children.flatMap(permissionLeafKeys) : [node.key];
}

export function supportedPermissionSelection(value: Record<string, boolean>): boolean {
  return Object.keys(value).every(key => supported.has(key));
}

/** Never store {} for new accounts: that means unrestricted legacy access. */
export function deniedDetailedPermissions(): Record<string, boolean> {
  return Object.fromEntries(DETAILED_PERMISSION_KEYS.map(key => [key, false]));
}

export function completePermissionSelection(value: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(DETAILED_PERMISSION_KEYS.map(key => [key, value[key] === true]));
}

/** Existing area gates remain necessary alongside the unchanged detailed checks. */
export function areasForDetailedPermissions(value: Record<string, boolean>): Record<AdminAreaPermission, boolean> {
  const selected = (sections: string[]) => PERMISSION_TREE
    .filter(node => sections.includes(node.key))
    .flatMap(permissionLeafKeys)
    .some(key => value[key] === true);
  return {
    // Blog uses the existing academic navigation/page scope.
    academic: selected(["universities", "countries", "packages", "courses", "blog"]),
    content: selected(["home", "about", "contact"]),
    applications: selected(["applications"]),
    submissions: selected(["submissions"]),
  };
}
