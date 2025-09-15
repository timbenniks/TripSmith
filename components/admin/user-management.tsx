"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  User,
  Calendar,
  MapPin,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  last_sign_in_at: string | null;
  trip_count: number;
  status: "active" | "inactive";
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/users`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setUsers((data?.users || []) as UserData[]);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-white/60 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-white/60">
            {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-white/60" />
            <select
              value={filterRole}
              onChange={(e) =>
                setFilterRole(e.target.value as "all" | "admin" | "user")
              }
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-black/20 backdrop-blur-sm border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-white/60 mt-2">Loading users...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-300">{error}</p>
            <Button onClick={loadUsers} className="mt-3" variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    User
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    Role
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    Joined
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    Last Seen
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    Trips
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {user.email}
                          </p>
                          <p className="text-xs text-white/60">
                            ID: {user.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {user.role === "admin" ? (
                          <Shield className="h-4 w-4 text-yellow-400" />
                        ) : (
                          <User className="h-4 w-4 text-blue-400" />
                        )}
                        <span
                          className={`text-sm capitalize ${
                            user.role === "admin"
                              ? "text-yellow-400"
                              : "text-blue-400"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white/80">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-white/80">
                        {formatLastSeen(user.last_sign_in_at)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white/80">
                          {user.trip_count}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          user.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-white/60 hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {filteredUsers.length === 0 && !loading && (
        <Card className="p-8 bg-black/20 backdrop-blur-sm border-white/10 text-center">
          <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No users found
          </h3>
          <p className="text-white/60">
            {searchTerm || filterRole !== "all"
              ? "Try adjusting your search or filters."
              : "No users have been registered yet."}
          </p>
        </Card>
      )}
    </div>
  );
}
