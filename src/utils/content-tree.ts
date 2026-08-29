import { directoryById as definitionsById, directoryDefinitions, getDirectoryCategory, getDirectoryText } from "@/content/navigation";
import { getBlogLastUpdated, getPublicBlogEntryGroups, selectPublicBlogEntry } from "@utils/content-utils";
import type { BlogEntryWithLocaleStatus, LanguageStatus } from "@utils/content-utils";

export type DirectoryId = string;

export type ArticleTreeArticle = BlogEntryWithLocaleStatus & {
  readonly kind: "article";
  readonly directoryId: DirectoryId;
  readonly ancestors: readonly DirectoryId[];
  readonly language: Readonly<LanguageStatus>;
};

export type DirectoryNode = {
  readonly kind: "directory";
  readonly id: DirectoryId;
  readonly parentId?: DirectoryId;
  readonly label: string;
  readonly description: string;
  readonly ancestors: readonly DirectoryId[];
  readonly children: readonly ContentTreeNode[];
  readonly directories: readonly DirectoryNode[];
  readonly articles: readonly ArticleTreeArticle[];
};

export type ContentTreeNode = DirectoryNode | ArticleTreeArticle;

export type ContentTree = {
  readonly roots: readonly DirectoryNode[];
  readonly directoryById: ReadonlyMap<DirectoryId, DirectoryNode>;
  readonly articleById: ReadonlyMap<string, ArticleTreeArticle>;
};

export type DirectoryTreeContext = {
  readonly directory: DirectoryNode;
  readonly ancestors: readonly DirectoryNode[];
  readonly path: readonly DirectoryNode[];
  readonly childDirectories: readonly DirectoryNode[];
  readonly articles: readonly ArticleTreeArticle[];
  readonly summary: DirectorySummary;
};

export type DirectorySummary = {
  readonly allArticles: readonly ArticleTreeArticle[];
  readonly articleCount: number;
  readonly recentArticles: readonly ArticleTreeArticle[];
  readonly lastUpdated?: Date;
};

export type ArticleTreeContext = {
  readonly article: ArticleTreeArticle;
  readonly directory: DirectoryNode;
  readonly ancestors: readonly DirectoryNode[];
  readonly siblings: readonly ArticleTreeArticle[];
  readonly childNodes: readonly [];
  readonly path: readonly (DirectoryNode | ArticleTreeArticle)[];
};

type MutableDirectoryNode = {
  kind: "directory";
  id: DirectoryId;
  parentId?: DirectoryId;
  label: string;
  description: string;
  ancestors: DirectoryId[];
  children: ContentTreeNode[];
  directories: MutableDirectoryNode[];
  articles: ArticleTreeArticle[];
};

const treeByLocale = new Map<string, Promise<ContentTree>>();

function freezeArray<T>(items: T[]): readonly T[] {
  return Object.freeze(items);
}

function readonlyMap<K, V>(map: Map<K, V>): ReadonlyMap<K, V> {
  return Object.freeze({
    get size() { return map.size; },
    get: map.get.bind(map),
    has: map.has.bind(map),
    entries: map.entries.bind(map),
    keys: map.keys.bind(map),
    values: map.values.bind(map),
    forEach: map.forEach.bind(map),
    [Symbol.iterator]: map[Symbol.iterator].bind(map),
  } satisfies ReadonlyMap<K, V>);
}

class ImmutableDate extends Date {
  private rejectMutation(): never {
    throw new TypeError("Content tree dates are immutable");
  }

