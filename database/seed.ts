import dummyBooks from "../dummybooks.json";
// import { sampleBooks } from "@/constants";
import ImageKit from "imagekit";
import { books } from "@/database/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const uploadToImageKit = async (
  url: string,
  fileName: string,
  folder: string,
): Promise<string> => {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }

  try {
    const response = await imagekit.upload({
      file: url,
      fileName,
      folder,
    });

    if (!response?.filePath) {
      throw new Error('Upload successful but no filePath returned');
    }

    return response.filePath;
  } catch (error) {
    console.error(`Error uploading ${fileName} to ImageKit:`, error);
    throw error;
  }
};

const seed = async () => {
  console.log("Starting data seed process...");
  
  for (const book of dummyBooks) {
    try {
      console.log(`Processing book: ${book.title}`);

      // Check if URLs are valid before attempting upload
      if (!isValidUrl(book.coverUrl)) {
        console.error(`Invalid cover URL for book "${book.title}": ${book.coverUrl}`);
        continue;
      }
      if (!isValidUrl(book.videoUrl)) {
        console.error(`Invalid video URL for book "${book.title}": ${book.videoUrl}`);
        continue;
      }

      // Upload files
      // const [coverUrl, videoUrl] = await Promise.all([
      //   uploadToImageKit(
      //     book.coverUrl,
      //     `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
      //     "/books/covers"
      //   ),
      //   uploadToImageKit(
      //     book.videoUrl,
      //     `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
      //     "/books/videos"
      //   )
      // ]);

      // Insert into database
      await db.insert(books).values({
        ...book,
        // book.coverUrl,
        // videoUrl,
      });

      console.log(`Successfully processed book: ${book.title}`);
    } catch (error) {
      console.error(`Failed to process book "${book.title}":`, error);
      // Continue with next book instead of stopping the entire process
      continue;
    }
  }
  
  console.log("Seed process completed!");
};

seed().catch((error) => {
  console.error("Fatal error during seed process:", error);
  process.exit(1);
});