import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { i18n } from "astro:config/client";

export type BlogEntryWithLocaleStatus = CollectionEntry<'blog'> & {
  isFallback?: boolean;
};

export type BlogQueryOptions = {
  filter?: (entry: CollectionEntry<'blog'>) => boolean;
  sort?: (a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) => number;
};

export async function getBlogEntrySort(
  lang: string,
  options: BlogQueryOptions = {}
): Promise<BlogEntryWithLocaleStatus[]> { // 修改返回类型
  const defaultSort = (a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) => {
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  };

  const blogEntries = await getCollection('blog', (entry) => (
    entry.data.draft !== true && (options.filter?.(entry) ?? true)
  ));

  const grouped = new Map<string, Record<string, CollectionEntry<'blog'>>>();
  const defaultLanguage = i18n!.defaultLocale;

  for (const post of blogEntries) {
    const parts = post.id.split('/');
    const fileName = parts[parts.length - 1];
    const id = parts.slice(0, -1).join('/');
    const language: string = fileName.replace('.md', '');

    if (!grouped.has(id)) {
      grouped.set(id, {});
    }
    grouped.get(id)![language] = post;
  }

  const selectedEntries: BlogEntryWithLocaleStatus[] = [];
  
  for (const [id, translations] of grouped.entries()) {
    let selectedPost: CollectionEntry<'blog'> | undefined;
    let isFallback = false; // 默认为 false
    
    if (lang && lang !== defaultLanguage) {
      if (translations[lang]) {
        selectedPost = translations[lang];
      } else if (translations[defaultLanguage]) {
        // --- 关键修改点：触发回退逻辑 ---
        selectedPost = translations[defaultLanguage];
        isFallback = true; 
      }
    } else {
      if (translations[defaultLanguage]) {
        selectedPost = translations[defaultLanguage];
      }
    }
    
    if (selectedPost) {
      selectedEntries.push({
        ...selectedPost,
        id: id,
        isFallback: isFallback // 将状态注入对象
      });
    }
  }

  return selectedEntries.sort(options.sort || defaultSort);
}

export async function getSpec(
    lang: string,
    spec: string
) {
    const defaultLanguage = i18n!.defaultLocale;
    let collection = await getEntry('spec', `${spec}/${lang}`)
    if(!collection) collection = await getEntry('spec', `${spec}/${defaultLanguage}`);
    return collection;
}
