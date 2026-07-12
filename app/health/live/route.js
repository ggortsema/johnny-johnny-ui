export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      service: "johnny-johnny-ui",
      version: "0.2.0",
      status: "ok",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
