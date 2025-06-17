/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// TypeScript types for Cloudflare Incidents API (thanks claude!)
import Table from "cli-table3";
import { capitalizeFirstLetter } from "./misc.js";
import { Ora } from "ora";
import inquirer from "inquirer/dist/esm";
import chalk from "chalk";

interface CloudflarePage {
  id: string;
  name: string;
  url: string;
  time_zone: string;
  updated_at: string;
}

interface AffectedComponent {
  code: string;
  name: string;
  old_status: string;
  new_status: string;
}

interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  body: string;
  incident_id: string;
  created_at: string;
  updated_at: string;
  display_at: string;
  affected_components: AffectedComponent[];
  deliver_notifications: boolean;
  custom_tweet: string | null;
  tweet_id: string | null;
}

interface IncidentComponent {
  id: string;
  name: string;
  status: ComponentStatus;
  created_at: string;
  updated_at: string;
  position: number;
  description: string | null;
  showcase: boolean;
  start_date: string;
  group_id: string;
  page_id: string;
  group: boolean;
  only_show_if_degraded: boolean;
}

interface CloudflareIncident {
  id: string;
  name: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  monitoring_at: string | null;
  resolved_at: string | null;
  impact: IncidentImpact;
  shortlink: string;
  started_at: string;
  page_id: string;
  incident_updates: IncidentUpdate[];
  components: IncidentComponent[];
  reminder_intervals: any;
}

interface CloudflareIncidentsResponse {
  page: CloudflarePage;
  incidents: CloudflareIncident[];
}

// Union types for better type safety
type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved"
  | "postmortem";
type IncidentImpact = "minor" | "major" | "critical" | "none";
type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "under_maintenance"
  | "major_outage";

export const CloudflareComponentsThatMayAffectCDN: string[] = [
  "5wnz34mhfhrk",
  "fbvx0hxhhdj0",
  "3q1jnbdbn845",
  "hb7g5sq2zz0h",
  // "m1cm5tqpkqtm", magic firewall for testing
];

export async function getCfStatus(idsToCheck: string[]) {
  const response = await fetch(
    "https://www.cloudflarestatus.com/api/v2/incidents/unresolved.json",
  );
  const json: CloudflareIncidentsResponse = await response.json();

  return json.incidents
    .filter((incident) =>
      incident.components.some((component) =>
        idsToCheck.includes(component.id),
      ),
    )
    .map((incident) => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      impact: incident.impact,
      started_at: incident.started_at,
      affected_components: incident.components.map((c) => c.name),
    }));
}

export async function prettyCloudflareStatusTable(componentsToCheck: string[]) {
  const incidents = await getCfStatus(componentsToCheck);

  const incidentTable = new Table({
    head: ["Incident Name", "Status", "Impact", "Since", "Components Affected"],
    // colWidths: [60, 15],
    style: { head: ["cyan"], border: ["white"] },
  });

  incidents.map((incident) => {
    incidentTable.push([
      incident.name,
      capitalizeFirstLetter(incident.status),
      capitalizeFirstLetter(incident.impact),
      new Date(incident.started_at).toLocaleString(),
      incident.affected_components.map((component) => component).join("\n"),
    ]);
  });

  return {
    impactingComponents: incidents.length >= 1,
    incidentTable: incidentTable,
    incidentTableString: incidentTable.toString(),
  };
}

export async function askToCheckForIssues(spinner: Ora) {
  const askCheckCloudflareStatus = await inquirer.prompt([
    {
      type: "confirm",
      name: "checkStatus",
      message: `Since there were errors, do you want to check Cloudflare status for incidents?`,
      default: true,
    },
  ]);

  if (askCheckCloudflareStatus.checkStatus) {
    spinner.start("Querying the Cloudflare status API");
    const table = await prettyCloudflareStatusTable(
      CloudflareComponentsThatMayAffectCDN,
    );
    spinner.succeed();
    if (table.impactingComponents) {
      console.log(
        chalk.ansi256(202)(
          "\n\nThe following active Cloudflare incidents may be affecting this job:",
        ),
      );
      console.log(table.incidentTableString);
      console.log("\n\n");
    } else {
      console.log(
        chalk.greenBright(
          "\n\nIt looks like the components required for the CDN are operational.",
        ),
      );
      console.log(
        "Please check the job again, since the errors are not on Cloudflare's side.\n\n",
      );
    }
  }
}
