import 'dotenv/config';

const DEFAULT_PAGE_ID = "785997304602172";

export async function publishToFacebook(message: string, imageBuffer?: Buffer, imageMime?: string): Promise<{ id: string; url: string }> {
  const token = process.env.FB_PAGE_TOKEN;
  const version = process.env.META_GRAPH_VERSION || "v20.0";
  const pageId = process.env.FB_PAGE_ID || DEFAULT_PAGE_ID;

  if (!token) {
    throw new Error("FB_PAGE_TOKEN is required in environment variables.");
  }

  const timeout = 30000;
  
  function getAbortSignal() {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  const sanitizeError = (data: any) => {
    let msg = data?.error?.message || "Unknown error";
    msg = msg.replace(new RegExp(token, 'g'), "[REDACTED_TOKEN]");
    
    const code = data?.error?.code;
    const subcode = data?.error?.error_subcode;
    
    return `Meta Error: ${msg} (Code: ${code}, Subcode: ${subcode})`;
  };

  try {
    // Post
    let postUrlStr = "";
    const formData = new FormData();
    formData.append("access_token", token);

    if (imageBuffer) {
      postUrlStr = `https://graph.facebook.com/${version}/${pageId}/photos`;
      
      const blob = new Blob([imageBuffer], { type: imageMime || "image/png" });
      
      formData.append("source", blob, "image.png");
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
      throw new Error(sanitizeError(postData));
    }

    let url = "";
    const idToUse = postData.post_id || postData.id;
    if (idToUse.includes("_")) {
      const parts = idToUse.split("_");
      url = `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`;
    } else {
      url = `https://www.facebook.com/${idToUse}`;
    }

    return { id: idToUse, url };

  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Request to Facebook API timed out after 30 seconds.");
    }
    throw error;
  }
}
