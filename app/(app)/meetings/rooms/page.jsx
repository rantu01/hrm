'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';

export default function MeetingRoomsPage() {
  return (
    <MasterDataPage
      title="Meeting Rooms"
      description="Manage physical and virtual meeting rooms."
      endpoint="/api/meetings/rooms"
      entityKey="meetingRooms"
      itemKey="meetingRoom"
      createLabel="Add Meeting Room"
      searchPlaceholder="Search meeting rooms..."
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'type', label: 'Type', sortable: true },
        { key: 'location', label: 'Location', render: (item) => item.location || '—' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g., Conference Room A' },
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          options: [
            { value: 'Physical', label: 'Physical' },
            { value: 'Virtual', label: 'Virtual' },
          ],
        },
        { name: 'location', label: 'Location', placeholder: 'Building / floor / link' },
        { name: 'capacity', label: 'Capacity', type: 'number', required: true, min: 1 },
        { name: 'booking_url', label: 'Booking URL', placeholder: 'https://...' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        { name: 'equipment', label: 'Equipment (comma separated)', type: 'textarea', className: 'sm:col-span-2', rows: 2 },
        { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2', rows: 3 },
      ]}
      defaultForm={{ name: '', description: '', type: 'Physical', location: '', capacity: 1, equipment: '', booking_url: '', status: 'active' }}
      transformSave={(form) => ({
        ...form,
        equipment: form.equipment
          ? String(form.equipment).split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      })}
    />
  );
}
