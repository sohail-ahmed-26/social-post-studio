import 'dotenv/config';

async function run() {
  const token = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;

  if (!token || !userId) {
    console.error("Error: THREADS_ACCESS_TOKEN and THREADS_USER_ID must be set in environment variables.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const text = args[0];
  const imageUrl = args[1];

  if (!text) {
    console.error("Usage: npm run threads:test -- \"text\" [imageUrl]");
    process.exit(1);
  }

  if (text.length > 500) {
    console.error(`Error: Text is too long (${text.length} characters). Threads limits posts to 500 characters.`);
    process.exit(1);
  }

  const getAbortSignal = () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30000);
    return controller.signal;
  };

  const sanitizeError = (data: any) => {
    let msg = data?.error?.message || data?.error_message || "Unknown error";
    msg = msg.replace(new RegExp(token, 'g'), "[REDACTED_TOKEN]");
    const code = data?.error?.code || data?.error_code;
    
    let hint = "";
    if (code === 190) hint = " (Hint: Token invalid or expired)";
    else if (code === 10 || code === 200) hint = " (Hint: Permission missing or the Threads Tester invite was not accepted)";

    return `Meta Error: ${msg}\nCode: ${code}${hint}`;
  };

  let containerId: string | null = null;

  try {
    // 1) Get username
    const meUrl = new URL(`https://graph.threads.net/v1.0/${userId}`);
    meUrl.searchParams.append("fields", "id,username");
    meUrl.searchParams.append("access_token", token);

    const meRes = await fetch(meUrl.toString(), { signal: getAbortSignal() });
    const meData = await meRes.json();

    if (!meRes.ok || meData.error) {
      console.error("Failed to fetch user profile:");
      console.error(sanitizeError(meData));
      process.exit(1);
    }

    console.log(`Posting as @${meData.username}`);

    // 2) Create container
    const createUrl = `https://graph.threads.net/v1.0/${userId}/threads`;
    const createData = new FormData();
    createData.append("access_token", token);
    createData.append("text", text);
    
    if (imageUrl) {
      createData.append("media_type", "IMAGE");
      createData.append("image_url", imageUrl);
    } else {
      createData.append("media_type", "TEXT");
    }

    const createRes = await fetch(createUrl, {
      method: "POST",
      body: createData,
      signal: getAbortSignal()
    });
    
    const createJson = await createRes.json();
    if (!createRes.ok || createJson.error) {
      console.error("Failed to create container:");
      console.error(sanitizeError(createJson));
      process.exit(1);
    }

    containerId = createJson.id;
    if (!containerId) {
      console.error("Error: Container ID was not returned.");
      process.exit(1);
    }

    // 3) Polling status
    if (imageUrl) {
      let isFinished = false;
      let attempts = 0;
      while (attempts < 20) {
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        
        const statusUrl = new URL(`https://graph.threads.net/v1.0/${containerId}`);
        statusUrl.searchParams.append("fields", "status");
        statusUrl.searchParams.append("access_token", token);

        const statusRes = await fetch(statusUrl.toString(), { signal: getAbortSignal() });
        const statusJson = await statusRes.json();

        if (!statusRes.ok || statusJson.error) {
          throw new Error(`Failed to check container status:\n${sanitizeError(statusJson)}`);
        }

        const status = statusJson.status;
        if (status === "FINISHED") {
          isFinished = true;
          break;
        } else if (status === "ERROR" || status === "EXPIRED") {
          throw new Error(`Container processing failed with status: ${status}`);
        }
        // status could be IN_PROGRESS or PUBLISHED
      }

      if (!isFinished) {
        throw new Error("Container processing timed out after 60 seconds.");
      }
    } else {
      await new Promise(r => setTimeout(r, 3000));
    }

    // 4) Publish
    const pubUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
    const pubData = new FormData();
    pubData.append("creation_id", containerId);
    pubData.append("access_token", token);

    const pubRes = await fetch(pubUrl, {
      method: "POST",
      body: pubData,
      signal: getAbortSignal()
    });
    
    const pubJson = await pubRes.json();
    if (!pubRes.ok || pubJson.error) {
      throw new Error(`Failed to publish container:\n${sanitizeError(pubJson)}`);
    }

    const postId = pubJson.id;

    // 5) Fetch permalink
    const postUrl = new URL(`https://graph.threads.net/v1.0/${postId}`);
    postUrl.searchParams.append("fields", "permalink");
    postUrl.searchParams.append("access_token", token);

    const postRes = await fetch(postUrl.toString(), { signal: getAbortSignal() });
    const postJson = await postRes.json();

    if (!postRes.ok || postJson.error) {
      console.log(`\nSuccess! Post ID: ${postId}`);
      console.log(`Failed to fetch permalink:\n${sanitizeError(postJson)}`);
    } else {
      console.log(`\nSuccess! Post ID: ${postId}`);
      console.log(`Permalink: ${postJson.permalink}`);
    }

  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Error: Request timed out after 30 seconds.");
    } else {
      let msg = error.message.replace(new RegExp(token, 'g'), "[REDACTED_TOKEN]");
      console.error(msg);
    }

    if (containerId) {
      console.error(`\nContainer ID: ${containerId}`);
      console.error("The post did NOT go out. Do not blindly retry as the container might still be processing or failed.");
    }

    process.exit(1);
  }
}

run();
