import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const currentUser = await requireAuth(request);
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('avatar') || formData.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ message: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadToCloudinary({
      buffer,
      originalName: file.name || 'avatar.png',
      folder: 'project/avatars',
      resourceType: 'image',
    });

    const user = await User.findById(currentUser._id);
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });
    user.avatar = result.url;
    await user.save();

    return Response.json({ message: 'Avatar uploaded successfully', url: result.url, user: { avatar: result.url } }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error uploading avatar');
  }
}