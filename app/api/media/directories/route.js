import connectDB from '@/lib/db';
import MediaDirectory from '@/lib/models/MediaDirectory';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const directory = await MediaDirectory.create({
      name: data.name,
      slug,
      created_by: user._id,
    });

    return Response.json({ message: 'Directory created successfully', directory }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating directory');
  }
}