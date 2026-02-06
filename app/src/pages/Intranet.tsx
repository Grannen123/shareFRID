/**
 * Intranet Page
 *
 * Internal company information and news.
 */

import { Building2, FileText, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function Intranet() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Intranät</h1>
        <p className="text-gray-500">Intern information och nyheter</p>
      </div>

      {/* Coming Soon */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-blue-500" />
              Nyheter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Interna nyheter och uppdateringar
            </p>
            <p className="text-xs text-gray-400 mt-2">Kommer snart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-green-500" />
              Händelser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Kommande möten och events</p>
            <p className="text-xs text-gray-400 mt-2">Kommer snart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-purple-500" />
              Kollegor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Kontaktinformation för teamet
            </p>
            <p className="text-xs text-gray-400 mt-2">Kommer snart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-orange-500" />
              Rutiner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Interna rutiner och policyer
            </p>
            <p className="text-xs text-gray-400 mt-2">Kommer snart</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder content */}
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Intranätet är under uppbyggnad
          </h2>
          <p className="mt-2 text-gray-500">
            Här kommer intern information, nyheter och dokument att finnas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
