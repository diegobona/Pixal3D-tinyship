import { en, zhCN } from "../i18n/locales";

type SupportedLocale = "en" | "zh-CN";

const translations = { en, "zh-CN": zhCN } as const;

export type StaticBlogFaqItem = {
  question: string;
  answer: string;
};

export type StaticBlogSection =
  | {
      type: "paragraphs";
      heading?: string;
      paragraphs: string[];
    }
  | {
      type: "linked-paragraphs";
      heading?: string;
      paragraphs: Array<Array<{ text: string; href?: string }>>;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      type: "list";
      heading: string;
      items: string[];
    }
  | {
      type: "faq";
      heading: string;
      items: StaticBlogFaqItem[];
    };

export type StaticBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  authorName: string;
  publishedAt: string;
  sections: StaticBlogSection[];
};

const BLOG_AUTHOR = "Pixal3D Team";
const PUBLISHED_AT = "2026-05-16T00:00:00.000Z";

const LEGACY_STATIC_BLOG_POSTS: StaticBlogPost[] = [
  {
    id: "static-image-to-3d-model",
    slug: "image-to-3d-model",
    title: "Image to 3D Model Guide",
    excerpt:
      "Learn how to choose cleaner source images, evaluate the first result, and avoid common image-to-3D mistakes.",
    coverImage: "/blog-covers/image-to-3d-model.webp",
    authorName: BLOG_AUTHOR,
    publishedAt: PUBLISHED_AT,
    sections: [
      {
        type: "paragraphs",
        paragraphs: [
          "Image-to-3D generation works best when the source image gives the model a clear object, a readable outline, and enough surface detail.",
          "This guide explains how to choose better inputs and how to judge the first generated result before using it in downstream work.",
        ],
      },
      {
        type: "paragraphs",
        heading: "What makes a good source image",
        paragraphs: [
          "A good image-to-3D input usually has one main subject, a clean edge against the background, and visible details on the parts you care about.",
          "Product shots, object renders, simple character concepts, and front-facing reference images tend to be easier than crowded lifestyle photos.",
          "If the subject blends into the background, the generator may invent soft edges or lose important contours. If the image shows only one flat side of the object, the generated model may need extra review because the hidden side has to be inferred.",
          "Before uploading, crop around the object and remove extra visual noise. A simple crop can improve shape clarity more than a longer prompt or repeated retries.",
        ],
      },
      {
        type: "list",
        heading: "Practical checklist",
        items: [
          "Use one clear subject instead of a scene with many objects.",
          "Keep the background plain enough that the silhouette is easy to read.",
          "Prefer images where the object is not cut off by the frame.",
          "Check whether important textures are visible in the input image.",
          "After generation, inspect shape, scale, texture placement, and hollow or broken areas.",
        ],
      },
      {
        type: "list",
        heading: "Common mistakes",
        items: [
          "Uploading a busy image and expecting the model to know which object matters.",
          "Using a tiny thumbnail where edges and textures are already unclear.",
          "Judging only the preview image instead of rotating and checking the full 3D result.",
        ],
      },
      {
        type: "faq",
        heading: "FAQ",
        items: [
          {
            question: "Can I turn any image into a 3D model?",
            answer:
              "Pixal3D works best when the image has one clear subject. Complex scenes usually need cropping or a cleaner reference first.",
          },
          {
            question: "Is the result ready for production?",
            answer:
              "Review topology, scale, and texture details before serious use. Some results may need cleanup depending on the target workflow.",
          },
          {
            question: "Where do I start?",
            answer:
              "Use the generator on the home page, then iterate with cleaner references if the first shape is not clear enough.",
          },
        ],
      },
    ],
  },
  {
    id: "static-ai-3d-model-generator",
    slug: "ai-3d-model-generator",
    title: "AI 3D Model Generator Guide",
    excerpt:
      "Understand what AI 3D generation is good at, how to review outputs, and what to inspect before real project use.",
    coverImage: "/blog-covers/ai-3d-model-generator.webp",
    authorName: BLOG_AUTHOR,
    publishedAt: PUBLISHED_AT,
    sections: [
      {
        type: "paragraphs",
        paragraphs: [
          "An AI 3D model generator can turn a reference image into a usable first result for concept review, asset planning, and quick visual tests.",
          "The key is knowing what the generator can infer well and what still needs human review.",
        ],
      },
      {
        type: "paragraphs",
        heading: "What AI 3D generation can do",
        paragraphs: [
          "AI 3D generation is useful when you need a fast object result before spending time in manual modeling software.",
          "It can help you explore shape language, texture direction, and whether a 2D idea has enough visual information to become a 3D asset.",
          "Look closely at thin parts, symmetrical details, back-side guesses, and texture seams because those areas often reveal whether the result needs more cleanup.",
          "Use AI generation early in the asset process. It is strongest when you need fast direction, not when you need final topology, precise dimensions, or strict manufacturing accuracy.",
        ],
      },
      {
        type: "list",
        heading: "Practical checklist",
        items: [
          "Choose a reference image with a single, visible subject.",
          "Use the generated model to validate silhouette and general volume first.",
          "Rotate the result and check whether hidden sides look believable.",
          "Inspect textures for stretching, repeated patterns, or missing details.",
          "Plan extra cleanup before using the model in a game, product scene, or client preview.",
        ],
      },
      {
        type: "list",
        heading: "Common mistakes",
        items: [
          "Expecting AI generation to replace final mesh cleanup.",
          "Uploading images where the subject is hidden by shadows or strong reflections.",
          "Comparing tools only by speed while ignoring model inspection and export needs.",
        ],
      },
      {
        type: "faq",
        heading: "FAQ",
        items: [
          {
            question: "What is an AI 3D model generator?",
            answer:
              "It is software that creates a 3D model from an input such as an image reference.",
          },
          {
            question: "Can I use Pixal3D for game assets?",
            answer:
              "You can use it for early game asset concepts and prototypes, then clean up or optimize the result as needed.",
          },
          {
            question: "Does every image produce the same quality?",
            answer:
              "No. Simple, clear images with a strong subject tend to produce more useful 3D results.",
          },
        ],
      },
    ],
  },
  {
    id: "static-image-to-glb",
    slug: "image-to-glb",
    title: "Image to GLB Guide",
    excerpt:
      "See why GLB matters for previews, what to inspect after generation, and how to avoid weak browser-ready assets.",
    coverImage: "/blog-covers/image-to-glb.webp",
    authorName: BLOG_AUTHOR,
    publishedAt: PUBLISHED_AT,
    sections: [
      {
        type: "paragraphs",
        paragraphs: [
          "GLB is a practical format for showing 3D assets in browsers, product previews, game prototypes, and AR experiments.",
          "This guide explains what to check before treating an image-generated model as a useful GLB asset.",
        ],
      },
      {
        type: "paragraphs",
        heading: "Why GLB matters",
        paragraphs: [
          "GLB packages model geometry, materials, textures, and scene data into a single binary file.",
          "That makes it convenient for web previews and interactive 3D viewers because the asset is easier to move, test, and share.",
          "Before serious use, check whether the object loads quickly, whether textures look stable when rotated, and whether the model scale makes sense in the target viewer.",
          "If the GLB looks good from the front but breaks from the side, generate again with a clearer source image or prepare for manual cleanup before placing it in a public scene.",
        ],
      },
      {
        type: "list",
        heading: "Practical checklist",
        items: [
          "Open the model in a viewer and rotate it from every angle.",
          "Check texture quality on curved or thin surfaces.",
          "Confirm the file is not too heavy for your target page or prototype.",
          "Look for broken geometry, floating fragments, or missing backsides.",
          "Keep a clean source image so you can regenerate if the first GLB is weak.",
        ],
      },
      {
        type: "list",
        heading: "Common mistakes",
        items: [
          "Only testing the model from the front view.",
          "Ignoring file size before placing the GLB on a web page.",
          "Using generated textures without checking whether they stretch on important surfaces.",
        ],
      },
      {
        type: "faq",
        heading: "FAQ",
        items: [
          {
            question: "What is GLB used for?",
            answer:
              "GLB is a compact 3D asset format commonly used for web, game, AR, and interactive previews.",
          },
          {
            question: "Can Pixal3D directly replace 3D cleanup tools?",
            answer:
              "No. Use Pixal3D for generation and ideation, then inspect and optimize the model before final GLB use.",
          },
          {
            question: "What image works best for a GLB asset?",
            answer:
              "Use an image with strong object boundaries and enough visible shape detail to guide the 3D generation.",
          },
        ],
      },
    ],
  },
  {
    id: "static-image-to-stl",
    slug: "image-to-stl",
    title: "Image to STL Guide",
    excerpt:
      "Learn what to inspect before preparing image-generated models for STL-based printing workflows.",
    coverImage: "/blog-covers/image-to-stl.webp",
    authorName: BLOG_AUTHOR,
    publishedAt: PUBLISHED_AT,
    sections: [
      {
        type: "paragraphs",
        paragraphs: [
          "STL is widely used for 3D printing, but an image-generated model usually needs inspection before printing.",
          "This guide explains the checks that matter when your goal is an STL-ready shape.",
        ],
      },
      {
        type: "paragraphs",
        heading: "What STL needs",
        paragraphs: [
          "STL stores surface geometry, not rich materials or PBR textures.",
          "For 3D printing, the important questions are whether the mesh is closed, whether thin parts can survive printing, and whether the model scale is realistic.",
          "Pixal3D can help create a shape from an image, but a print-focused STL often needs additional cleanup.",
          "Treat the generated model as a starting point, then check it in slicing or mesh repair software before printing.",
        ],
      },
      {
        type: "list",
        heading: "Practical checklist",
        items: [
          "Check whether the generated mesh is closed and not visibly broken.",
          "Look for thin antennas, handles, or details that may fail in printing.",
          "Set a real-world scale before exporting or slicing.",
          "Repair non-manifold areas if your slicer reports geometry issues.",
          "Use the generated model as a starting point when exact dimensions matter.",
        ],
      },
      {
        type: "list",
        heading: "Common mistakes",
        items: [
          "Assuming a visually pleasing preview is automatically printable.",
          "Forgetting that STL does not preserve color textures like GLB.",
          "Sending a model to print before checking wall thickness and scale.",
        ],
      },
      {
        type: "faq",
        heading: "FAQ",
        items: [
          {
            question: "Can an image-generated model become an STL file?",
            answer:
              "Yes, but you should inspect and repair the model before relying on it for printing.",
          },
          {
            question: "Does STL keep texture information?",
            answer:
              "Standard STL focuses on geometry, so it is not the right format for rich color or PBR texture data.",
          },
          {
            question: "What image is best for STL preparation?",
            answer:
              "Use a clean object image with visible volume, clear contours, and limited background clutter.",
          },
        ],
      },
    ],
  },
  {
    id: "static-pixal3d-alternative",
    slug: "pixal3d-alternative",
    title: "Pixal3D Alternative Guide",
    excerpt:
      "Compare image-to-3D tools more fairly by testing the same source image, checking fidelity, and reviewing cleanup needs.",
    coverImage: "/blog-covers/pixal3d-alternative.webp",
    authorName: BLOG_AUTHOR,
    publishedAt: PUBLISHED_AT,
    sections: [
      {
        type: "paragraphs",
        paragraphs: [
          "Comparing image-to-3D tools is easier when you know what to test: input quality, output format, model fidelity, texture quality, speed, and how much cleanup the result needs.",
        ],
      },
      {
        type: "paragraphs",
        heading: "How to compare image-to-3D tools",
        paragraphs: [
          "A useful comparison starts with the same source image across every tool.",
          "Use one clean object image, generate a model, then inspect the result from all sides. Do not compare only the first preview screenshot.",
          "Pixal3D is most interesting when you care about image faithfulness, pixel-aligned shape reconstruction, detailed geometry, PBR-style texture output, and fast iteration from a single reference image.",
          "Keep a small test set: one product photo, one stylized object, one simple character, and one difficult image. The same set makes comparisons fair and repeatable.",
        ],
      },
      {
        type: "list",
        heading: "Practical checklist",
        items: [
          "Use the same source image when comparing two generators.",
          "Check whether the output stays faithful to the original shape and style.",
          "Inspect geometry from the side and back, not only from the front.",
          "Compare texture quality under the same lighting if possible.",
          "Consider export needs such as GLB previews or STL preparation.",
        ],
      },
      {
        type: "list",
        heading: "Common mistakes",
        items: [
          "Choosing a tool based only on landing page examples.",
          "Testing each generator with a different image and calling the result fair.",
          "Ignoring whether the final model needs cleanup for your actual project.",
        ],
      },
      {
        type: "faq",
        heading: "FAQ",
        items: [
          {
            question: "What should I compare first?",
            answer:
              "Start with shape fidelity, texture quality, export format, and how much cleanup the result needs.",
          },
          {
            question: "Is Pixal3D best for every 3D task?",
            answer:
              "No single image-to-3D generator is best for every task. Test with your own images and inspect the result carefully.",
          },
          {
            question: "Why compare with the same image?",
            answer:
              "Using the same input keeps the test fair and helps you see which tool handles your source material better.",
          },
        ],
      },
    ],
  },
];

