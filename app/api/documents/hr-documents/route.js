import connectDB from '@/lib/db';
import HrDocument from '@/lib/models/HrDocument';
import DocumentCategory from '@/lib/models/DocumentCategory';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { isCloudinaryUrl } from '@/lib/cloudinary';
import { isLocalUploadPath } from '@/lib/storage';

const SORT_MAP = {
  title: 'title',
  status: 'status',
  effective_date: 'effective_date',
  expiry_date: 'expiry_date',
  download_count: 'download_count',
  created_at: 'createdAt',
  createdAt: 'createdAt',
  document: 'title',
  expires: 'expiry_date',
};

const STATUSES = ['Draft', 'Under Review', 'Approved', 'Published', 'Archived', 'Expired'];

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 9, 1);
    const skip = (page - 1) * limit;

    const search = (sp.get('search') || '').trim();
    const baseFilter = {};
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      baseFilter.$or = [{ title: rx }, { description: rx }, { file_name: rx }];
    }

    const categoryId = sp.get('category_id');
    if (categoryId && categoryId !== 'all' && categoryId !== '' && categoryId !== '_empty_') {
      baseFilter.category_id = categoryId;
    }

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '' && status !== '_empty_') {
      filter.status = status;
    }

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    // Auto-update expired documents
    await HrDocument.updateMany(
      { status: { $ne: 'Expired' }, expiry_date: { $lt: new Date() } },
      { $set: { status: 'Expired' } }
    );

    const [items, total] = await Promise.all([
      HrDocument.find(filter)
        .populate('category_id', 'name color icon')
        .populate('uploaded_by', 'name email')
        .populate('approved_by', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      HrDocument.countDocuments(filter),
    ]);

    // status counts based on baseFilter
    const statusCounts = { all: await HrDocument.countDocuments(baseFilter) };
    for (const s of STATUSES) {
      statusCounts[s] = await HrDocument.countDocuments({ ...baseFilter, status: s });
    }

    const categories = await DocumentCategory.find({ status: 'active' }).select('_id name').sort({ sort_order: 1, name: 1 });

    // stats based on all
    const totalDocs = await HrDocument.countDocuments({});
    const publishedDocs = await HrDocument.countDocuments({ status: 'Published' });
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoonDocs = await HrDocument.countDocuments({ expiry_date: { $gt: new Date(), $lte: thirtyDays } });
    const needsAckDocs = await HrDocument.countDocuments({ requires_acknowledgment: true });

    return Response.json(
      {
        hrDocuments: items,
        statusCounts,
        categories,
        stats: {
          total: totalDocs,
          published: publishedDocs,
          expiring_soon: expiringSoonDocs,
          needs_acknowledgment: needsAckDocs,
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching HR documents');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'title', required: true, trim: true, messages: { required: 'Title is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'category_id', required: true, messages: { required: 'Category is required' } },
      { field: 'file', required: true, trim: true, messages: { required: 'File is required' } },
      { field: 'effective_date', optional: true, isISO8601: true },
      { field: 'expiry_date', optional: true, isISO8601: true },
      { field: 'requires_acknowledgment', optional: true },
      { field: 'status', optional: true, isIn: STATUSES },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const user = await requireAuth(request);

    const category = await DocumentCategory.findById(data.category_id).select('_id');
    if (!category) return Response.json({ message: 'Invalid category selected' }, { status: 400 });

    const fileUrl = data.file;
    if (!isCloudinaryUrl(fileUrl) && !isLocalUploadPath(fileUrl)) {
      return Response.json({ message: 'Invalid file URL. Provide a valid Cloudinary file URL.', errors: ['Invalid file URL'] }, { status: 400 });
    }
    const fileName = fileUrl.split('/').pop() || `document_${Date.now()}`;
    // decodeURIComponent maybe
    let decoded = fileName;
    try { decoded = decodeURIComponent(fileName); } catch {}

    const doc = await HrDocument.create({
      title: data.title,
      description: data.description || null,
      category_id: data.category_id,
      file_name: decoded,
      file_path: fileUrl,
      file_type: 'application/octet-stream',
      file_size: 0,
      effective_date: data.effective_date || null,
      expiry_date: data.expiry_date || null,
      requires_acknowledgment: data.requires_acknowledgment === true || data.requires_acknowledgment === 'true',
      status: data.status || 'Draft',
      uploaded_by: user._id,
      created_by: user._id,
    });

    const populated = await HrDocument.findById(doc._id)
      .populate('category_id', 'name color icon')
      .populate('uploaded_by', 'name email');

    return Response.json({ message: 'Document uploaded successfully', hrDocument: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating HR document');
  }
}