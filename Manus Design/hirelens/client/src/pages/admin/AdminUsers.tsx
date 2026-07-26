// Users — cross-org user management: search, filters, invite, suspend, delete, reset password, profile drawer.
import { MoreHorizontal, UserPlus } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { AdminTable, PageHeader, StatusBadge, type Column } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { adminUsers, type AdminUser } from '@/lib/adminData';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Recruiter');
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const filtered = adminUsers.filter(
    (u) => (roleFilter === 'all' || u.role === roleFilter) && (statusFilter === 'all' || u.status === statusFilter),
  );

  const columns: Column<AdminUser>[] = [
    {
      key: 'name', header: 'User', sortable: true, sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full ${u.color} text-white text-[10px] font-semibold flex items-center justify-center shrink-0`}>{u.initials}</div>
          <div>
            <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 0 }}>{u.name}</p>
            <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'org', header: 'Organization', sortable: true, sortValue: (u) => u.org, render: (u) => <span className="text-[13px] text-foreground/70">{u.org}</span> },
    { key: 'role', header: 'Role', sortable: true, sortValue: (u) => u.role, render: (u) => <span className="text-[13px] text-foreground/70">{u.role}</span> },
    { key: 'status', header: 'Status', sortable: true, sortValue: (u) => u.status, render: (u) => <StatusBadge value={u.status} /> },
    { key: 'lastActive', header: 'Last active', render: (u) => <span className="font-mono text-[12px] text-foreground/50">{u.lastActive}</span> },
    {
      key: 'actions', header: '', className: 'w-10',
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Actions for ${u.name}`}><MoreHorizontal size={14} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setProfileUser(u)}>View profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success(`Password reset email sent to ${u.email}`)}>Reset password</DropdownMenuItem>
              {u.status === 'Suspended' ? (
                <DropdownMenuItem onClick={() => toast.success(`${u.name} reinstated`)}>Reinstate</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => toast.success(`${u.name} suspended`, { description: 'They can no longer sign in. Reversible anytime.' })}>Suspend</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600" onClick={() => setDeleteUser(u)}>Delete user</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Users">
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto">
        <PageHeader
          title="Users"
          desc={`${adminUsers.length} users across ${new Set(adminUsers.map((u) => u.org)).size} organizations`}
          actions={<Button size="sm" className="bg-primary" onClick={() => setInviteOpen(true)}><UserPlus size={14} className="mr-1.5" /> Invite user</Button>}
        />
        <AdminTable
          rows={filtered}
          columns={columns}
          searchKeys={(u) => `${u.name} ${u.email} ${u.org} ${u.role}`}
          searchPlaceholder="Search users..."
          onRowClick={(u) => setProfileUser(u)}
          filters={
            <>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Invited">Invited</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          bulkActions={(selected, clear) => (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-foreground/50">{selected.length} selected</span>
              <Button variant="outline" size="sm" className="h-7" onClick={() => { toast.success(`Password reset emails sent to ${selected.length} users`); clear(); }}>Reset passwords</Button>
              <Button variant="outline" size="sm" className="h-7 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { toast.success(`${selected.length} users suspended`); clear(); }}>Suspend</Button>
            </div>
          )}
        />
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>Send an invitation email. The user chooses their password on first sign-in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email address</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary" disabled={!inviteEmail.includes('@')}
              onClick={() => { toast.success(`Invitation sent to ${inviteEmail}`, { description: `Role: ${inviteRole}. Expires in 7 days.` }); setInviteOpen(false); setInviteEmail(''); }}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile drawer */}
      <Sheet open={!!profileUser} onOpenChange={(o) => !o && setProfileUser(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-5">
          {profileUser && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${profileUser.color} text-white text-[15px] font-semibold flex items-center justify-center`}>{profileUser.initials}</div>
                  <div>
                    <SheetTitle>{profileUser.name}</SheetTitle>
                    <SheetDescription className="font-mono text-[12px]">{profileUser.email}</SheetDescription>
                  </div>
                  <div className="ml-auto"><StatusBadge value={profileUser.status} /></div>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['User ID', profileUser.id], ['Organization', profileUser.org],
                  ['Role', profileUser.role], ['Joined', profileUser.joined],
                  ['Last active', profileUser.lastActive], ['Status', profileUser.status],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] uppercase tracking-wide text-foreground/40 font-medium" style={{ marginBottom: 3 }}>{k}</p>
                    <p className="text-[13px] text-foreground font-medium truncate" style={{ marginBottom: 0 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success(`Password reset email sent to ${profileUser.email}`)}>Reset password</Button>
                <Button variant="outline" size="sm" onClick={() => toast.success(`Session revoked for ${profileUser.name}`, { description: 'They will need to sign in again on all devices.' })}>Revoke sessions</Button>
                <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { setDeleteUser(profileUser); setProfileUser(null); }}>Delete</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the user, their sessions, and personal data. Candidate records they created are preserved and reassigned to the org owner. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => { toast.success(`${deleteUser?.name} deleted`, { description: 'Logged as member.deleted in the audit trail.' }); setDeleteUser(null); }}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
