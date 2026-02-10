import { prisma } from "@/lib/prisma";
import { jobBroadcaster } from "@/lib/event-emitter";
import { runResearch } from "./research";
import { generateArticleImages } from "./images";
import { writeArticle } from "./writer";
import { generateMeta, generateThumbnail } from "./meta";

export async function runContentPipeline(jobId: number): Promise<void> {
  console.log(`[Pipeline] Starting pipeline for job ${jobId}`);

  // Load ContentJob with Brand and SitemapPages
  const job = await prisma.contentJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      brand: {
        include: { sitemapPages: true },
      },
    },
  });

  const { brand } = job;
  const sitemapPages = brand.sitemapPages;
  const keywords = job.keywords ? job.keywords.split(",").map((k) => k.trim()) : [];
  const imageDefaults = brand.imageDefaults ? JSON.parse(brand.imageDefaults) : {};

  try {
    // --- Step 1: Research ---
    await prisma.contentJob.update({ where: { id: jobId }, data: { status: "researching" } });
    jobBroadcaster.emit(jobId, "researching", "Starting research...");

    const researchBrief = await runResearch(job.topic, {
      keywords,
      brandId: brand.id,
    });

    const researchBriefJson = JSON.stringify(researchBrief);
    await prisma.contentJob.update({
      where: { id: jobId },
      data: { researchBrief: researchBriefJson },
    });
    jobBroadcaster.emit(jobId, "researching", "Research complete");

    // --- Step 2: Image Generation ---
    await prisma.contentJob.update({ where: { id: jobId }, data: { status: "generating_images" } });
    jobBroadcaster.emit(jobId, "generating_images", "Generating article images...");

    const images = await generateArticleImages(researchBriefJson, imageDefaults);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: { images: JSON.stringify(images) },
    });
    jobBroadcaster.emit(jobId, "generating_images", "Images generated");

    // --- Step 3: Article Writing ---
    await prisma.contentJob.update({ where: { id: jobId }, data: { status: "writing" } });
    jobBroadcaster.emit(jobId, "writing", "Writing article...");

    const articleContent = await writeArticle(researchBrief, images, brand, sitemapPages);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: { articleContent },
    });
    jobBroadcaster.emit(jobId, "writing", "Article written");

    // --- Step 4: Meta Generation ---
    await prisma.contentJob.update({ where: { id: jobId }, data: { status: "generating_meta" } });
    jobBroadcaster.emit(jobId, "generating_meta", "Generating meta tags...");

    const meta = await generateMeta(articleContent);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: {
        metaTitle: meta.metaTitle,
        metaDescription: meta.metaDescription,
        urlSlug: meta.urlSlug,
      },
    });
    jobBroadcaster.emit(jobId, "generating_meta", "Meta tags generated");

    // --- Step 5: Thumbnail ---
    await prisma.contentJob.update({ where: { id: jobId }, data: { status: "generating_thumbnail" } });
    jobBroadcaster.emit(jobId, "generating_thumbnail", "Generating thumbnail...");

    const thumbnailUrl = await generateThumbnail(articleContent, brand);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: { thumbnailUrl },
    });
    jobBroadcaster.emit(jobId, "generating_thumbnail", "Thumbnail generated");

    // --- Done ---
    await prisma.contentJob.update({ where: { id: jobId }, data: { status: "completed" } });
    jobBroadcaster.emit(jobId, "completed", "Pipeline complete");
    console.log(`[Pipeline] Job ${jobId} completed successfully`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Pipeline] Job ${jobId} failed:`, message);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: message },
    });
    jobBroadcaster.emit(jobId, "failed", message);
  }
}
