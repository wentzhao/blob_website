import { i18n } from "astro:config/client";

function splitPathSuffix(path: string): { pathname: string; suffix: string } {
	const match = path.match(/^([^?#]*)([?#].*)?$/);
	return { pathname: match?.[1] || "/", suffix: match?.[2] || "" };
}

function joinPath(...parts: string[]): string {
	const last = parts.at(-1) || "";
	const { pathname, suffix } = splitPathSuffix(last);
	const hasTrailingSlash = pathname === "/" || (pathname.length > 1 && pathname.endsWith("/"));
	const pathParts = [...parts.slice(0, -1), pathname]
		.flatMap((part) => part.replace(/\\/g, "/").split("/"))
		.filter(Boolean);
	const joined = `/${pathParts.join("/")}`;
	return `${joined}${hasTrailingSlash && joined !== "/" ? "/" : ""}${suffix}`;
}
/**
 * 构建完整的URL路径
 * @param path - 需要拼接的路径片段
 * @returns 返回拼接后的完整URL路径
 */
export function baseUrl(path: string) {
	return joinPath(import.meta.env.BASE_URL || "/", path);
}

/**
 * 将相对于content/blog目录的路径转换为相对于src目录的路径
 * @param contentPath 相对于content/blog目录的路径
 * @param blogName 博客文章的名称/ID，用于构建完整路径
 * @returns 相对于src目录的路径
 */
export function blogCoverUrl(contentPath: string, blogName: string): string {

    if (!contentPath) return '';
    
    if (contentPath.startsWith('http')) {
        return contentPath;
    }

    // 处理相对路径 ./ 开头的情况
    if (contentPath.startsWith('./')) {
        contentPath = contentPath.substring(2);
    }
    
    // 移除可能的前导斜杠
    const normalizedPath = contentPath.startsWith('/') ? contentPath.slice(1) : contentPath;
    
    // 构造相对于src目录的路径，包含博客名称文件夹
    return joinPath("content/blog/", blogName, normalizedPath)
}

export function getRelativeLocaleUrl(lang: string, path: string) : string { 
    const prefixDefaultLocale = typeof i18n?.routing === "object" ? i18n.routing.prefixDefaultLocale : false;
    const localizedPath = prefixDefaultLocale || lang !== i18n?.defaultLocale
        ? joinPath(lang, path)
        : joinPath(path);
    return baseUrl(localizedPath);
}
