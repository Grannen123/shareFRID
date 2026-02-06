/**
 * Company Page (Grannfrid AB)
 *
 * Company information and administration.
 */

import { Building, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function Company() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Grannfrid AB</h1>
        <p className="text-gray-500">Företagsinformation och administration</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-500" />
              Anställda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-gray-400">Aktiva konsulter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-5 w-5 text-green-500" />
              Kunder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">24</p>
            <p className="text-xs text-gray-400">Aktiva kundförhållanden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-purple-500" />
              Avtal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">32</p>
            <p className="text-xs text-gray-400">Aktiva avtal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Omsättning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2.4M</p>
            <p className="text-xs text-gray-400">Hittills i år (SEK)</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder content */}
      <Card>
        <CardContent className="py-12 text-center">
          <Building className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Företagssidan är under uppbyggnad
          </h2>
          <p className="mt-2 text-gray-500">
            Här kommer ekonomiöversikt, personalhantering och
            företagsadministration att finnas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
