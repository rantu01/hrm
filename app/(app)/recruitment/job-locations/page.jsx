'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/recruitment';

export default function JobLocationsPage() {
  return (
    <MasterDataPage
      title="Job Locations"
      description="Offices and remote locations used by job postings"
      endpoint="/api/recruitment/job-locations"
      entityKey="jobLocations"
      itemKey="jobLocation"
      createLabel="Add Location"
      searchPlaceholder="Search locations..."
      columns={[
        {
          key: 'name',
          label: 'Location',
          sortable: true,
          render: (item) => (
            <div className="flex flex-col">
              <span className="font-medium">{item.name}</span>
              {item.is_remote ? (
                <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                  Remote
                </Badge>
              ) : null}
            </div>
          ),
        },
        {
          key: 'city',
          label: 'City / State',
          render: (item) => [item.city, item.state].filter(Boolean).join(', ') || '—',
        },
        { key: 'country', label: 'Country' },
        { key: 'postal_code', label: 'Postal Code' },
        { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
        { key: 'createdAt', label: 'Created', render: (item) => formatDate(item.createdAt) },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Head Office' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State' },
        { name: 'country', label: 'Country' },
        { name: 'postal_code', label: 'Postal Code' },
        { name: 'is_remote', label: 'Remote location', type: 'checkbox' },
        { name: 'address', label: 'Address', type: 'textarea', className: 'sm:col-span-2', rows: 2 },
      ]}
      defaultForm={{
        name: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        address: '',
        is_remote: false,
        status: 'active',
      }}
    />
  );
}
