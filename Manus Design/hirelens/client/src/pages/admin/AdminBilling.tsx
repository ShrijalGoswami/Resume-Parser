// Commercial suite — Subscriptions, Billing, Invoices, Customer Accounts (route-aware single module).
import { CreditCard, Download, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { AdminTable, PageHeader, StatCard, StatusBadge, type Column } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invoices, orgs, type Invoice } from '@/lib/adminData';
import { toast } from 'sonner';

const plans = [
  { name: 'Starter', price: '$49', per: 'per seat / month', features: ['Up to 10 seats', '1,000 AI credits/seat', 'Email support', 'Core analytics'], orgs: orgs.filter((o) => o.plan === 'Starter').length },
  { name: 'Growth', price: '$79', per: 'per seat / month', features: ['Up to 30 seats', '2,000 AI credits/seat', 'Priority support', 'Advanced analytics', 'API access'], orgs: orgs.filter((o) => o.plan === 'Growth').length },
  { name: 'Enterprise', price: '$99', per: 'per seat / month', features: ['Unlimited seats', 'Custom AI credits', 'Dedicated CSM', 'SSO & SCIM', 'Data residency', 'SLA 99.9%'], orgs: orgs.filter((o) => o.plan === 'Enterprise').length },
];

export default function AdminBilling() {
  const [location] = useLocation();
  const view = location.includes('invoices') ? 'invoices' : location.includes('subscriptions') ? 'subscriptions' : location.includes('accounts') ? 'accounts' : 'billing';
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((i) => statusFilter === 'all' || i.status === statusFilter);
  const outstanding = invoices.filter((i) => i.status === 'Open' || i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const collected = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);

  const downloadInvoiceCsv = (rows: Invoice[], name: string) => {
    const csv = [['Invoice', 'Organization', 'Plan', 'Seats', 'Amount', 'Status', 'Issued', 'Due'], ...rows.map((i) => [i.id, i.org, i.plan, String(i.seats), `$${i.amount}`, i.status, i.issued, i.due])]
      .map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const invoiceColumns: Column<Invoice>[] = [
    { key: 'id', header: 'Invoice', sortable: true, sortValue: (i) => i.id, render: (i) => <span className="font-mono text-[12px] font-medium text-foreground">{i.id}</span> },
    { key: 'org', header: 'Organization', sortable: true, sortValue: (i) => i.org, render: (i) => <span className="text-[13px] text-foreground/70">{i.org}</span> },
    { key: 'plan', header: 'Plan', render: (i) => <span className="text-[13px] text-foreground/60">{i.plan} · {i.seats} seats</span> },
    { key: 'amount', header: 'Amount', sortable: true, sortValue: (i) => i.amount, render: (i) => <span className="font-mono text-[13px] text-foreground">${i.amount.toLocaleString()}</span> },
    { key: 'status', header: 'Status', sortable: true, sortValue: (i) => i.status, render: (i) => <StatusBadge value={i.status} /> },
    { key: 'due', header: 'Due', sortable: true, sortValue: (i) => i.due, render: (i) => <span className="font-mono text-[12px] text-foreground/50">{i.due}</span> },
  ];

  const titles: Record<string, [string, string]> = {
    billing: ['Billing', 'Revenue collection, payment health, and outstanding balances'],
    subscriptions: ['Subscriptions', 'Plans, pricing tiers, and current distribution'],
    invoices: ['Invoices', `${invoices.length} invoices this period`],
    accounts: ['Customer Accounts', 'Commercial account health across all organizations'],
  };

  return (
    <AdminLayout title={titles[view][0]}>
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto space-y-6">
        <PageHeader
          title={titles[view][0]}
          desc={titles[view][1]}
          actions={
            <Button variant="outline" size="sm" onClick={() => { downloadInvoiceCsv(invoices, 'hirelens-invoices.csv'); toast.success('Invoice export downloaded'); }}>
              <Download size={14} className="mr-1.5" /> Export CSV
            </Button>
          }
        />

        {(view === 'billing' || view === 'invoices') && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Collected (Jul)" value={`$${collected.toLocaleString()}`} delta="+4.2%" deltaUp sub="7 invoices paid" />
            <StatCard label="Outstanding" value={`$${outstanding.toLocaleString()}`} sub="4 open · 1 overdue" delay={0.05} />
            <StatCard label="Overdue" value="$1,185" delta="Brightpath" sub="31 days past due" delay={0.1} />
            <StatCard label="Net revenue retention" value="114%" delta="+2pts" deltaUp sub="trailing 12 months" delay={0.15} />
          </div>
        )}

        {(view === 'subscriptions' || view === 'billing' || view === 'accounts') && (
          <section>
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Plans</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div key={p.name} className={`rounded-xl border bg-card p-5 ${p.name === 'Enterprise' ? 'border-accent/60 shadow-[0_2px_12px_rgba(13,148,136,0.08)]' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground" style={{ marginBottom: 0 }}>{p.name}</p>
                    <span className="font-mono text-[11px] text-foreground/45">{p.orgs} orgs</span>
                  </div>
                  <p className="font-mono text-xl font-semibold text-foreground" style={{ marginBottom: 2 }}>{p.price}</p>
                  <p className="text-[11px] text-foreground/45" style={{ marginBottom: 12 }}>{p.per}</p>
                  <ul className="space-y-1.5 text-[12px] text-foreground/65 list-none pl-0" style={{ marginBottom: 14 }}>
                    {p.features.map((f) => <li key={f} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-accent shrink-0" />{f}</li>)}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toast.success(`${p.name} plan configuration opened`, { description: 'Pricing changes require a second admin approval.' })}>Configure</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === 'accounts' && (
          <section>
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Account health</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {orgs.filter((o) => o.status !== 'Churned').map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-foreground" style={{ marginBottom: 0 }}>{o.name}</p>
                    <StatusBadge value={o.status} />
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-foreground/55 mb-2">
                    <span>{o.plan} · {o.seatsUsed}/{o.seats} seats</span>
                    <span className="font-mono">${o.mrr.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(o.aiCreditsUsed / o.aiCreditsTotal) * 100} className="h-1.5 flex-1" />
                    <span className="font-mono text-[10px] text-foreground/45 shrink-0">{Math.round((o.aiCreditsUsed / o.aiCreditsTotal) * 100)}% credits</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(view === 'invoices' || view === 'billing') && (
          <section>
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Invoices</h3>
            <AdminTable
              rows={filteredInvoices}
              columns={invoiceColumns}
              searchKeys={(i) => `${i.id} ${i.org} ${i.plan} ${i.status}`}
              searchPlaceholder="Search invoices..."
              onRowClick={(i) => setPreviewInvoice(i)}
              filters={
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Void">Void</SelectItem>
                  </SelectContent>
                </Select>
              }
              bulkActions={(selected, clear) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-foreground/50">{selected.length} selected</span>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => { downloadInvoiceCsv(invoices.filter((i) => selected.includes(i.id)), 'hirelens-invoices-selected.csv'); toast.success(`${selected.length} invoices exported`); clear(); }}>Export</Button>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => { toast.success(`Payment reminders sent for ${selected.length} invoices`); clear(); }}>Send reminders</Button>
                </div>
              )}
            />
          </section>
        )}
      </div>

      {/* Invoice preview */}
      <Dialog open={!!previewInvoice} onOpenChange={(o) => !o && setPreviewInvoice(null)}>
        <DialogContent className="sm:max-w-lg">
          {previewInvoice && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-foreground/50" />
                  <DialogTitle className="font-mono text-base">{previewInvoice.id}</DialogTitle>
                  <StatusBadge value={previewInvoice.status} />
                </div>
                <DialogDescription>Issued {previewInvoice.issued} · Due {previewInvoice.due}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-foreground/55">Billed to</span>
                  <span className="font-medium text-foreground">{previewInvoice.org}</span>
                </div>
                <div className="flex justify-between text-[13px] pb-3 border-b border-border">
                  <span className="text-foreground/55">{previewInvoice.plan} plan · {previewInvoice.seats} seats</span>
                  <span className="font-mono text-foreground">${previewInvoice.amount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-[14px] font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="font-mono text-foreground">${previewInvoice.amount.toLocaleString()}.00 USD</span>
                </div>
              </div>
              <DialogFooter>
                {(previewInvoice.status === 'Open' || previewInvoice.status === 'Overdue') && (
                  <Button variant="outline" onClick={() => { toast.success(`Reminder sent to ${previewInvoice.org}`); }}>Send reminder</Button>
                )}
                <Button className="bg-primary" onClick={() => { downloadInvoiceCsv([previewInvoice], `${previewInvoice.id}.csv`); toast.success('Invoice downloaded'); }}>
                  <CreditCard size={14} className="mr-1.5" /> Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
