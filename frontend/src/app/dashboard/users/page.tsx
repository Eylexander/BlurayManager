"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import useRouteProtection from "@/hooks/useRouteProtection";
import {
  Users as UsersIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  Shield,
  Mail,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/common";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import { AddUserModal } from "@/components/modals/AddUserModal";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useRouteProtection(pathname);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiClient.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error(t("users.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(t("users.confirmDelete", { username: user.username }))) return;
    try {
      await apiClient.deleteUser(user.id);
      toast.success(t("users.deleteSuccess"));
      fetchUsers();
    } catch (error) {
      toast.error(t("users.deleteFailed"));
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) return <LoaderCircle />;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-12">
      {/* User Modal */}
      <AddUserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingUser={editingUser}
        onRefresh={fetchUsers}
      />

      {/* Header */}
      <div className="py-4 sm:py-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                {t("users.title")}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {users.length} {t("users.totalUsers")}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={handleCreateUser}
            icon={
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            }
          >
            {t("users.addUser")}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-xl text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-50 dark:focus:bg-gray-800 transition-all duration-200"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-6 sm:p-12 text-center">
            <UsersIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg">
              {searchQuery ? t("users.noUsersFound") : t("users.noUsers")}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="block md:hidden divide-y divide-gray-200 dark:divide-gray-700/50">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.username}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                        user.role === "admin"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                        title={t("users.editUserTooltip")}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        title={t("users.deleteUserTooltip")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t("users.user")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t("users.email")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t("users.role")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t("users.created")}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t("users.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                            title={t("users.editUserTooltip")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            title={t("users.deleteUserTooltip")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
