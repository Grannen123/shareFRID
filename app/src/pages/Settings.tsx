/**
 * Settings Page
 *
 * User and application settings.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  User,
  Bell,
  Palette,
  Shield,
  Database,
  Mail,
  Save,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Checkbox,
} from "@/components/ui";
import { useAuth } from "@/contexts";

export function Settings() {
  const { user, isDevMode } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    desktop: true,
    deadlines: true,
    weeklyReport: false,
  });

  const handleSave = () => {
    toast.success("Inställningar sparade!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Inställningar
          </h1>
          <p className="text-gray-500">Hantera ditt konto och preferenser</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Spara ändringar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn</Label>
              <Input id="name" defaultValue={user?.name || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email || ""}
                disabled
              />
              <p className="text-xs text-gray-400">
                E-post hanteras via Microsoft-konto
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Roll</Label>
              <Input
                id="role"
                defaultValue={user?.role || "Konsult"}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikationer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">E-postnotifikationer</p>
                <p className="text-sm text-gray-500">
                  Få uppdateringar via e-post
                </p>
              </div>
              <Checkbox
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: !!checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Skrivbordsnotifikationer</p>
                <p className="text-sm text-gray-500">
                  Visa notifikationer i webbläsaren
                </p>
              </div>
              <Checkbox
                checked={notifications.desktop}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, desktop: !!checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Deadline-påminnelser</p>
                <p className="text-sm text-gray-500">
                  Påminnelser för deadlines
                </p>
              </div>
              <Checkbox
                checked={notifications.deadlines}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, deadlines: !!checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Veckorapport</p>
                <p className="text-sm text-gray-500">
                  Sammanfattning varje fredag
                </p>
              </div>
              <Checkbox
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    weeklyReport: !!checked,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Utseende
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6 text-center">
            <Palette className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Tema-inställningar kommer snart
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Säkerhet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Microsoft SSO</p>
                <p className="text-sm text-gray-500">
                  {isDevMode ? "Dev-läge aktivt" : "Ansluten via Microsoft"}
                </p>
              </div>
              <span className="text-sm text-green-600">Aktiv</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tvåfaktorsautentisering</p>
                <p className="text-sm text-gray-500">Hanteras via Microsoft</p>
              </div>
              <span className="text-sm text-gray-400">Via Azure AD</span>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Integrationer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Microsoft 365</p>
                <p className="text-sm text-gray-500">E-post, kalender, filer</p>
              </div>
              <span className="text-sm text-green-600">Ansluten</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SharePoint</p>
                <p className="text-sm text-gray-500">Dokumentlagring</p>
              </div>
              <span className="text-sm text-green-600">Ansluten</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Fortnox</p>
                <p className="text-sm text-gray-500">Fakturering</p>
              </div>
              <span className="text-sm text-gray-400">Kommer snart</span>
            </div>
          </CardContent>
        </Card>

        {/* Email Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-postsignatur
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6 text-center">
            <Mail className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Signaturhantering kommer snart
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
