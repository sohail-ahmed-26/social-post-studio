import { designPost } from "./index";
const postId = process.argv[2];
if (!postId) throw new Error("Usage: npm run designer:test -- <post_id>");
console.log(await designPost(postId));
