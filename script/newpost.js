import { writeFile, mkdir, lstat, realpath, readFile } from 'fs/promises';
import { dirname, join, relative, resolve, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node newpost.js <path> <directory> [lang]; translations inherit directory from their sibling');
    process.exit(1);
}

const folderPath = args[0];
const remainingArgs = args.slice(1);
const possibleLang = remainingArgs.at(-1);
const lang = ['en', 'zh-cn'].includes(possibleLang) ? remainingArgs.pop() : 'zh-cn';
const requestedDirectory = remainingArgs[0];
if (remainingArgs.length > 1) {
    console.error('Usage: node newpost.js <path> <directory> [lang]');
    process.exit(1);
}

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
const directoryDefinitionPath = join(__dirname, '..', 'src', 'content', 'directory-tree.json');

const directoryDefinitions = await readFile(directoryDefinitionPath, 'utf8').then(JSON.parse);
const directoryById = new Map(directoryDefinitions.map((definition) => [definition.id, definition]));

function categoryForDirectory(directory) {
    let definition = directoryById.get(directory);
    while (definition?.parentId) definition = directoryById.get(definition.parentId);
    return definition?.category || null;
}

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

const otherLang = lang === 'zh-cn' ? 'en' : 'zh-cn';
const siblingFrontmatter = await readFile(join(fullPath, `${otherLang}.md`), 'utf8')
    .then((content) => ({
        slugId: content.match(/^slugId:\s*(?:"([^"]+)"|'([^']+)'|([^\r\n#]+))/m),
        directory: content.match(/^directory:\s*(?:"([^"]+)"|'([^']+)'|([^\r\n#]+))/m),
    }))
    .then((matches) => ({
        slugId: matches.slugId ? (matches.slugId[1] || matches.slugId[2] || matches.slugId[3]).trim() : null,
        directory: matches.directory ? (matches.directory[1] || matches.directory[2] || matches.directory[3]).trim() : null,
    }))
    .catch(() => ({ slugId: null, directory: null }));

const directory = siblingFrontmatter.directory || requestedDirectory;
if (!directory) {
    console.error('首次创建文章必须提供有效 directory ID');
    process.exit(1);
}
if (!directoryById.has(directory)) {
    console.error(`未知 directory ID: ${directory}`);
    process.exit(1);
}
if (siblingFrontmatter.directory && requestedDirectory && requestedDirectory !== siblingFrontmatter.directory) {
    console.error(`译文必须继承兄弟文件的 directory: ${siblingFrontmatter.directory}`);
    process.exit(1);
}
const category = categoryForDirectory(directory);

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

// 默认的 Markdown 内容
const defaultContent = `---
title: new post
pubDate: ${new Date().toISOString().split('T')[0]}
description: Some description here
image: ""
slugId: ${siblingFrontmatter.slugId || randomUUID()}
directory: ${directory}
category: ${category}
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
