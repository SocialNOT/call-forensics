import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, UserCheck, UserX, Trash2, Activity, X } from 'lucide-react';
import { useAppStore } from '../../store';

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { token } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyUser = async (id: string) => {
    try {
      await fetch(`/api/admin/users/${id}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to verify user', error);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Admin Dashboard</h2>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">User Access Management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 font-mono">
              <Activity size={32} className="animate-pulse mb-4 text-emerald-500" />
              <div className="text-sm font-bold uppercase tracking-widest">LOADING_USERS...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 font-mono">
              <UserX size={32} className="mb-4 opacity-50" />
              <div className="text-sm font-bold uppercase tracking-widest">NO_USERS_FOUND</div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-emerald-500/50 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.username}</span>
                    <span className="text-xs font-mono text-zinc-500 mt-1">ID: {user.id.substring(0, 8)} | Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.is_verified === 1 ? (
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-1">
                        <UserCheck size={12} /> Verified
                      </span>
                    ) : (
                      <button 
                        onClick={() => verifyUser(user.id)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-1 transition-colors"
                      >
                        <ShieldCheck size={12} /> Approve
                      </button>
                    )}
                    <button 
                      onClick={() => deleteUser(user.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-sm transition-colors"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
