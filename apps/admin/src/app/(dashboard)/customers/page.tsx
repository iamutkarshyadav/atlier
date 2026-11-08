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
      const supabase = createBrowserClient()
      const data = await getAllUsers(supabase)
      setUsers(data)
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

    const supabase = createBrowserClient()
    const { success, error } = await assignUserRole(supabase, userId, newRole)

    if (!success) {
      setNotification({
        type: 'error',
        message: `Failed to assign role: ${error || 'Permission error'}`,
      })
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
      setNotification({
        type: 'success',
        message: `Updated ${targetName} to role "${newRole.toUpperCase()}". They can now access the ${newRole === 'delivery' ? 'Courier Dispatch portal' : newRole === 'admin' ? 'Studio Admin' : 'Storefront'}.`,
      })
    }
    setUpdatingUserId(null)
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase bg-neutral-900 text-amber-400 border border-amber-900/40">
            <Shield className="w-3 h-3 text-amber-400" /> Studio Admin
          </span>
        )
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase bg-neutral-900 text-emerald-400 border border-emerald-900/50">
            <Truck className="w-3 h-3 text-emerald-400" /> Logistics Courier
          </span>
        )
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase bg-neutral-900 text-neutral-400 border border-neutral-800">
            <User className="w-3 h-3 text-neutral-400" /> Private Patron
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 font-mono">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#23232A] pb-6">
        <div>
          <span className="text-[10px] tracking-caps uppercase text-neutral-500 block">
            Access Control & Logistics Fleet Governance
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mt-1">
            Patron & Staff Directory
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Reassign any user&apos;s role to &apos;delivery&apos; for courier dispatch access, or promote to Sovereign Studio Admin.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            variant="terminal"
            size="sm"
            onClick={() => setShowAddUser(!showAddUser)}
            className="bg-neutral-100 hover:bg-white text-neutral-950 border-none font-bold flex items-center gap-1.5"
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
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
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
          <button onClick={() => setNotification(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Direct User / Admin / Courier Provisioning Drawer */}
      {showAddUser && (
        <div className="p-6 bg-[#121215] border border-[#23232A] space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-[#23232A] pb-2">
            <span className="text-xs uppercase tracking-caps text-amber-400 font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Provision Dedicated Account
            </span>
            <span className="text-[10px] text-neutral-500">Instantly grants authenticated portal access</span>
          </div>

          <form onSubmit={handleCreateNewUser} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Alex Vance"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Email Address *</label>
              <input
                type="email"
                placeholder="e.g. alex.admin@atelier.internal"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Passkey / Password *</label>
              <input
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400">Assigned Role *</label>
              <select
                value={newUserRole}
                onChange={(e) => {
                  const role = e.target.value as UserRole
                  setNewUserRole(role)
                  if (role === 'admin' && newUserPassword === 'courier-secret-2026') {
                    setNewUserPassword('admin-secret-2026')
                  }
                }}
                className="w-full h-10 bg-[#18181C] border border-[#2B2B33] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="admin">Studio Admin (Port 3001)</option>
                <option value="delivery">Logistics Courier (Port 3002)</option>
                <option value="customer">Private Patron (Port 3000)</option>
              </select>
            </div>

            <div className="sm:col-span-4 flex justify-end gap-3 pt-2">
              <Button type="button" variant="terminal" size="sm" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="terminal"
                size="sm"
                isLoading={isCreatingUser}
                className="bg-amber-400 hover:bg-amber-300 text-black border-none font-bold"
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users & Roles Directory Table */}
      <div className="border border-[#23232A] bg-[#0E0E11] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#23232A] hover:bg-transparent">
              <TableHead>User / Identity</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Reassign Authorization Role</TableHead>
              <TableHead className="text-right">Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="border-b border-[#1A1A20] hover:bg-[#131317] transition-colors">
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white text-xs">{u.name || 'Anonymous Patron'}</p>
                    <p className="text-[10px] text-neutral-500 font-mono">UUID: {u.id.slice(0, 8)}...{u.id.slice(-4)}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-neutral-300">
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
                      className="bg-[#18181C] border border-[#2B2B33] text-xs text-white px-2.5 py-1.5 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="customer">Customer (Patron)</option>
                      <option value="delivery">Delivery Partner (Courier)</option>
                      <option value="admin">Studio Admin (Owner)</option>
                    </select>

                    {updatingUserId === u.id && (
                      <span className="text-[10px] text-amber-400 animate-pulse">Syncing...</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-neutral-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
