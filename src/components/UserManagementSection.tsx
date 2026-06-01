import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Loader2, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
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

async function callAdmin(
  action: string,
  opts: { method?: string; body?: unknown } = {},
) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke(`admin-users?action=${action}`, {
    method: (opts.method as any) ?? "POST",
    body: opts.body,
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });
  if (res.error) throw new Error(res.error.message);
  if ((res.data as any)?.error) throw new Error((res.data as any).error);
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load users");
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
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">User Management</h2>
        </div>
        <div className="px-6 py-8 text-sm text-muted-foreground">
          Contact your administrator to manage users.
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
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("bookkeeper");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to invite user");
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update role");
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
      setRemoving(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove user");
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
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">User Management</h2>
          <span className="text-[11px] text-muted-foreground">
            {loading ? "…" : `${users.length} users`}
          </span>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="px-6 py-8 text-sm text-muted-foreground">No users yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="text-left px-6 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Role</th>
                <th className="text-right px-6 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground break-all">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u, e.target.value as AppRole)}
                        disabled={updatingId === u.id}
                        className="h-8 px-2 rounded-md border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {updatingId === u.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setRemoving(u)}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Add User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AppRole)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setInviteOpen(false)}
              disabled={inviteBusy}
              className="h-9 px-3 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submitInvite}
              disabled={inviteBusy}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {inviteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Invite
            </button>
          </DialogFooter>
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
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
