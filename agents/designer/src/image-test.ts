import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateImage } from './gemini-image';

function getImageSize(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  if (mimeType === 'image/png' || buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    if (buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
      };
    }
  } else if (mimeType === 'image/jpeg' || (buffer[0] === 0xff && buffer[1] === 0xd8)) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) break;
      
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      
      if (marker === 0xc0 || marker === 0xc2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }
      
      offset += 2 + length;
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const prompt = args[0];
  const aspectRatio = args[1] || "4:5";

  if (!prompt) {
    console.error("Usage: npm run image:test -- \"<prompt>\" [aspectRatio]");
    process.exit(1);
  }

  console.log(`Generating image for prompt: "${prompt}" (AspectRatio: ${aspectRatio})`);
  
  const startTime = Date.now();

  try {
    const result = await generateImage(prompt, { aspectRatio });
    const timeTaken = Date.now() - startTime;
    
    const ext = result.mimeType.split('/')[1] || 'png';
    const outputDir = path.join(process.cwd(), 'output');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const fileName = `test-${Date.now()}.${ext}`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, result.buffer);
    
    const fileSizeKB = (result.buffer.length / 1024).toFixed(2);
    const size = getImageSize(result.buffer, result.mimeType);
    
    console.log(`\n--- Generation Successful ---`);
    console.log(`Model:      ${result.model}`);
    console.log(`MimeType:   ${result.mimeType}`);
    console.log(`File Size:  ${fileSizeKB} KB`);
    console.log(`Dimensions: ${size ? `${size.width}x${size.height}` : 'Unknown'}`);
    console.log(`Time taken: ${(timeTaken / 1000).toFixed(2)}s`);
    console.log(`Saved to:   ${filePath}`);
    
  } catch (error: any) {
    console.error(`\nFailed to generate image:`);
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
