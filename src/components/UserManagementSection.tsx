import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Loader2, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activityLogger";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  created_at: string;
};

const ROLES: AppRole[] = ["admin", "bookkeeper"];

type HttpMethod = "POST" | "GET" | "PUT" | "PATCH" | "DELETE";

async function callAdmin(
  action: string,
  opts: { method?: HttpMethod; body?: unknown } = {},
) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke(`admin-users?action=${action}`, {
    method: opts.method ?? "POST",
    body: opts.body,
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });
  if (res.error) throw new Error(res.error.message);
  const resData = res.data as Record<string, unknown> | null;
  if (resData?.error) throw new Error(String(resData.error));
  return res.data;
}

export default function UserManagementSection() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("bookkeeper");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [removing, setRemoving] = useState<ManagedUser | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = (await callAdmin("list")) as { users: ManagedUser[] };
      setUsers(data.users ?? []);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">User Management</h2>
        </div>
        <div className="px-6 py-10 flex flex-col items-center text-center gap-2">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-foreground">Admin access required</p>
          <p className="text-xs text-muted-foreground">Contact your administrator to manage users.</p>
        </div>
      </motion.div>
    );
  }

  const submitInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setInviteBusy(true);
    try {
      await callAdmin("invite", {
        method: "POST",
        body: {
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      });
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      void logActivity({
        action: "user-invite",
        clientName: inviteName.trim(),
        page: "Settings",
        details: `Invited ${inviteEmail.trim()} as ${inviteRole}`,
      });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("bookkeeper");
      load();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to invite user");
    } finally {
      setInviteBusy(false);
    }
  };

  const updateRole = async (u: ManagedUser, role: AppRole) => {
    if (role === u.role) return;
    setUpdatingId(u.id);
    try {
      await callAdmin("update-role", {
        method: "POST",
        body: { id: u.id, role },
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast.success("Role updated");
      void logActivity({
        action: "user-role-change",
        clientName: u.name,
        page: "Settings",
        details: `Role changed from ${u.role} to ${role} (${u.email})`,
      });
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await callAdmin("remove", {
        method: "POST",
        body: { id: removing.id },
      });
      setUsers((prev) => prev.filter((x) => x.id !== removing.id));
      toast.success("User removed");
      void logActivity({
        action: "user-remove",
        clientName: removing.name,
        page: "Settings",
        details: `Removed ${removing.email} (${removing.role})`,
      });
      setRemoving(null);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to remove user");
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">User Management</h2>
            <p className="text-xs text-muted-foreground">Invite teammates and manage their roles.</p>
          </div>
          {loading ? (
            <Skeleton className="h-4 w-14 rounded" />
          ) : (
            <span className="text-[11px] font-mono-data tabular-nums text-muted-foreground">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Add User
        </button>
      </div>

      {loading ? (
        <div className="overflow-x-auto" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading users…</span>
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1.2fr_1.6fr_120px_140px] gap-4 bg-muted/40 px-6 py-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16 rounded" />
              ))}
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.2fr_1.6fr_120px_140px] items-center gap-4 px-6 py-3">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-28 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="px-6 py-10">
          <EmptyState icon={Users} title="No users yet" size="sm" />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto scrollbar-thin">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
              <tr className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="text-left px-6 py-2.5">Name</th>
                <th scope="col" className="text-left px-4 py-2.5">Email</th>
                <th scope="col" className="text-left px-4 py-2.5">Role</th>
                <th scope="col" className="text-right px-6 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors duration-150">
                  <td className="px-6 py-3 font-medium text-foreground max-w-[200px] truncate" title={u.name}>{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate" title={u.email}>{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u, e.target.value as AppRole)}
                        disabled={updatingId === u.id}
                        aria-label={`Role for ${u.name}`}
                        className="h-8 px-2 rounded-md border border-border bg-background text-xs font-semibold capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {updatingId === u.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Updating role" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRemoving(u)}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => !inviteBusy && setInviteOpen(o)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin p-0 gap-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteBusy) void submitInvite();
            }}
            className="flex flex-col"
            noValidate
          >
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Add User
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Sends an email invite. Fields marked <span className="text-destructive">*</span> are required.
              </p>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account details
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-xs font-semibold text-muted-foreground">
                  Name <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <input
                  id="invite-name"
                  name="name"
                  autoComplete="name"
                  required
                  aria-required="true"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-semibold text-muted-foreground">
                  Email <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role" className="text-xs font-semibold text-muted-foreground">
                  Role
                </Label>
                <select
                  id="invite-role"
                  name="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppRole)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-medium capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 bg-card border-t border-border px-6 py-4 sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                disabled={inviteBusy}
                className="h-9 px-3 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteBusy}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {inviteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {inviteBusy ? "Sending…" : "Send Invite"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => !removeBusy && !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove access?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-semibold text-foreground">
                {removing?.name}
              </span>{" "}
              ({removing?.email}) and deletes their login. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmRemove();
              }}
              disabled={removeBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeBusy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
