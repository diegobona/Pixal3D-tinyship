export async function GET() {
  return Response.json({ error: 'Unsupported feature' }, { status: 404 });
}
