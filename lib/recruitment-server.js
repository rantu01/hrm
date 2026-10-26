// Server-only helpers for the Recruitment API routes.
// Keep mongoose / auth imports out of lib/recruitment.js so client components
// can share the constants.
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

/**
 * Enforce a recruitment permission. Mirrors the staff module bootstrap:
 * while no roles exist yet (fresh install), any authenticated user may act so
 * the first administrator can configure the system.
 */
export async function authorizeRecruitment(request, permission) {
  try {
    return await requirePermission(request, permission);
  } catch (err) {
    if (err && err.statusCode === 403) {
      await connectDB();
      const count = await Role.countDocuments();
      if (count === 0) return requireAuth(request);
    }
    throw err;
  }
}

/** Drop empty values so optional fields fall back to schema defaults. */
export function sanitize(data) {
  const out = { ...(data || {}) };
  for (const key of Object.keys(out)) {
    if (out[key] === '' || out[key] === undefined || out[key] === null) delete out[key];
  }
  return out;
}

/** Normalize a comma separated string / array of strings into a clean array. */
export function normalizeStringArray(value, max = 50) {
  let list = [];
  if (Array.isArray(value)) list = value;
  else if (typeof value === 'string') list = value.split(',');
  else if (value !== undefined && value !== null) list = [value];

  const cleaned = list
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length > 0)
    .slice(0, max);
  return [...new Set(cleaned)];
}

/** Convert an optional date string into a Date (or null). */
export function toDateOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Return an ObjectId cast of `value`, or null when it is not a valid id. */
export function toObjectIdOrNull(value) {
  if (!value || typeof value !== 'string') return null;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

export function isValidId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

/** Escape user input before embedding it in a RegExp. */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Standard JSON error responses used across the module. */
export function badRequest(message) {
  return Response.json({ message }, { status: 400 });
}
export function notFound(message = 'Record not found') {
  return Response.json({ message }, { status: 404 });
}

/** Extract and normalize pagination parameters from the query string. */
export function getPagination(sp, defaultLimit = 10) {
  const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || defaultLimit, 1),
    200
  );
  return { page, limit, skip: (page - 1) * limit };
}

/** Standard pagination envelope used by every recruitment list endpoint. */
export function paginationPayload(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit) || 1 };
}

/**
 * Build a `{ statusCounts: { all, ...values } }` map from an aggregation
 * result shaped like `[{ _id: 'open', count: 3 }, ...]`.
 */
export function buildStatusCounts(counts, values) {
  const result = { all: 0 };
  for (const v of values) result[v] = 0;
  for (const c of counts || []) {
    if (c?._id && c._id in result) result[c._id] = c.count;
    result.all += c?.count || 0;
  }
  return result;
}

