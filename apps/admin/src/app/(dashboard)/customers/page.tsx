'use client'

import React, { useState, useEffect } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
} from '@repo/ui'
import { Shield, Truck, User, RefreshCw, CheckCircle2, UserPlus, AlertCircle, X } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { getAllUsers, assignUserRole, type UserProfile, type UserRole } from '@repo/supabase/utils'

export default function LuxuryCustomersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Direct Provisioning Drawer State
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('admin-secret-2026')
  const [newUserRole, setNewUserRole] = useState<UserRole>('admin')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json().catch(() => ({}))
      setUsers(Array.isArray(data?.users) ? data.users : [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleChange = async (userId: string, targetName: string, newRole: UserRole) => {
    setUpdatingUserId(userId)
    setNotification(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        setNotification({
          type: 'error',
          message: `Failed to assign role: ${data?.error || 'Permission error'}`,
        })
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
        setNotification({
          type: 'success',
          message: `Updated ${targetName} to role "${newRole.toUpperCase()}". They can now access the ${newRole === 'delivery' || newRole === 'delivery_partner' ? 'Courier Dispatch portal' : newRole === 'admin' ? 'Studio Admin' : 'Storefront'}.`,
        })
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to assign role: ${err?.message || 'Server error'}`,
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword) return

    setIsCreatingUser(true)
    setNotification(null)

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'Failed to create user' })
      } else {
        setNotification({
          type: 'success',
          message: data.message || `User "${newUserName}" registered with role "${newUserRole.toUpperCase()}".`,
        })
        setNewUserName('')
        setNewUserEmail('')
        setNewUserPassword(newUserRole === 'admin' ? 'admin-secret-2026' : 'courier-secret-2026')
        setShowAddUser(false)
        await loadUsers()
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Error creating user' })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-3xs font-mono uppercase bg-amber-950/40 text-amber-500 dark:text-amber-400 border border-amber-800/60 font-semibold">
            <Shield className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Studio Admin
          </span>
        )
      case 'delivery':
      case 'delivery_partner':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-3xs font-mono uppercase bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-800/60 font-semibold">
            <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Logistics Courier
          </span>
        )
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-3xs font-mono uppercase bg-chrome-950 text-zinc-400 border border-chrome-800 font-semibold">
            <User className="w-3 h-3 text-zinc-400" /> Private Patron
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-chrome-800 pb-5">
        <div>
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold block">
            Access Control & Logistics Fleet Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-light text-zinc-100 mt-1">
            Patron & Staff Directory
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Reassign any user&apos;s role to &apos;delivery&apos; for courier dispatch access, or promote to Sovereign Studio Admin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadUsers}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddUser(!showAddUser)}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold flex items-center gap-1.5 rounded-none"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showAddUser ? 'Close Form' : '+ Provision User / Admin'}</span>
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Direct User / Admin / Courier Provisioning Drawer */}
      {showAddUser && (
        <div className="p-6 bg-chrome-900 border border-chrome-800 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-chrome-800 pb-2">
            <span className="text-xs uppercase tracking-wider text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Provision Dedicated Account
            </span>
            <span className="text-3xs text-zinc-500 font-mono">Instantly grants authenticated portal access</span>
          </div>

          <form onSubmit={handleCreateNewUser} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Alex Vance"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Email Address *</label>
              <input
                type="email"
                placeholder="e.g. alex.admin@atelier.internal"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Passkey / Password *</label>
              <input
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">Assigned Role *</label>
              <select
                value={newUserRole}
                onChange={(e) => {
                  const role = e.target.value as UserRole
                  setNewUserRole(role)
                  if (role === 'admin' && newUserPassword === 'courier-secret-2026') {
                    setNewUserPassword('admin-secret-2026')
                  }
                }}
                className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="admin">Studio Admin (Port 3001)</option>
                <option value="delivery_partner">Logistics Courier (Port 3002)</option>
                <option value="customer">Private Patron (Port 3000)</option>
              </select>
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <Button type="button" variant="terminal" size="sm" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                isLoading={isCreatingUser}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none"
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users & Roles Directory Table */}
      <div className="border border-chrome-800 bg-chrome-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-chrome-800 bg-chrome-950 hover:bg-transparent">
              <TableHead className="font-semibold text-zinc-400">User / Identity</TableHead>
              <TableHead className="font-semibold text-zinc-400">Email Address</TableHead>
              <TableHead className="font-semibold text-zinc-400">Current Role</TableHead>
              <TableHead className="font-semibold text-zinc-400">Reassign Authorization Role</TableHead>
              <TableHead className="text-right font-semibold text-zinc-400">Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="border-b border-chrome-850 hover:bg-chrome-850 transition-colors">
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-100 text-xs">{u.name || 'Anonymous Patron'}</p>
                    <p className="text-3xs text-zinc-500 font-mono">UUID: {u.id.slice(0, 8)}...{u.id.slice(-4)}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-300">
                  {u.email || 'N/A'}
                </TableCell>
                <TableCell>
                  {getRoleBadge(u.role)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      disabled={updatingUserId === u.id}
                      onChange={(e) => handleRoleChange(u.id, u.name, e.target.value as UserRole)}
                      className="bg-chrome-950 border border-chrome-750 text-xs text-zinc-100 px-2.5 py-1 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="customer">Customer (Patron)</option>
                      <option value="delivery_partner">Delivery Partner (Courier)</option>
                      <option value="delivery">Delivery Partner (Legacy Alias)</option>
                      <option value="admin">Studio Admin (Owner)</option>
                    </select>

                    {updatingUserId === u.id && (
                      <span className="text-3xs text-amber-500 dark:text-amber-400 animate-pulse font-mono">Syncing...</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                </TableCell>
              </TableRow>
            ))}

            {users.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-zinc-500">
                  No patron or staff profiles discovered. Click &quot;+ Provision User / Admin&quot; to register an account.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
