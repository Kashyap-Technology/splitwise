import { createFileRoute } from "@tanstack/react-router"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Camera, Check, Loader2, AlertTriangle } from "lucide-react"
import { useMemo, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { compressImage } from "@/lib/compressImage"
import { useAuth } from "@/features/auth/hooks/useAuth" 
import { useUserDeleteMutation, useUserUpdateMutation } from "@/features/user/api/useUserMutation"
import { DataExportCard } from "@/features/user/components/DataExportCard"
import { SecurityCard } from "@/features/user/components/SecurityCard"
import { CARD_TONES } from "@/components/StatCard"

export const Route = createFileRoute("/_authenticated/me")({
  component: AccountProfilePage,
})

const profileFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  profile_image: z.any().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

function AccountProfilePage() {
  const { mutate, isPending } = useUserUpdateMutation()
  const { mutate: deleteUser, isPending: deleteUserPending } = useUserDeleteMutation()
  const { user: me, isLoading } = useAuth()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      profile_image: undefined,
    },
    mode: "onChange",
  })

  // Sync real backend user data into form values when loaded
  useEffect(() => {
    if (me) {
      form.reset({
        fullName: me.name || "",
        email: me.email || "",
        phone: me.phone || "",
        profile_image: undefined,
      })
    }
  }, [me, form])

  const profileImage = useWatch({ control: form.control, name: "profile_image" })
  
  const previewUrl = useMemo(() => {
    if (profileImage instanceof File) {
      return URL.createObjectURL(profileImage)
    }
    return me?.profile_image_url || null
  }, [profileImage, me?.profile_image_url])

  const onSubmit = async (data: ProfileFormValues) => {
    const formData = new FormData()
    formData.append("name", data.fullName)
    formData.append("email", data.email)
    formData.append("phone", data.phone)

    if (data.profile_image instanceof File) {
      const compressed = await compressImage(data.profile_image)
      formData.append("profile_image", compressed)
    }
    mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Splitwise Settings</span>
              <span>•</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Account & Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your identity credentials and contact methods.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Account Active & Synced
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (me) {
                  form.reset({
                    fullName: me.name || "",
                    email: me.email || "",
                    phone: me.phone || "",
                    profile_image: undefined,
                  })
                }
              }}
            >
              Discard
            </Button>
            <Button 
              type="submit" 
              form="profile-form"
              disabled={form.formState.isSubmitting || isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Main Content Form Wrapper */}
        <form
          id="profile-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Left Column: Profile Card & Avatar */}
          <div className="space-y-6">
            {/* Same tinted gradient as the stat cards elsewhere, so the profile
                reads as part of the same system rather than a plain panel. */}
            <Card
              className={`border-none shadow-sm overflow-hidden relative ${CARD_TONES.blue.card}`}
            >
              <CardContent className="pt-6 flex flex-col items-center text-center relative">
                
                {/* Avatar Upload Container */}
                <Controller
                  name="profile_image"
                  control={form.control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <div className="flex flex-col items-center justify-center space-y-1 mb-4">
                      <label
                        htmlFor="profile_image_input"
                        className="group relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-full border-4 border-white shadow-md bg-gray-50 transition-colors hover:bg-gray-100 overflow-hidden"
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Avatar className="h-full w-full">
                            <AvatarFallback>{me?.name?.slice(0, 2).toUpperCase() || "AC"}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Camera className="w-6 h-6" />
                        </div>

                        <input
                          {...field}
                          id="profile_image_input"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onChange(file)
                          }}
                        />
                      </label>
                    </div>
                  )}
                />

                <h2 className="text-xl font-semibold text-slate-900">{me?.name}</h2>
                <p className="text-sm text-muted-foreground">{me?.email}</p>

                <div className="flex items-center gap-2 mt-3">
                  {/* Was a "Splitwise Pro" badge. There is no plan, tier or
                      billing anywhere in the backend, so it advertised a
                      subscription that does not exist. The account id is kept. */}
                  <span className="text-xs text-muted-foreground font-mono bg-slate-100 px-2 py-1 rounded">
                    ID: #{me?.id}
                  </span>
                </div>

                <div className="w-full mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
                  <label htmlFor="profile_image_input" className="w-full">
                    <Button variant="outline" size="sm" type="button" className="w-full text-xs pointer-events-none">
                      Change Photo
                    </Button>
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    type="button" 
                    onClick={() => form.setValue("profile_image", undefined)}
                    className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </Button>

                  {/* Shadcn Alert Dialog Confirmation */}
                  <AlertDialog>
                    <AlertDialogTrigger  render={

                      <Button  
                        type="button"
                        disabled={deleteUserPending}
                        className="w-full font-semibold text-xs bg-rose-700 hover:bg-rose-800 text-white cursor-pointer disabled:opacity-50 mt-2 gap-2"
                      >
                        {deleteUserPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Deleting Account...
                          </>
                        ) : (
                          "Delete Account"
                        )}
                      </Button>
                    }/>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-rose-600 mb-1">
                          <AlertTriangle className="w-5 h-5" />
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account, settings, and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUser()}
                          className="bg-rose-700 hover:bg-rose-800 text-white"
                        >
                          Yes, delete account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <span className="text-[11px] text-muted-foreground mt-3">
                  Supported formats: JPG, PNG • Max size: 5MB
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Personal Information Inputs */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-6 space-y-6">

                {/* Section Title Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Personal Information</h3>
                    <p className="text-xs text-muted-foreground">Your name and how we reach you.</p>
                  </div>
                </div>

                {/* Full Legal Name Field */}
                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <FieldLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Full Legal Name
                      </FieldLabel>
                      <FieldContent>
                        <Input 
                          className="bg-slate-50/50" 
                          placeholder="Enter your full name" 
                          {...field} 
                        />
                      </FieldContent>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />

                {/* Email and Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <div className="flex items-center justify-between mb-1.5">
                          <FieldLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Email Address
                          </FieldLabel>
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        </div>
                        <FieldContent>
                          <Input 
                            className="bg-slate-50/50" 
                            placeholder="name@example.com" 
                            {...field} 
                          />
                        </FieldContent>
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        {/* Was a "2FA Enabled" badge here. There is no two-factor
                            auth, TOTP or OTP anywhere in the backend, so it
                            claimed a security control that does not exist. */}
                        <FieldLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                          Mobile Phone
                        </FieldLabel>
                        <FieldContent>
                          <Input 
                            className="bg-slate-50/50" 
                            placeholder="98XXXXXXXX" 
                            {...field} 
                          />
                        </FieldContent>
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </div>

              </CardContent>
            </Card>
          </div>
        </form>

        {/* Outside the profile <form>: this card has its own form element, and
            nesting forms is invalid and silently breaks submission. */}
        <SecurityCard />

        <DataExportCard />
      </div>
    </div>
  )
}