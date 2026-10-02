import 'dotenv/config';

export async function generateImage(
  prompt: string,
  opts?: { aspectRatio?: string }
): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = 'gpt-image-2.5-sunburst';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in the environment variables.');
  }

  const url = `https://api.openai.com/v1/images/generations`;

  let size = '1024x1024';
  if (opts?.aspectRatio) {
    if (opts.aspectRatio === '16:9') size = '1792x1024';
    else if (opts.aspectRatio === '9:16' || opts.aspectRatio === '4:5') size = '1024x1792';
  }

  const body = {
    model: model,
    prompt: prompt,
    n: 1,
    size: size
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseBody = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      throw new Error(`Failed to parse API response. Status: ${response.status}. Body: ${responseBody}`);
    }

    if (!response.ok) {
      const errObj = data?.error;
      const msg = errObj?.message || 'Unknown API error';
      if (response.status === 400) throw new Error(`400 Bad Request: ${msg}`);
      if (response.status === 401) throw new Error(`401 Unauthorized (Check API key): ${msg}`);
      if (response.status === 403) throw new Error(`403 Forbidden (Permission denied): ${msg}`);
      if (response.status === 429) throw new Error(`429 Too Many Requests (Rate limit/quota): ${msg}`);
      throw new Error(`API Error ${response.status}: ${msg}`);
    }

    let buffer: Buffer;
    
    if (data.data?.[0]?.b64_json) {
      buffer = Buffer.from(data.data[0].b64_json, 'base64');
    } else if (data.data?.[0]?.url) {
      const imgRes = await fetch(data.data[0].url);
      if (!imgRes.ok) throw new Error("Failed to download image from generated URL");
      const arrayBuffer = await imgRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error(`No image returned. Response: ${JSON.stringify(data)}`);
    }

    const mimeType = 'image/png'; // DALL-E 3 returns PNG

    return { buffer, mimeType, model };

  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('Request to OpenAI API timed out after 90 seconds.');
    }
    throw new Error(`Network or fetch error: ${e.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
