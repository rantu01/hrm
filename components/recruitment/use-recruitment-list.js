'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Generic list-fetching hook used by the recruitment screens.
 * Wraps search (debounced), filters, sorting, pagination and error handling
 * around the list endpoints, which all share the same response shape:
 * `{ [itemKey]: [...], statusCounts/stageCounts, pagination }`.
 */
export function useRecruitmentList(endpoint, itemKey, options = {}) {
  const {
    defaultLimit = 10,
    perPageOptions = [10, 25, 50, 100],
    initialFilters = {},
    sortField = 'created_at',
    sortDirection = 'desc',
  } = options;

  const [items, setItems] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultLimit);
  const [sort, setSort] = useState({ field: sortField, direction: sortDirection });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filterSignature = useMemo(() => JSON.stringify(filters), [filters]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(perPage));
    sp.set('per_page', String(perPage));
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (sort.field) sp.set('sort_field', sort.field);
    if (sort.direction) sp.set('sort_direction', sort.direction);
    const parsed = JSON.parse(filterSignature || '{}');
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        sp.set(key, String(value));
      }
    }
    return sp.toString();
  }, [page, perPage, debouncedSearch, sort.field, sort.direction, filterSignature]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${endpoint}?${queryString}`, { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403) setForbidden(true);
          throw new Error(json.message || 'Failed to fetch data');
        }
        if (cancelled) return;
        setForbidden(false);
        const list = json[itemKey] || [];
        setItems(Array.isArray(list) ? list : []);
        const pagination = json.pagination || {};
        setTotal(pagination.total ?? list.length ?? 0);
        setPages(pagination.pages || 1);
        const counts = json.statusCounts || json.stageCounts;
        if (counts && typeof counts === 'object') setStatusCounts(counts);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint, itemKey, queryString, refreshKey]);

  const setFilter = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((field) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    );
    setPage(1);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    items,
    loading,
    error,
    forbidden,
    search,
    setSearch,
    filters,
    setFilter,
    page,
    setPage,
    perPage,
    setPerPage,
    perPageOptions,
    sort,
    toggleSort,
    statusCounts,
    total,
    pages,
    refresh,
    refreshKey,
  };
}

/**
 * Fetch a small option list once (dropdown data). `filter` allows callers to
 * narrow the request, e.g. `{ status: 'active' }`.
 */
export function useOptionList(endpoint, itemKey, filter = {}) {
  const [options, setOptions] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filterSignature = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const sp = new URLSearchParams({ limit: '1000', per_page: '1000' });
        const parsed = JSON.parse(filterSignature || '{}');
        for (const [key, value] of Object.entries(parsed)) {
          if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            sp.set(key, String(value));
          }
        }
        const res = await fetch(`${endpoint}?${sp.toString()}`, { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || 'Failed to load options');
        if (cancelled) return;
        const list = json[itemKey] || [];
        setItems(Array.isArray(list) ? list : []);
        setOptions(
          (Array.isArray(list) ? list : []).map((item) => ({
            value: String(item._id),
            label: item.name || item.title || item.question || item.task_name || item.label || String(item._id),
            raw: item,
          }))
        );
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint, itemKey, filterSignature]);

  return { options, items, loading, error };
}