function resolveLocale(locale: string): SupportedLocale {
  return locale === "zh-CN" ? "zh-CN" : "en";
}

function getModelUsesPost(locale: SupportedLocale): StaticBlogPost {
  const copy = translations[locale].blog.staticPosts.pixal3dModelUses;

  return {
    id: "static-pixal3d-model-uses",
    slug: "pixal3d-model-uses",
    title: copy.title,
    excerpt: copy.excerpt,
    coverImage: "/blog-covers/pixal3d-model-uses.webp",
    authorName: BLOG_AUTHOR,
    publishedAt: "2026-09-12T00:00:00.000Z",
    sections: [
      { type: "paragraphs", paragraphs: [...copy.intro] },
      {
        type: "linked-paragraphs",
        heading: copy.sceneProps.heading,
        paragraphs: [[
          { text: copy.sceneProps.beforeLink },
          { text: copy.sceneProps.linkLabel, href: "https://anyposes.com" },
          { text: copy.sceneProps.afterLink },
        ]],
      },
      {
        type: "image",
        src: "/blog-covers/anyposes-custom-prop.png",
        alt: copy.sceneProps.alt,
        caption: copy.sceneProps.caption,
      },
      { type: "paragraphs", heading: copy.prototyping.heading, paragraphs: [...copy.prototyping.paragraphs] },
      { type: "paragraphs", heading: copy.games.heading, paragraphs: [...copy.games.paragraphs] },
      { type: "paragraphs", heading: copy.commerce.heading, paragraphs: [...copy.commerce.paragraphs] },
      { type: "paragraphs", heading: copy.spatial.heading, paragraphs: [...copy.spatial.paragraphs] },
      { type: "paragraphs", heading: copy.printing.heading, paragraphs: [...copy.printing.paragraphs] },
      { type: "list", heading: copy.checklistHeading, items: [...copy.checklistItems] },
      { type: "faq", heading: copy.faqHeading, items: copy.faq.map((item: StaticBlogFaqItem) => ({ ...item })) },
    ],
  };
}

