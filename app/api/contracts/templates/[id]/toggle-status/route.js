import connectDB from '@/lib/db';
import ContractTemplate from '@/lib/models/ContractTemplate';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractTemplate.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    item.status = item.status === 'active' ? 'inactive' : 'active';
    await item.save();
    return Response.json({ message: 'Status updated successfully', contractTemplate: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating status');
  }
}