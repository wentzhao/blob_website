import { defineCollection } from 'astro:content';
import { z } from 'astro/zod'; 
import { glob } from "astro/loaders";

const strictDateOnly = z.union([
    z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "日期必须使用 YYYY-MM-DD 格式")
        .refine((value) => {
            const date = new Date(`${value}T00:00:00.000Z`);
            return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
        }, "日期必须是有效的日历日期")
        .transform((value) => new Date(`${value}T00:00:00.000Z`)),
    z.date()
        .refine((value) => !Number.isNaN(value.valueOf()), "日期必须是有效的日历日期")
        .refine((value) => value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0, "日期必须是 date-only 值")
        .transform((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))),
]);

const blogCollection = defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: "./src/content/blog" }),
    schema: z.object({
        title: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: strictDateOnly.optional(),
        draft: z.boolean().optional().default(false),
        description: z.string().optional().default(''),
        image: z.string().optional().default(''),
        slugId: z.string(),
        category: z.string().optional(),
        directory: z.string().optional(),
        pinTop: z.number().optional().default(0),
    }).superRefine((data, context) => {
        if (data.updatedDate && data.updatedDate < data.pubDate) {
            context.addIssue({
                code: "custom",
                path: ["updatedDate"],
                message: "updatedDate 不能早于 pubDate",
            });
        }
    }),
})

const specCollection = defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: "./src/content/spec" }),
    schema: z.object({
        title: z.string(),
    }).strict(),
})
export const collections = {
    blog: blogCollection,
    spec: specCollection,
}
