import { writeFile, mkdir, lstat, realpath, readFile } from 'fs/promises';
import { dirname, join, relative, resolve, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node newpost.js <path> [lang] (default lang is zh-cn)');
    process.exit(1);
}

const folderPath = args[0];
const lang = args[1] || 'zh-cn'; // 如果没有提供语言参数，默认使用 zh-cn

// 确保语言参数有效
const validLangs = ['en', 'zh-cn'];
if (!validLangs.includes(lang)) {
    console.error(`Invalid language: ${lang}. Valid options are: ${validLangs.join(', ')}`);
    process.exit(1);
}

// 定义基础路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basePath = join(__dirname, '..', 'src', 'content', 'blog');

function isWithin(base, target) {
    const relativePath = relative(base, target);
    return relativePath !== '..' && !relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(relativePath);
}

async function validateFolderPath(value) {
    if (typeof value !== 'string' || value.length === 0) {
        return { error: '文章路径不能为空' };
    }

    const normalized = value.replace(/\\/g, '/');
    const segments = normalized.split('/');
    const reservedNames = new Set(['en.md', 'zh-cn.md']);
    if (
        normalized.startsWith('/') ||
        normalized.startsWith('\\\\') ||
        /^[A-Za-z]:\//.test(normalized) ||
        segments.some((segment) => !segment || segment === '.' || segment === '..' || reservedNames.has(segment))
    ) {
        return { error: `非法文章路径: ${value}` };
    }

    const resolvedBasePath = resolve(basePath);
    const fullPath = resolve(resolvedBasePath, ...segments);
    if (!isWithin(resolvedBasePath, fullPath)) {
        return { error: `文章路径必须位于 src/content/blog 下: ${value}` };
    }

    let currentPath = resolvedBasePath;
    for (const segment of segments) {
        currentPath = join(currentPath, segment);
        try {
            if ((await lstat(currentPath)).isSymbolicLink()) {
                return { error: `文章路径不能包含符号链接: ${value}` };
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                return { error: `无法检查文章路径: ${value}` };
            }
            break;
        }
    }

    return { fullPath, resolvedBasePath };
}

const validatedPath = await validateFolderPath(folderPath);
if (validatedPath.error) {
    console.error(validatedPath.error);
    process.exit(1);
}

const { fullPath, resolvedBasePath } = validatedPath;
const filePath = join(fullPath, `${lang}.md`);

const existingFile = await lstat(filePath).catch(() => null);
if (existingFile?.isSymbolicLink()) {
    console.error(`文章文件不能是符号链接: ${filePath}`);
    process.exit(1);
}
if (existingFile) {
    console.warn(`File already exists: ${filePath}`);
    console.log(`Successfully created new post at: ${filePath}`);
    process.exit(0);
}

// 创建文件夹（如果不存在）
try {
    await mkdir(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
} catch (error) {
    console.error(`Error creating directory: ${error.message}`);
    process.exit(1);
}

const realFullPath = await realpath(fullPath).catch(() => null);
if (!realFullPath || !isWithin(await realpath(resolvedBasePath), realFullPath)) {
    console.error(`文章路径必须位于 src/content/blog 下: ${folderPath}`);
    process.exit(1);
}

const otherLang = lang === 'zh-cn' ? 'en' : 'zh-cn';
const siblingSlugId = await readFile(join(fullPath, `${otherLang}.md`), 'utf8')
    .then((content) => content.match(/^slugId:\s*(?:"([^"]+)"|'([^']+)'|([^\r\n#]+))/m))
    .then((match) => match ? (match[1] || match[2] || match[3]).trim() : null)
    .catch(() => null);

// 默认的 Markdown 内容
const defaultContent = `---
title: new post
pubDate: ${new Date().toISOString().split('T')[0]}
description: Some description here
image: ""
slugId: ${siblingSlugId || randomUUID()}
category: ""
draft: false
pinTop: 0
---

## Title

Content goes here...
`;

try {
    const fileBeforeWrite = await lstat(filePath).catch(() => null);
    if (fileBeforeWrite) {
        console.error(`文章文件已存在或是符号链接: ${filePath}`);
        process.exit(1);
    }
    await writeFile(filePath, defaultContent, { encoding: 'utf8', flag: 'wx' });
    console.log(`Created file: ${filePath}`);
} catch (error) {
    console.error(`Error creating file: ${error.message}`);
    process.exit(1);
}

console.log(`Successfully created new post at: ${filePath}`);
