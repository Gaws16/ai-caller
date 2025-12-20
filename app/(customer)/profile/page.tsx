'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import type { User } from '@supabase/supabase-js'
import { Camera, User as UserIcon } from 'lucide-react'
import Image from 'next/image'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        router.push('/login?redirect=/profile')
        return
      }

      setUser(currentUser)
      // Get avatar from user metadata
      const avatar = currentUser.user_metadata?.avatar_url as string | undefined
      setAvatarUrl(avatar || null)
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        // If bucket doesn't exist, try creating it or use a different approach
        // For now, we'll store the image as base64 in user metadata as fallback
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64data = reader.result as string
          const { error: updateError } = await supabase.auth.updateUser({
            data: { avatar_url: base64data },
          })

          if (updateError) {
            setError(updateError.message)
            setUploading(false)
            return
          }

          setAvatarUrl(base64data)
          setSuccess('Profile picture updated successfully!')
          setUploading(false)
          // Refresh user data
          const { data: { user: updatedUser } } = await supabase.auth.getUser()
          if (updatedUser) setUser(updatedUser)
        }
        reader.readAsDataURL(file)
        return
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName)

      // Update user metadata with avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })

      if (updateError) {
        setError(updateError.message)
        setUploading(false)
        return
      }

      setAvatarUrl(publicUrl)
      setSuccess('Profile picture updated successfully!')
      setUploading(false)
      // Refresh user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) setUser(updatedUser)
    } catch (err) {
      setError('An unexpected error occurred')
      setUploading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setSaving(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setSaving(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      setSuccess('Password updated successfully!')
      setPassword('')
      setConfirmPassword('')
      setSaving(false)
    } catch (err) {
      setError('An unexpected error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-pulse text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
          Profile Settings
        </h1>

        {(error || success) && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              error
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {avatarUrl ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-800">
                      <Image
                        src={avatarUrl}
                        alt="Profile"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-800">
                      <UserIcon className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full sm:w-auto"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Change Picture'}
                  </Button>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                    JPG, PNG or GIF. Max size 5MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Update */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

