import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, User } from "lucide-react";
import { useCurrentProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton, SkeletonButton } from "@/components/ui/Skeleton";

const profileSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  phone: z.string().optional(),
  title: z.string().optional(),
  default_hourly_rate: z.coerce.number().optional(),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
});

type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileFormData = z.output<typeof profileSchema>;

export function ProfileForm() {
  const { user } = useAuth();
  const {
    data: profile,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCurrentProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      notifications_enabled: false,
      email_notifications: false,
    },
  });

  const notificationsEnabled = watch("notifications_enabled");
  const emailNotifications = watch("email_notifications");

  // KRITISKT: useEffect för att synka form med laddad profil
  // Utan detta fungerar inte formuläret korrekt!
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        phone: profile.phone || "",
        title: profile.title || "",
        default_hourly_rate: profile.default_hourly_rate || undefined,
        notifications_enabled: profile.notifications_enabled ?? true,
        email_notifications: profile.email_notifications ?? true,
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-sand rounded-lg">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-3 bg-sand rounded-lg">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SkeletonButton size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Kunde inte hämta profil"
        message={error.message || "Ett fel uppstod vid hämtning av profilen."}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-sage/10 flex items-center justify-center">
              <User className="h-8 w-8 text-sage" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-charcoal">
                {profile?.name || "Laddar..."}
              </h2>
              <p className="text-ash">{user?.email}</p>
              {profile?.title && (
                <p className="text-sm text-ash">{profile.title}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Profilinställningar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" error={!!errors.name}>
                  Namn *
                </Label>
                <Input id="name" error={!!errors.name} {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-terracotta">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  placeholder="t.ex. Konsult"
                  {...register("title")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" type="tel" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_hourly_rate">
                  Standard timpris (kr)
                </Label>
                <Input
                  id="default_hourly_rate"
                  type="number"
                  step="0.01"
                  {...register("default_hourly_rate")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Aviseringar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-sand rounded-lg">
              <div>
                <Label htmlFor="notifications_enabled" className="font-medium">
                  Aviseringar i appen
                </Label>
                <p className="text-xs text-ash">
                  Visa aviseringar om nya uppgifter och händelser
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) =>
                  setValue("notifications_enabled", checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-sand rounded-lg">
              <div>
                <Label htmlFor="email_notifications" className="font-medium">
                  E-postaviseringar
                </Label>
                <p className="text-xs text-ash">
                  Skicka e-post vid viktiga händelser
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) =>
                  setValue("email_notifications", checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateProfile.isPending ? "Sparar..." : "Spara ändringar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