  setDate(..._args: number[]): never { return this.rejectMutation(); }
  setFullYear(..._args: number[]): never { return this.rejectMutation(); }
  setHours(..._args: number[]): never { return this.rejectMutation(); }
  setMilliseconds(..._args: number[]): never { return this.rejectMutation(); }
  setMinutes(..._args: number[]): never { return this.rejectMutation(); }
  setMonth(..._args: number[]): never { return this.rejectMutation(); }
  setSeconds(..._args: number[]): never { return this.rejectMutation(); }
  setTime(..._args: number[]): never { return this.rejectMutation(); }
  setUTCDate(..._args: number[]): never { return this.rejectMutation(); }
  setUTCFullYear(..._args: number[]): never { return this.rejectMutation(); }
  setUTCHours(..._args: number[]): never { return this.rejectMutation(); }
  setUTCMilliseconds(..._args: number[]): never { return this.rejectMutation(); }
  setUTCMinutes(..._args: number[]): never { return this.rejectMutation(); }
  setUTCMonth(..._args: number[]): never { return this.rejectMutation(); }
  setUTCSeconds(..._args: number[]): never { return this.rejectMutation(); }
}

function immutableArticleData(data: BlogEntryWithLocaleStatus["data"]) {
  const snapshot = {
    ...data,
    pubDate: new ImmutableDate(data.pubDate.valueOf()),
    ...(data.updatedDate ? { updatedDate: new ImmutableDate(data.updatedDate.valueOf()) } : {}),
  };
  Object.freeze(snapshot.pubDate);
  if (snapshot.updatedDate) Object.freeze(snapshot.updatedDate);
  return Object.freeze(snapshot);
}

function collectSubtreeArticles(directory: DirectoryNode, articles: ArticleTreeArticle[]) {
  articles.push(...directory.articles);
  for (const child of directory.directories) {
    collectSubtreeArticles(child, articles);
  }
}

function compareArticleDateDescending(a: ArticleTreeArticle, b: ArticleTreeArticle) {
  return (b.data.pubDate.valueOf() - a.data.pubDate.valueOf()) || a.id.localeCompare(b.id);
}

function compareArticleDisplayOrder(a: ArticleTreeArticle, b: ArticleTreeArticle) {
  return (b.data.pinTop - a.data.pinTop) || compareArticleDateDescending(a, b);
}

function getDirectorySummary(directory: DirectoryNode): DirectorySummary {
  const subtreeArticles: ArticleTreeArticle[] = [];
  collectSubtreeArticles(directory, subtreeArticles);
  const allArticles = [...subtreeArticles].sort(compareArticleDisplayOrder);
  const recentArticles = [...subtreeArticles].sort(compareArticleDateDescending).slice(0, 5);
  const lastUpdated = subtreeArticles.length > 0
    ? (() => {
        const effective = new Date(Math.max(...subtreeArticles.map((article) => getBlogLastUpdated(article.data).valueOf())));
        return new Date(Date.UTC(effective.getUTCFullYear(), effective.getUTCMonth(), effective.getUTCDate()));
      })()
    : undefined;

  return Object.freeze({
    allArticles: freezeArray(allArticles),
    articleCount: allArticles.length,
    recentArticles: freezeArray(recentArticles),
    ...(lastUpdated ? { lastUpdated: new ImmutableDate(lastUpdated.valueOf()) } : {}),
  });
}

function directoryAncestors(id: string) {
  const ancestors: string[] = [];
  let current = definitionsById.get(id);
  while (current?.parentId) {
    ancestors.unshift(current.parentId);
    current = definitionsById.get(current.parentId);
  }
  return ancestors;
}

async function validatePublicDirectories() {
  const groups = await getPublicBlogEntryGroups();
  for (const group of groups) {
    const directories = new Set<string>();
    for (const [locale, entry] of Object.entries(group.entries)) {
      const directory = entry.data.directory;
      const sourcePath = `${group.id}/${locale}.md`;
      if (!directory) throw new Error(`Public article ${sourcePath} is missing required directory`);
      if (!definitionsById.has(directory)) throw new Error(`Public article ${sourcePath} uses unknown directory: ${directory}`);
      directories.add(directory);
      const category = getDirectoryCategory(directory);
      if (entry.data.category !== category) {
        throw new Error(`Public article ${sourcePath} category must be ${category} for directory ${directory}`);
      }
    }
    if (directories.size > 1) {
      throw new Error(`Public article ${group.id} has inconsistent directory values across public translations`);
    }
  }
  return groups;
}

