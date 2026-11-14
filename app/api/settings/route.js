import connectDB from '@/lib/db';
import Setting from '@/lib/models/Setting';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const docs = await Setting.find({});
    const settings = {};
    for (const d of docs) {
      settings[d.key] = d.value;
    }
    return Response.json({ settings }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching settings');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const body = await request.json();
    const entries = body.settings && typeof body.settings === 'object' ? body.settings : body;
    if (!entries || typeof entries !== 'object') {
      return Response.json({ message: 'Invalid settings payload' }, { status: 400 });
    }
    for (const [key, value] of Object.entries(entries)) {
      await Setting.findOneAndUpdate(
        { key, user_id: null },
        { key, value, user_id: null },
        { upsert: true, new: true }
      );
    }
    return Response.json({ message: 'Settings updated successfully', settings: entries }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating settings');
  }
}