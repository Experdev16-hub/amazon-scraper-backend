import fs from 'fs/promises';

export async function safeParseJSON(filePath, fallback = []) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Handle empty file
    if (!fileContent.trim()) {
      console.warn(`Warning: JSON file at "${filePath}" is empty. Using fallback.`);
      return fallback;
    }

    // Try parsing
    return JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error parsing JSON at "${filePath}":`, err.message);
    return fallback;
  }
}
