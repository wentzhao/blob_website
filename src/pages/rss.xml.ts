import rss from "@astrojs/rss";
import { getBlogEntrySort } from "../utils/content-utils"
import { siteConfig, profileConfig } from '../config';
import type { APIContext } from "astro";
import { i18n } from "astro:config/client";
import { getRelativeLocaleUrl } from "../utils/url-utils";

export async function GET(context: APIContext) {
    const blog = await getBlogEntrySort(i18n!.defaultLocale);
    return rss({
        title: `${siteConfig.title} - ${siteConfig.subTitle}`,
        description: profileConfig.description,
        site: context.site ?? "https://example.com",
        items: blog.slice(0, 20).map((post) => ({
            title: post.data.title,
            pubDate: post.data.pubDate,
            description: post.data.description,
            link: getRelativeLocaleUrl(i18n!.defaultLocale, `/blog/${post.id}/`),
        })),
    })
}
