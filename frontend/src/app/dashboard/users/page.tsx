"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users as UsersIcon, Plus, Pencil, Trash2, Shield, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, getApiError } from "@/lib/api-client";
import useRouteProtection from "@/hooks/useRouteProtection";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types/auth";
import { Button, IconButton, PageHeader, SearchInput, useConfirm } from "@/components/common";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import UserFormModal from "@/components/modals/UserFormModal";

const roleStyles: Record<User["role"], string> = {
  admin: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30",
  moderator: "bg-primary/10 text-primary border-primary/30",
  user: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  guest: "bg-muted text-muted-foreground border-border",
};

function RoleBadge({ role }: { role: User["role"] }) {
  const t = useTranslations();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${roleStyles[role] ?? roleStyles.guest}`}
    >
      <Shield className="w-3 h-3" />
      {t(`users.${role}`)}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <div className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary font-semibold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UsersPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { confirm, confirmDialog } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // undefined: form closed, null: creating, User: editing
  const [editing, setEditing] = useState<User | null | undefined>(undefined);

  useRouteProtection(pathname);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiClient.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t("users.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (user: User) => {
    const ok = await confirm({
      title: t("users.confirmDelete", { username: user.username }),
      message: t("users.deleteWarning"),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiClient.deleteUser(user.id);
      toast.success(t("users.deleteSuccess"));
      fetchUsers();
    } catch (error) {
      toast.error(getApiError(error, t("users.deleteFailed")));
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q),
  );

  // Rendered in both the mobile cards and the desktop table
  const actions = (user: User) => (
    <div className="flex items-center justify-end gap-1">
      <IconButton label={t("users.editUserTooltip")} variant="primary" onClick={() => setEditing(user)}>
        <Pencil />
      </IconButton>
      <IconButton
        label={t("users.deleteUserTooltip")}
        variant="danger"
        onClick={() => handleDelete(user)}
        // An admin deleting their own account would lock themselves out
        disabled={user.id === currentUserId}
      >
        <Trash2 />
      </IconButton>
    </div>
  );

  if (loading) return <LoaderCircle />;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <PageHeader
        icon={<UsersIcon />}
        title={t("users.title")}
        description={`${users.length} ${t("users.totalUsers")}`}
        actions={
          <Button onClick={() => setEditing(null)} icon={<Plus />}>
            {t("users.addUser")}
          </Button>
        }
      />

      <SearchInput
        className="mb-6"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t("users.searchPlaceholder")}
      />

      <div className="card overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
            {searchQuery ? t("users.noUsersFound") : t("users.noUsers")}
          </div>
        ) : (
          <>
            {/* Mobile */}
            <ul className="md:hidden divide-y divide-border">
              {filteredUsers.map((user) => (
                <li key={user.id} className="p-4 flex items-center gap-3">
                  <UserAvatar name={user.username} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{user.username}</span>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  {actions(user)}
                </li>
              ))}
            </ul>

            {/* Desktop */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">{t("users.user")}</th>
                  <th className="px-5 py-3">{t("users.email")}</th>
                  <th className="px-5 py-3">{t("users.role")}</th>
                  <th className="px-5 py-3">{t("users.created")}</th>
                  <th className="px-5 py-3 text-right">{t("users.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 font-medium text-foreground">
                        <UserAvatar name={user.username} />
                        {user.username}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground/80">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {user.email}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">{actions(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {editing !== undefined && (
        <UserFormModal user={editing} onClose={() => setEditing(undefined)} onSaved={fetchUsers} />
      )}
      {confirmDialog}
    </div>
  );
}