export function getStaticBlogPosts(locale = "en"): StaticBlogPost[] {
  const localizedPost = getModelUsesPost(resolveLocale(locale));

  return [localizedPost, ...LEGACY_STATIC_BLOG_POSTS].sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  );
}

export function getStaticBlogPostBySlug(slug: string, locale = "en"): StaticBlogPost | undefined {
  return getStaticBlogPosts(locale).find((post) => post.slug === slug);
}

export function staticBlogPostToMarkdown(post: StaticBlogPost): string {
  return post.sections.map((section) => {
    if (section.type === "paragraphs") {
      const heading = section.heading ? `## ${section.heading}\n\n` : "";
      return `${heading}${section.paragraphs.join("\n\n")}`;
    }

    if (section.type === "linked-paragraphs") {
      const heading = section.heading ? `## ${section.heading}\n\n` : "";
      const paragraphs = section.paragraphs.map((segments) =>
        segments.map((segment) => segment.href ? `[${segment.text}](${segment.href})` : segment.text).join("")
      );
      return `${heading}${paragraphs.join("\n\n")}`;
    }

    if (section.type === "image") {
      const caption = section.caption ? `\n\n*${section.caption}*` : "";
      return `![${section.alt}](${section.src})${caption}`;
    }

    if (section.type === "list") {
      return `## ${section.heading}\n\n${section.items.map((item) => `- ${item}`).join("\n")}`;
    }

    return `## ${section.heading}\n\n${section.items
      .map((item) => `### ${item.question}\n\n${item.answer}`)
      .join("\n\n")}`;
  }).join("\n\n");
}

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | Date | null;
  authorName: string | null;
};

export function normalizeBlogPageNumber(value: unknown, fallback = 1): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? Math.max(1, Math.floor(numericValue)) : fallback;
}

export function mergeAndPaginateBlogPosts(
  databasePosts: BlogPostSummary[],
  options: { locale?: string; page?: number; pageSize?: number } = {},
) {
  const page = normalizeBlogPageNumber(options.page, 1);
  const pageSize = normalizeBlogPageNumber(options.pageSize, 12);
  const bySlug = new Map<string, BlogPostSummary>();

  for (const post of getStaticBlogPosts(options.locale)) {
    bySlug.set(post.slug, {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage ?? null,
      publishedAt: post.publishedAt,
      authorName: post.authorName,
    });
  }

  for (const post of databasePosts) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
  }

  const allPosts = [...bySlug.values()].sort((left, right) => {
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    return rightTime - leftTime;
  });
  const total = allPosts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  return {
    posts: allPosts.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}
