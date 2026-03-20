'use client'

import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import ProfileEditForm, {
  type ProfileEditFormRef,
} from '@/src/components/dashboard/ProfileEditForm'
import ProfileViewCard from '@/src/components/dashboard/ProfileViewCard'
import { useAuth } from '@/src/contexts/AuthContext'
import { useGetMyProfileQuery } from '@/src/generated/graphql'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { FiEdit3, FiEye, FiUser } from 'react-icons/fi'

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const formRef = useRef<ProfileEditFormRef>(null)

  // Check if edit mode is requested via URL param
  const editParam = searchParams.get('edit')
  const [isEditMode, setIsEditMode] = useState(editParam === 'true')

  const { data, loading, error, refetch } = useGetMyProfileQuery({
    skip: !isAuthenticated,
  })


  // Sync URL param with state
  useEffect(() => {
    setIsEditMode(editParam === 'true')
  }, [editParam])

  const handleSave = async () => {
    await refetch()
    setIsEditMode(false)
    // Update URL without edit param
    router.replace('/dashboard/profile')
  }

  const handleCancel = () => {
    setIsEditMode(false)
    router.replace('/dashboard/profile')
  }

  const toggleEditMode = () => {
    if (isEditMode) {
      router.replace('/dashboard/profile')
    } else {
      router.replace('/dashboard/profile?edit=true')
    }
    setIsEditMode(!isEditMode)
  }

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-400">Error loading profile</p>
        </div>
      </DashboardLayout>
    )
  }

  const profile = data?.me

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-12 text-center">
          <p className="text-text-secondary mb-4">
            Profile not found. Please complete your registration.
          </p>
          <button onClick={() => router.push('/register')} className="btn btn-primary">
            Complete Registration
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <FiUser className="text-neon-purple" />
              {isEditMode ? 'Edit Profile' : 'My Profile'}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {isEditMode ? 'Update your profile information' : 'How others see you'}
            </p>
          </div>

          {/* View/Edit Toggle */}
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              isEditMode
                ? 'bg-white/10 border border-white/20 text-text-primary hover:bg-white/15'
                : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:shadow-lg hover:shadow-neon-purple/30'
            }`}
          >
            {isEditMode ? (
              <>
                <FiEye size={18} />
                <span>View Profile</span>
              </>
            ) : (
              <>
                <FiEdit3 size={18} />
                <span>Edit Profile</span>
              </>
            )}
          </button>
        </div>

        {isEditMode ? (
          /* Edit Mode */
          <>
            {/* Cover Image Section - Only in Edit Mode */}
            <div className="relative mb-8">
              <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-r from-neon-purple/20 to-neon-pink/20">
                {profile?.cover_image_url ? (
                  <img
                    src={profile.cover_image_url}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-text-secondary">No cover image</p>
                  </div>
                )}

                {/* Cover Edit Button */}
                <button
                  onClick={() => formRef.current?.triggerCoverUpload()}
                  className="absolute top-4 right-4 p-3 bg-bg-primary/90 hover:bg-bg-primary border border-white/20 hover:border-neon-purple/50 rounded-xl text-text-primary hover:text-neon-purple transition-all backdrop-blur-sm z-10"
                  aria-label="Edit cover image"
                >
                  <FiEdit3 size={20} />
                </button>
              </div>

              {/* Avatar overlay */}
              <div className="absolute -bottom-12 left-8">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || profile.username || 'User'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-bg-secondary"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-3xl font-bold border-4 border-bg-secondary">
                      {profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}

                  {/* Avatar Edit Button */}
                  <button
                    onClick={() => formRef.current?.triggerAvatarUpload()}
                    className="absolute bottom-0 right-0 p-2.5 bg-gradient-to-br from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 rounded-full text-white transition-all shadow-lg hover:shadow-neon-purple/50 z-10"
                    aria-label="Edit profile picture"
                  >
                    <FiEdit3 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-12">
              <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 sm:p-8">
                <ProfileEditForm
                  ref={formRef}
                  user={profile}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          </>
        ) : (
          /* View Mode */
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 overflow-hidden">
            <ProfileViewCard user={profile} isOwnProfile={true} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
