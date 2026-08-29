import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { i18n } from "astro:config/client";

export type LanguageStatus = {
  requestedLocale: string;
  sourceLocale: string;
  availableLocales: readonly string[];
  isFallback: boolean;
};

export type BlogEntryWithLocaleStatus = CollectionEntry<"blog"> & LanguageStatus & {
  isFallback: boolean;
};

export type PublicBlogEntryGroup = {
  id: string;
  entries: Record<string, CollectionEntry<"blog">>;
  availableLocales: string[];
};

export type BlogQueryOptions = {
  filter?: (entry: CollectionEntry<"blog">) => boolean;
  sort?: (a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) => number;
};

export type BlogDateData = {
  pubDate: Date;
  updatedDate?: Date;
};

/** Returns a defensive copy of the effective last-update date for statistics. */
export function getBlogLastUpdated(data: BlogDateData): Date {
  return new Date((data.updatedDate ?? data.pubDate).valueOf());
}

let publicGroupsPromise: Promise<PublicBlogEntryGroup[]> | undefined;

function getRouteId(entry: CollectionEntry<"blog">) {
  const parts = entry.id.split("/");
  parts.pop();
  return parts.join("/");
}

function getLanguage(entry: CollectionEntry<"blog">) {
  return entry.id.split("/").at(-1)!.replace(/\.md$/, "");
}

/** The build-process cache for public logical articles. All list and tree queries use this snapshot. */
export function getPublicBlogEntryGroups() {
  if (!publicGroupsPromise) {
    publicGroupsPromise = getCollection("blog", (entry) => entry.data.draft !== true && getLanguage(entry) === "zh-cn").then((entries) => {
      const grouped = new Map<string, Record<string, CollectionEntry<"blog">>>();
      for (const entry of entries) {
        const id = getRouteId(entry);
        const language = getLanguage(entry);
        const translations = grouped.get(id) ?? {};
        translations[language] = entry;
        grouped.set(id, translations);
      }
      return [...grouped.entries()].map(([id, groupedEntries]) => ({
        id,
        entries: groupedEntries,
        availableLocales: Object.keys(groupedEntries).sort(),
      }));
    });
  }
  return publicGroupsPromise;
}

export function selectPublicBlogEntry(group: PublicBlogEntryGroup, requestedLocale: string): BlogEntryWithLocaleStatus | undefined {
  const defaultLocale = i18n!.defaultLocale;
  const sourceLocale = requestedLocale !== defaultLocale && group.entries[requestedLocale]
    ? requestedLocale
    : group.entries[defaultLocale]
      ? defaultLocale
      : undefined;
  if (!sourceLocale) return undefined;
  const entry = group.entries[sourceLocale];
  return {
    ...entry,
    id: group.id,
    requestedLocale,
    sourceLocale,
    availableLocales: group.availableLocales,
    isFallback: sourceLocale !== requestedLocale,
  };
}

export async function getBlogEntrySort(lang: string, options: BlogQueryOptions = {}): Promise<BlogEntryWithLocaleStatus[]> {
  const defaultSort = (a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  const entries = (await getPublicBlogEntryGroups())
    .map((group) => selectPublicBlogEntry(group, lang))
    .filter((entry): entry is BlogEntryWithLocaleStatus => Boolean(entry))
    .filter((entry) => options.filter?.(entry) ?? true);
  return entries.sort(options.sort || defaultSort);
}

export async function getSpec(lang: string, spec: string) {
  const defaultLanguage = i18n!.defaultLocale;
  let collection = await getEntry("spec", `${spec}/${lang}`);
  if (!collection) collection = await getEntry("spec", `${spec}/${defaultLanguage}`);
  return collection;
}
