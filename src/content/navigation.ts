import definitions from "./directory-tree.json";

export type DirectoryDefinition = {
  id: string;
  parentId: string | null;
  category?: string;
  labels: Record<string, string>;
  descriptions: Record<string, string>;
};

export type NavigationChild = { id: string; label: string; description: string };
export type NavigationSection = {
  id: string;
  label: string;
  description: string;
  path: string;
  directoryPath: string;
  children: NavigationChild[];
};

export function validateDirectoryDefinitions(input: DirectoryDefinition[]) {
  // English labels remain required for registry completeness, but are not rendered by the Chinese-only public site.
  const byId = new Map<string, DirectoryDefinition>();
  for (const definition of input) {
    if (!definition.id || byId.has(definition.id)) throw new Error(`Duplicate directory id: ${definition.id}`);
    if (!definition.labels["zh-cn"] || !definition.labels.en) throw new Error(`Directory ${definition.id} requires zh-cn and en labels`);
    if (!definition.descriptions["zh-cn"] || !definition.descriptions.en) throw new Error(`Directory ${definition.id} requires zh-cn and en descriptions`);
    byId.set(definition.id, definition);
  }
  for (const definition of input) {
    if (definition.parentId === definition.id) throw new Error(`Directory ${definition.id} cannot parent itself`);
    if (definition.parentId && !byId.has(definition.parentId)) throw new Error(`Directory ${definition.id} has unknown parent ${definition.parentId}`);
    if (!definition.parentId && !definition.category) throw new Error(`Root directory ${definition.id} requires a category`);
    if (definition.parentId && definition.category) throw new Error(`Only root directory ${definition.id} may define a category`);
    const ancestors = new Set<string>([definition.id]);
    let current = definition;
    while (current.parentId) {
      if (ancestors.has(current.parentId)) throw new Error(`Directory cycle includes ${current.parentId}`);
      ancestors.add(current.parentId);
      current = byId.get(current.parentId)!;
    }
  }
  return input;
}

export const directoryDefinitions = validateDirectoryDefinitions(definitions as DirectoryDefinition[]);
export const directoryById = new Map(directoryDefinitions.map((definition) => [definition.id, definition]));

export function getDirectoryText(definition: DirectoryDefinition, locale: string) {
  const sourceLocale = definition.labels[locale] ? locale : "zh-cn";
  return { label: definition.labels[sourceLocale], description: definition.descriptions[sourceLocale] };
}

export function getDirectoryRoot(definitionOrId: DirectoryDefinition | string) {
  let current = typeof definitionOrId === "string" ? directoryById.get(definitionOrId) : definitionOrId;
  if (!current) return undefined;
  while (current.parentId) current = directoryById.get(current.parentId)!;
  return current;
}

export function getDirectoryCategory(directoryId: string) {
  return getDirectoryRoot(directoryId)?.category;
}

export const topSections: NavigationSection[] = directoryDefinitions
  .filter((definition) => !definition.parentId)
  .map((definition) => {
    const text = getDirectoryText(definition, "zh-cn");
    return {
      id: definition.id,
      label: text.label,
      description: text.description,
      path: `/archives/?category=${encodeURIComponent(definition.category!)}`,
      directoryPath: `/knowledge/${definition.id}/`,
      children: directoryDefinitions
        .filter((child) => child.parentId === definition.id)
        .map((child) => ({ id: child.id, ...getDirectoryText(child, "zh-cn") })),
    };
  });
