import 'dotenv/config';

const DEFAULT_PAGE_ID = "785997304602172";

async function run() {
  const token = process.env.FB_PAGE_TOKEN;
  const version = process.env.META_GRAPH_VERSION;
  const pageId = process.env.FB_PAGE_ID || DEFAULT_PAGE_ID;

  if (!token) {
    console.error("Error: FB_PAGE_TOKEN is required in environment variables.");
    process.exit(1);
  }
  if (!version) {
    console.error("Error: META_GRAPH_VERSION is required in environment variables (e.g. v20.0).");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const message = args[0];
  const imageUrl = args[1];

  if (!message) {
    console.error("Usage: npm run fb:test -- \"message\" [imageUrl]");
    process.exit(1);
  }

  const timeout = 30000;
  
  function getAbortSignal() {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  const sanitizeError = (data: any) => {
    let msg = data?.error?.message || "Unknown error";
    // Sanitize any token leak in the message
    msg = msg.replace(new RegExp(token, 'g'), "[REDACTED_TOKEN]");
    
    const code = data?.error?.code;
    const subcode = data?.error?.error_subcode;
    
    let hint = "";
    if (code === 190) hint = " (Hint: Token expired or invalid, generate a new one in Graph API Explorer)";
    else if (code === 200 || code === 10) hint = " (Hint: Permission missing)";
    else if (code === 100) hint = " (Hint: Bad parameter)";

    return `Meta Error: ${msg}\nCode: ${code}, Subcode: ${subcode}${hint}`;
  };

  try {
    // 1) Safety check
    const checkUrl = new URL(`https://graph.facebook.com/${version}/${pageId}`);
    checkUrl.searchParams.append("fields", "id,name");
    checkUrl.searchParams.append("access_token", token);

    const checkRes = await fetch(checkUrl.toString(), { signal: getAbortSignal() });
    const checkData = await checkRes.json();

    if (!checkRes.ok) {
      console.error(sanitizeError(checkData));
      process.exit(1);
    }

    if (checkData.id !== pageId) {
      console.error(`Error: Returned Page ID (${checkData.id}) does not match configured Page ID (${pageId}).`);
      process.exit(1);
    }

    console.log(`Posting to Page: ${checkData.name} (${checkData.id})`);

    // 2) Post
    let postUrlStr = "";
    const formData = new FormData();
    formData.append("access_token", token);

    if (imageUrl) {
      postUrlStr = `https://graph.facebook.com/${version}/${pageId}/photos`;
      formData.append("url", imageUrl);
      formData.append("caption", message);
    } else {
      postUrlStr = `https://graph.facebook.com/${version}/${pageId}/feed`;
      formData.append("message", message);
    }

    const postRes = await fetch(postUrlStr, {
      method: "POST",
      body: formData,
      signal: getAbortSignal(),
    });

    const postData = await postRes.json();

    if (!postRes.ok) {
      console.error(sanitizeError(postData));
      process.exit(1);
    }

    // 3) Success
    console.log(`\nSuccess! Post ID: ${postData.id}`);
    
    if (postData.id.includes("_")) {
      const parts = postData.id.split("_");
      console.log(`Link: https://www.facebook.com/${parts[0]}/posts/${parts[1]}`);
    } else if (imageUrl && postData.post_id) {
      const parts = postData.post_id.split("_");
      console.log(`Link: https://www.facebook.com/${parts[0]}/posts/${parts[1]}`);
    } else {
      console.log(`Link: https://www.facebook.com/${postData.id}`);
    }

  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Error: Request timed out after 30 seconds.");
    } else {
      let msg = error.message.replace(new RegExp(token, 'g'), "[REDACTED_TOKEN]");
      console.error(`Error: ${msg}`);
    }
    process.exit(1);
  }
}

run();