async function buildContentTree(locale: string): Promise<ContentTree> {
  const groups = await validatePublicDirectories();
  const directoryById = new Map<DirectoryId, MutableDirectoryNode>();
  const roots: MutableDirectoryNode[] = [];

  for (const definition of directoryDefinitions) {
    const text = getDirectoryText(definition, locale);
    const node: MutableDirectoryNode = {
      kind: "directory",
      id: definition.id,
      ...(definition.parentId ? { parentId: definition.parentId } : {}),
      label: text.label,
      description: text.description,
      ancestors: directoryAncestors(definition.id),
      children: [],
      directories: [],
      articles: [],
    };
    directoryById.set(node.id, node);
    if (definition.parentId) {
      directoryById.get(definition.parentId)!.directories.push(node);
    } else {
      roots.push(node);
    }
  }

  const articleById = new Map<string, ArticleTreeArticle>();
  for (const group of groups) {
    const selected = selectPublicBlogEntry(group, locale);
    if (!selected) continue;
    const directoryId = selected.data.directory!;
    const article: ArticleTreeArticle = {
      ...selected,
      data: immutableArticleData(selected.data),
      kind: "article",
      directoryId,
      ancestors: freezeArray(directoryAncestors(directoryId)),
      availableLocales: freezeArray([...selected.availableLocales]),
      language: {
        requestedLocale: selected.requestedLocale,
        sourceLocale: selected.sourceLocale,
        availableLocales: freezeArray([...selected.availableLocales]),
        isFallback: selected.isFallback,
      },
    };
    Object.freeze(article.language);
    Object.freeze(article);
    directoryById.get(directoryId)!.articles.push(article);
    articleById.set(article.id, article);
  }

  for (const node of directoryById.values()) {
    node.articles.sort((a, b) => (b.data.pinTop - a.data.pinTop) || (b.data.pubDate.valueOf() - a.data.pubDate.valueOf()));
    node.children.push(...node.directories, ...node.articles);
  }
  const readonlyDirectoryById = new Map<DirectoryId, DirectoryNode>();
  for (const node of directoryById.values()) {
    freezeArray(node.ancestors);
    freezeArray(node.directories);
    freezeArray(node.articles);
    freezeArray(node.children);
    Object.freeze(node);
    readonlyDirectoryById.set(node.id, node);
  }
  return Object.freeze({
    roots: freezeArray(roots),
    directoryById: readonlyMap(readonlyDirectoryById),
    articleById: readonlyMap(articleById),
  });
}

/** Returns the locale-specific, build-process-cached public content tree. */
export function getContentTree(locale: string): Promise<ContentTree> {
  let tree = treeByLocale.get(locale);
  if (!tree) {
    tree = buildContentTree(locale);
    treeByLocale.set(locale, tree);
  }
  return tree;
}

export async function getArticleTreeContext(locale: string, articleId: string): Promise<ArticleTreeContext | undefined> {
  const tree = await getContentTree(locale);
  const article = tree.articleById.get(articleId);
  if (!article) return undefined;
  const directory = tree.directoryById.get(article.directoryId)!;
  const ancestors = freezeArray(article.ancestors.map((id) => tree.directoryById.get(id)!));
  return Object.freeze({
    article,
    directory,
    ancestors,
    siblings: freezeArray(directory.articles.filter((candidate) => candidate.id !== article.id)),
    childNodes: Object.freeze([]) as readonly [],
    path: freezeArray([...ancestors, directory, article]),
  });
}

export async function getDirectoryTreeContext(locale: string, directoryId: DirectoryId): Promise<DirectoryTreeContext | undefined> {
  const tree = await getContentTree(locale);
  const directory = tree.directoryById.get(directoryId);
  if (!directory) return undefined;
  const ancestors = freezeArray(directory.ancestors.map((id) => tree.directoryById.get(id)!));
  return Object.freeze({
    directory,
    ancestors,
    path: freezeArray([...ancestors, directory]),
    childDirectories: directory.directories,
    articles: directory.articles,
    summary: getDirectorySummary(directory),
  });
}
