'use client';

import { useState } from 'react';
import { MasterDataPage } from '@/components/recruitment/master-data-page';
import {
  StatusBadge,
  Modal,
  ErrorBanner,
  Field,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/recruitment';

export default function OfferTemplatesPage() {
  const [preview, setPreview] = useState(null); // { title, content }
  const [generating, setGenerating] = useState(null); // template item
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(id, mode, variables) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/offer-templates/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, variables }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to render template'));
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview(item) {
    const json = await run(item._id, 'preview');
    if (json) setPreview({ title: item.name, content: json.content, variables: json.variables || [] });
  }

  async function handleGenerate(e) {
    e.preventDefault();
    const json = await run(generating._id, 'generate', values);
    if (json) {
      setPreview({ title: `${generating.name} (generated)`, content: json.content, variables: json.variables || [] });
      setGenerating(null);
      setValues({});
    }
  }

  function handlePrint() {
    if (!preview) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>${preview.title}</title></head><body style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto;">${preview.content}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <>
      <MasterDataPage
        title="Offer Templates"
        description="Reusable offer letters with {{variable}} placeholders"
        endpoint="/api/recruitment/offer-templates"
        entityKey="offerTemplates"
        itemKey="offerTemplate"
        createLabel="Add Template"
        searchPlaceholder="Search templates..."
        columns={[
          { key: 'name', label: 'Template', sortable: true },
          {
            key: 'variables',
            label: 'Variables',
            render: (item) =>
              item.variables?.length ? (
                <div className="flex max-w-md flex-wrap gap-1">
                  {item.variables.slice(0, 6).map((variable) => (
                    <Badge key={variable} variant="outline" className="text-[10px]">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                  {item.variables.length > 6 ? (
                    <span className="text-xs text-muted-foreground">+{item.variables.length - 6}</span>
                  ) : null}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
          { key: 'updatedAt', label: 'Last Updated', render: (item) => formatDate(item.updatedAt) },
        ]}
        fields={[
          { name: 'name', label: 'Template Name', required: true, placeholder: 'e.g. Standard Offer Letter' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
          {
            name: 'template_content',
            label: 'Template Content',
            type: 'textarea',
            required: true,
            rows: 12,
            className: 'sm:col-span-2',
            hint: 'Use {{variable_name}} placeholders, e.g. {{candidate_name}} or {{salary}}.',
          },
        ]}
        defaultForm={{ name: '', template_content: '', status: 'active' }}
        rowActions={(item) => (
          <>
            <Button size="sm" variant="outline" onClick={() => handlePreview(item)} disabled={busy}>
              Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGenerating(item);
                setValues({});
                setError('');
              }}
              disabled={busy}
            >
              Generate
            </Button>
          </>
        )}
      />

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title || 'Template'}
        description="Rendered offer letter content"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button onClick={handlePrint}>Print</Button>
          </>
        }
      >
        {preview?.variables?.length ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Variables: {preview.variables.map((v) => `{{${v}}}`).join(', ')}
          </p>
        ) : null}
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
          {preview?.content || ''}
        </div>
      </Modal>

      <Modal
        open={Boolean(generating)}
        onClose={() => setGenerating(null)}
        title={`Generate — ${generating?.name || ''}`}
        description="Fill in the template variables to render the offer letter"
        footer={
          <>
            <Button variant="outline" onClick={() => setGenerating(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="generate-template-form" disabled={busy}>
              {busy ? 'Rendering...' : 'Generate'}
            </Button>
          </>
        }
      >
        <form id="generate-template-form" onSubmit={handleGenerate} className="flex flex-col gap-4">
          {error ? <ErrorBanner message={error} /> : null}
          {(generating?.variables || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">This template has no variables.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {generating.variables.map((variable) => (
                <Field key={variable} label={variable.replace(/_/g, ' ')} htmlFor={`gen-${variable}`}>
                  <Input
                    id={`gen-${variable}`}
                    value={values[variable] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [variable]: e.target.value }))}
                    placeholder={`{{${variable}}}`}
                  />
                </Field>
              ))}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