/** Build a case-insensitive `$or` regex filter across the given fields. */
export function searchFilter(sp, fields) {
  const search = (sp.get('search') || '').trim();
  if (!search) return null;
  const rx = { $regex: escapeRegex(search), $options: 'i' };
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

/** Resolve `sort_field` / `sort_direction` query params against a sort map. */
export function getSort(sp, sortMap, fallback = 'createdAt') {
  const field = sortMap[sp.get('sort_field')] || fallback;
  const direction = sp.get('sort_direction') === 'asc' ? 1 : -1;
  return { [field]: direction };
}

/**
 * Generic CRUD handlers for the module's master-data (lookup) resources.
 * Each route file wires these to GET/POST/PUT/DELETE/PATCH exports so every
 * lookup keeps identical search / filter / sort / pagination behaviour.
 *
 * Config:
 *  - Model        mongoose model (required)
 *  - permission   permission slug, e.g. 'job-categories' (required)
 *  - entityKey    list response key, e.g. 'jobCategories' (required)
 *  - itemKey      single-item response key, e.g. 'jobCategory'
 *  - searchFields fields matched by ?search=
 *  - sortMap      allowed ?sort_field= values -> mongo fields
 *  - populate     mongoose populate args (string | object | array)
 *  - statusValues enum values for ?status= + status counts (null to disable)
 *  - validate     validateBody rules shared by create/update
 *  - extraFilter  async (sp) => extra mongo filter for the list query
 *  - dependencies async (data) => error message when related docs are invalid
 *  - blockers     [{ Model, field, message }] checks before delete
 *  - afterDelete  async (doc) => {} cascades after a successful delete
 *  - transform    (data, user, existing) => data merged before save
 */
export function makeLookupHandlers(config) {
  const {
    Model,
    permission,
    entityKey,
    itemKey = 'item',
    searchFields = ['name'],
    sortMap = {},
    populate = [],
    statusValues = ['active', 'inactive'],
    validate = [],
    extraFilter,
    dependencies,
    blockers = [],
    afterDelete,
    transform,
    defaultLimit = 10,
  } = config;

  const hasStatus = Array.isArray(statusValues) && statusValues.length > 0;

  async function attachPopulate(query) {
    let q = query;
    for (const p of [].concat(populate || [])) q = q.populate(p);
    return q;
  }

  async function list(request) {
    try {
      await authorizeRecruitment(request, `view-${permission}`);
      await connectDB();
      const sp = request.nextUrl.searchParams;
      const { page, limit, skip } = getPagination(sp, defaultLimit);

      const filter = {};
      const or = searchFilter(sp, searchFields);
      if (or) filter.$or = or.$or;

      if (hasStatus) {
        const status = sp.get('status');
        if (status && status !== 'all' && status !== '') {
          if (!statusValues.includes(status)) return badRequest('Invalid status selected');
          filter.status = status;
        }
      }

      if (extraFilter) Object.assign(filter, (await extraFilter(sp)) || {});

      const sort = getSort(sp, sortMap);

      const queries = [
        attachPopulate(Model.find(filter).sort(sort).skip(skip).limit(limit).lean()),
        Model.countDocuments(filter),
      ];
      if (hasStatus) {
        const { status: _s, ...countFilter } = filter;
        queries.push(Model.aggregate([{ $match: countFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]));
      }
      const [items, total, statusAgg] = await Promise.all(queries);

      const payload = {
        [entityKey]: items,
        pagination: paginationPayload(page, limit, total),
      };
      if (hasStatus) payload.statusCounts = buildStatusCounts(statusAgg, statusValues);

      return Response.json(payload, { status: 200 });
    } catch (error) {
      return handleApiError(error, `Server error fetching ${entityKey}`);
    }
  }

  async function create(request) {
    try {
      const user = await authorizeRecruitment(request, `create-${permission}`);
      const body = await parseJsonBody(request);
      const { errors, data } = validateBody(body, validate);
      if (errors.length > 0) return Response.json({ errors }, { status: 400 });

      let cleaned = sanitize(data);
      if (transform) cleaned = (await transform(cleaned, user, null)) || cleaned;

      await connectDB();
      if (dependencies) {
        const depError = await dependencies(cleaned, null);
        if (depError) return badRequest(depError);
      }

      const doc = await Model.create({ ...cleaned, created_by: user?._id || null });
      const item = await attachPopulate(Model.findById(doc._id).lean());

      return Response.json({ message: 'Created successfully', [itemKey]: item }, { status: 201 });
    } catch (error) {
      return handleApiError(error, 'Server error creating record');
    }
  }

  async function update(request, id) {
    try {
      const user = await authorizeRecruitment(request, `edit-${permission}`);
      if (!isValidId(id)) return badRequest('Invalid record id');

      const body = await parseJsonBody(request);
      const { errors, data } = validateBody(body, validate);
      if (errors.length > 0) return Response.json({ errors }, { status: 400 });

      let cleaned = sanitize(data);
      delete cleaned.created_by;

      await connectDB();
      const existing = await Model.findById(id).lean();
      if (!existing) return notFound('Record not found');

      if (transform) cleaned = (await transform(cleaned, user, existing)) || cleaned;
      if (dependencies) {
        const depError = await dependencies(cleaned, existing);
        if (depError) return badRequest(depError);
      }

      const item = await attachPopulate(
        Model.findByIdAndUpdate(id, { $set: cleaned }, { new: true, runValidators: true }).lean()
      );

      return Response.json({ message: 'Updated successfully', [itemKey]: item }, { status: 200 });
    } catch (error) {
      return handleApiError(error, 'Server error updating record');
    }
  }

  async function destroy(request, id) {
    try {
      await authorizeRecruitment(request, `delete-${permission}`);
      if (!isValidId(id)) return badRequest('Invalid record id');
      await connectDB();

      const existing = await Model.findById(id).lean();
      if (!existing) return notFound('Record not found');

      for (const blocker of blockers) {
        const count = await blocker.Model.countDocuments({ [blocker.field]: id });
        if (count > 0) {
          return Response.json({ message: blocker.message }, { status: 409 });
        }
      }

      await Model.findByIdAndDelete(id);
      if (afterDelete) await afterDelete(existing);
      return Response.json({ message: 'Deleted successfully' }, { status: 200 });
    } catch (error) {
      return handleApiError(error, 'Server error deleting record');
    }
  }

  async function toggle(request, id) {
    try {
      await authorizeRecruitment(request, `edit-${permission}`);
      if (!isValidId(id)) return badRequest('Invalid record id');
      await connectDB();

      const existing = await Model.findById(id);
      if (!existing) return notFound('Record not found');

      existing.status = existing.status === 'active' ? 'inactive' : 'active';
      await existing.save();
      const item = await attachPopulate(Model.findById(id).lean());

      return Response.json(
        { message: `Status changed to ${existing.status}`, [itemKey]: item },
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error, 'Server error updating status');
    }
  }

  return { list, create, update, destroy, toggle };
}
