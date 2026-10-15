```javascript
function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return base64url(signature);
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GOLD_TRACKER_PASSWORD || !env.SESSION_SECRET) {
      return Response.json(
        { error: "Konfigurasi login belum lengkap." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const password = body.password;

    if (
      typeof password !== "string" ||
      password !== env.GOLD_TRACKER_PASSWORD
    ) {
      return Response.json(
        { error: "Password salah." },
        { status: 401 }
      );
    }

    const expires = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const payload = base64url(
      new TextEncoder().encode(JSON.stringify({ exp: expires }))
    );

    const signature = await sign(payload, env.SESSION_SECRET);
    const token = `${payload}.${signature}`;

    return Response.json(
      { success: true, message: "Login berhasil." },
      {
        headers: {
          "Set-Cookie": `gt_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      { error: "Permintaan login tidak valid." },
      { status: 400 }
    );
  }
}
```
