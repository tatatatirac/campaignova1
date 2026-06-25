import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Server,
  ShieldCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import { PLAN_LIMITS, type PlanName } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin"
};

type AuditLog = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  severity: "info" | "warning" | "error" | "critical";
  metadata: Record<string, unknown>;
  created_at: string;
};

type PlanRow = {
  id: string;
  company_id: string;
  owner_id: string;
  month: string;
  status: string;
  calendar_status: string;
  posts_status: string;
  emails_status: string;
  landing_page_status: string;
  sales_pitch_status: string;
  kpis_status: string;
  updated_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .replaceAll(".", " / ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function failedStage(plan: PlanRow) {
  const stages = [
    ["Strategy", plan.status],
    ["Calendar", plan.calendar_status],
    ["Posts", plan.posts_status],
    ["Emails", plan.emails_status],
    ["Landing page", plan.landing_page_status],
    ["Sales pitch", plan.sales_pitch_status],
    ["Execution review", plan.kpis_status]
  ];

  return stages
    .filter(([, status]) => status === "failed")
    .map(([name]) => name)
    .join(", ");
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;

  if (!ownerId) {
    redirect("/login");
  }

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("full_name,app_role")
    .eq("id", ownerId)
    .single();

  if (ownProfile?.app_role !== "admin") {
    redirect("/app");
  }

  const admin = createAdminClient();
  const periodStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const databaseStartedAt = performance.now();
  const [
    usersResult,
    profilesResult,
    companiesResult,
    plansResult,
    usageResult,
    reservationsResult,
    auditsResult
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin
      .from("profiles")
      .select(
        "id,full_name,subscription_plan,app_role,is_beta_user,created_at"
      )
      .order("created_at", { ascending: false }),
    admin.from("companies").select("id", { count: "exact", head: true }),
    admin
      .from("marketing_plans")
      .select(
        "id,company_id,owner_id,month,status,calendar_status,posts_status,emails_status,landing_page_status,sales_pitch_status,kpis_status,updated_at"
      )
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false }),
    admin
      .from("ai_usage_monthly")
      .select("owner_id,requests_used,regenerations_used")
      .eq("period_start", periodStart),
    admin
      .from("ai_request_reservations")
      .select("status,created_at")
      .gte("created_at", sevenDaysAgo),
    admin
      .from("audit_logs")
      .select(
        "id,actor_id,action,entity_type,entity_id,severity,metadata,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(40)
  ]);
  const databaseLatencyMs = Math.round(performance.now() - databaseStartedAt);
  const users = usersResult.data.users;
  const profiles = profilesResult.data ?? [];
  const plans = (plansResult.data ?? []) as PlanRow[];
  const usage = usageResult.data ?? [];
  const reservations = reservationsResult.data ?? [];
  const audits = (auditsResult.data ?? []) as AuditLog[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const emailById = new Map(users.map((user) => [user.id, user.email ?? ""]));
  const failedPlans = plans.filter((plan) => failedStage(plan));
  const requestsUsed = usage.reduce(
    (total, row) => total + row.requests_used,
    0
  );
  const requestCapacity = profiles.reduce((total, profile) => {
    const plan =
      profile.subscription_plan in PLAN_LIMITS
        ? (profile.subscription_plan as PlanName)
        : "starter";

    return total + PLAN_LIMITS[plan].aiRequests;
  }, 0);
  const succeededRequests = reservations.filter(
    (reservation) => reservation.status === "succeeded"
  ).length;
  const releasedRequests = reservations.filter(
    (reservation) => reservation.status === "released"
  ).length;
  const requestSuccessRate =
    succeededRequests + releasedRequests > 0
      ? Math.round(
          (succeededRequests / (succeededRequests + releasedRequests)) * 100
        )
      : 100;
  const systemHealthy =
    !profilesResult.error &&
    !companiesResult.error &&
    !plansResult.error &&
    !usageResult.error &&
    !reservationsResult.error &&
    !auditsResult.error;

  const cards = [
    {
      label: "Users",
      value: users.length,
      detail: `${profiles.filter((profile) => profile.is_beta_user).length} beta users`,
      icon: Users,
      color: "!bg-[#d9ff43]"
    },
    {
      label: "Companies",
      value: companiesResult.count ?? 0,
      detail: "Business Memory records",
      icon: Building2,
      color: "!bg-white"
    },
    {
      label: "AI actions",
      value: requestsUsed,
      detail: `${requestCapacity} monthly capacity`,
      icon: Bot,
      color: "!bg-[#695cff] text-white"
    },
    {
      label: "7-day success",
      value: `${requestSuccessRate}%`,
      detail: `${releasedRequests} released reservations`,
      icon: Gauge,
      color: "!bg-[#171817] text-white"
    }
  ];

  return (
    <main className="min-h-screen bg-[#f4f2ec]">
      <header className="border-b border-black/10 bg-[#faf8f3]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-5">
            <BrandMark />
            <span className="hidden rounded-full bg-[#171817] px-3 py-1.5 text-[10px] font-black tracking-wider text-white uppercase sm:block">
              Admin control room
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="button-secondary !min-h-10 !px-3 !text-xs whitespace-nowrap sm:!px-4"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <form action={signOut}>
              <button className="button-primary !min-h-10 !px-3 !text-xs whitespace-nowrap sm:!px-4">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Campaignova operations</p>
            <h1 className="display mt-4 text-5xl leading-none sm:text-6xl">
              System health and control.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#666b64]">
              Product usage, AI cost exposure, failed generation stages and
              security-relevant activity in one place.
            </p>
          </div>
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              systemHealthy
                ? "border-emerald-500/20 bg-emerald-50 text-emerald-800"
                : "border-red-500/20 bg-red-50 text-red-800"
            }`}
          >
            {systemHealthy ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}
            <div>
              <p className="text-xs font-black">
                {systemHealthy ? "All core systems operational" : "System degraded"}
              </p>
              <p className="mt-1 text-[10px] opacity-70">
                Database response: {databaseLatencyMs} ms
              </p>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, detail, icon: Icon, color }) => (
            <article key={label} className={`card p-5 ${color}`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black tracking-wider uppercase opacity-60">
                  {label}
                </p>
                <Icon size={18} />
              </div>
              <p className="display mt-7 text-5xl">{value}</p>
              <p className="mt-3 text-xs font-bold opacity-65">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <article className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  User and plan control
                </p>
                <h2 className="mt-1 text-xl font-black">Accounts</h2>
              </div>
              <ShieldCheck size={20} className="text-[#695cff]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead className="bg-[#efede6] text-[10px] font-black tracking-wide text-[#666b64] uppercase">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">AI usage</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.slice(0, 20).map((profile) => {
                    const plan =
                      profile.subscription_plan in PLAN_LIMITS
                        ? (profile.subscription_plan as PlanName)
                        : "starter";
                    const userUsage = usage.find(
                      (row) => row.owner_id === profile.id
                    );

                    return (
                      <tr key={profile.id} className="border-t border-black/7">
                        <td className="px-5 py-4">
                          <p className="text-xs font-black">
                            {profile.full_name || "Unnamed user"}
                          </p>
                          <p className="mt-1 text-[10px] text-[#777c75]">
                            {emailById.get(profile.id) || profile.id}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold capitalize">
                          {plan}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                              profile.app_role === "admin"
                                ? "bg-[#695cff] text-white"
                                : "bg-[#efede6]"
                            }`}
                          >
                            {profile.app_role}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-black">
                          {userUsage?.requests_used ?? 0}/
                          {PLAN_LIMITS[plan].aiRequests}
                        </td>
                        <td className="px-4 py-4 text-[10px] text-[#777c75]">
                          {formatDate(profile.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  Monitoring
                </p>
                <h2 className="mt-1 text-xl font-black">Core services</h2>
              </div>
              <Activity size={20} className="text-[#695cff]" />
            </div>
            <div className="mt-6 grid gap-3">
              {[
                ["Application", true, "Next.js production surface", Server],
                ["Database", !profilesResult.error, `${databaseLatencyMs} ms`, Database],
                ["OpenAI", Boolean(process.env.OPENAI_API_KEY), "Server key configured", Bot],
                [
                  "Failed plans",
                  failedPlans.length === 0,
                  `${failedPlans.length} in the last 7 days`,
                  AlertTriangle
                ]
              ].map(([label, healthy, detail, Icon]) => {
                const ServiceIcon = Icon as typeof Server;
                return (
                  <div
                    key={label as string}
                    className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-[#efede6]">
                      <ServiceIcon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black">{label as string}</p>
                      <p className="mt-1 text-[10px] text-[#777c75]">
                        {detail as string}
                      </p>
                    </div>
                    <span
                      className={`size-2.5 rounded-full ${
                        healthy ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-2xl bg-[#171817] p-4 text-white">
              <div className="flex items-center gap-2 text-[#d9ff43]">
                <Clock3 size={15} />
                <p className="text-[10px] font-black tracking-wider uppercase">
                  AI reservation health
                </p>
              </div>
              <p className="display mt-4 text-4xl">{requestSuccessRate}%</p>
              <p className="mt-2 text-xs leading-5 text-white/55">
                {succeededRequests} successful and {releasedRequests} safely
                released requests during the last seven days.
              </p>
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <article className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  Exceptions
                </p>
                <h2 className="mt-1 text-xl font-black">Failed plans</h2>
              </div>
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div className="mt-5 grid gap-3">
              {failedPlans.slice(0, 8).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-red-500/15 bg-red-50 p-4"
                >
                  <p className="text-xs font-black text-red-900">
                    {failedStage(plan)}
                  </p>
                  <p className="mt-2 text-[10px] text-red-800/65">
                    Plan {plan.id.slice(0, 8)} / {plan.month}
                  </p>
                  <p className="mt-1 text-[10px] text-red-800/65">
                    Updated {formatDate(plan.updated_at)}
                  </p>
                </div>
              ))}
              {failedPlans.length === 0 && (
                <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
                  No failed campaign stages in the last seven days.
                </div>
              )}
            </div>
          </article>

          <article className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  Security and operations
                </p>
                <h2 className="mt-1 text-xl font-black">Audit log</h2>
              </div>
              <Activity size={20} className="text-[#695cff]" />
            </div>
            <div className="max-h-[620px] overflow-auto">
              {audits.map((audit) => {
                const profile = audit.actor_id
                  ? profileById.get(audit.actor_id)
                  : null;
                const errorDetail =
                  typeof audit.metadata?.error === "string"
                    ? audit.metadata.error
                    : null;

                return (
                  <div
                    key={audit.id}
                    className="grid gap-2 border-t border-black/7 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start"
                  >
                    <span
                      className={`mt-0.5 size-2.5 rounded-full ${
                        audit.severity === "critical" ||
                        audit.severity === "error"
                          ? "bg-red-500"
                          : audit.severity === "warning"
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-black">
                        {titleCase(audit.action)}
                      </p>
                      <p className="mt-1 text-[10px] text-[#777c75]">
                        {profile?.full_name ||
                          (audit.actor_id
                            ? emailById.get(audit.actor_id)
                            : "System")}{" "}
                        / {audit.entity_type}
                      </p>
                      {errorDetail && (
                        <p className="mt-2 rounded-lg bg-red-50 p-2 text-[10px] leading-4 text-red-800">
                          {errorDetail}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-[#777c75] sm:text-right">
                      {formatDate(audit.created_at)}
                    </p>
                  </div>
                );
              })}
              {audits.length === 0 && (
                <p className="p-6 text-sm text-[#777c75]">
                  Audit events will appear here as the system is used.
                </p>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
