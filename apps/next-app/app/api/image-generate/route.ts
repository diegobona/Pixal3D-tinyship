export async function POST() {
  return Response.json({ error: 'Unsupported feature' }, { status: 404 });
}
