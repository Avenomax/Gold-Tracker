function jsonError(message, status) {
  return Response.json({ error: message }, {
    status, headers: { "Cache-Control": "no-store" }
  });
}
export async function onRequest({ request, env }) {
  if (!env.DB) return jsonError("Binding database DB belum dikonfigurasi.", 500);
  try {
    if (request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id, date, grams, cost FROM transactions ORDER BY date ASC, id ASC"
      ).all();
      return Response.json({ transactions: result.results || [] }, {
        headers: { "Cache-Control": "no-store" }
      });
    }
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return jsonError("JSON tidak valid.", 400); }
      const date = typeof body.date === "string" ? body.date : "";
      const grams = Number(body.grams);
      const cost = Number(body.cost);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(grams) || grams <= 0 ||
          !Number.isFinite(cost) || cost <= 0) {
        return jsonError("Tanggal, berat, atau biaya tidak valid.", 400);
      }
      const result = await env.DB.prepare(
        "INSERT INTO transactions (date, grams, cost) VALUES (?, ?, ?)"
      ).bind(date, grams, cost).run();
      return Response.json({ success: true, id: result.meta?.last_row_id }, { status: 201 });
    }
    if (request.method === "DELETE") {
      const id = Number(new URL(request.url).searchParams.get("id"));
      if (!Number.isInteger(id) || id <= 0) return jsonError("ID transaksi tidak valid.", 400);
      const result = await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
      if (!(result.meta?.changes > 0)) return jsonError("Transaksi tidak ditemukan.", 404);
      return Response.json({ success: true });
    }
    return jsonError("Metode tidak didukung.", 405);
  } catch (error) {
    return jsonError("Kesalahan database: " + (error?.message || "tidak diketahui"), 500);
  }
}
