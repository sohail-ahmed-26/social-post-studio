import { generateContent, generateIdeas } from './content';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'post') {
    const postId = args[1];
    if (!postId) {
      console.error("Usage: npm run content -- post <postId>");
      process.exit(1);
    }
    console.log(`Generating content for post: ${postId}`);
    try {
      const result = await generateContent(postId);
      console.log("\nGenerated Content:");
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error("Error generating content:", err.message);
      process.exit(1);
    }
  } else if (command === 'ideas') {
    const brandId = args[1];
    if (!brandId) {
      console.error("Usage: npm run content -- ideas <brandId> [count]");
      process.exit(1);
    }
    const count = args[2] ? parseInt(args[2], 10) : 5;
    console.log(`Generating ${count} ideas for brand: ${brandId}`);
    try {
      const result = await generateIdeas(brandId, count);
      console.log("\nGenerated Ideas:");
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error("Error generating ideas:", err.message);
      process.exit(1);
    }
  } else {
    console.error("Unknown command. Usage:");
    console.error("  npm run content -- post <postId>");
    console.error("  npm run content -- ideas <brandId> [count]");
    process.exit(1);
  }
}

main();
