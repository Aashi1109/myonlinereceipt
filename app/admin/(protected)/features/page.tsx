import { featureManifest, getFeatures } from "@smarttools/control-plane";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  StatusBadge,
  Textarea,
  ToolPageHeader,
} from "@smarttools/ui";
import { Flag, History } from "lucide-react";
import { requirePagePermission } from "../../../../lib/admin/access";
import { toggleFeatureAction, updateFeatureAction } from "../../actions";

export default async function FeaturesPage() {
  await requirePagePermission("features", "view");
  const features = await getFeatures(featureManifest);

  const enabledCount = features.filter((feature) => feature.enabled).length;
  const appCount = new Set(features.map((feature) => feature.app)).size;

  return (
    <>
      <ToolPageHeader
        actions={
          <a
            className="inline-flex h-10 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            href="/admin/audit"
          >
            <History aria-hidden="true" className="size-4" />
            View history
          </a>
        }
        className="mb-5"
        description="Control releases per app and keep operational context current. New registrations start disabled."
        eyebrow="Release controls"
        title="Feature flags"
      />
      {features.length ? (
        <div className="space-y-5">
          <div className="grid overflow-hidden rounded-lg bg-surface-ink text-on-ink sm:grid-cols-3">
            {[
              ["Total flags", features.length],
              ["Enabled", enabledCount],
              ["Active apps", appCount],
            ].map(([label, value], index) => (
              <div
                className={`px-5 py-4 ${index ? "border-t border-white/10 sm:border-t-0 sm:border-l" : ""}`}
                key={label}
              >
                <p className="font-caption text-[10px] font-semibold tracking-[0.06em] text-on-ink-muted uppercase">{label}</p>
                <p className={`mt-1 font-mono text-xl font-semibold ${label === "Enabled" ? "text-success" : ""}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {features.map((feature) => (
              <Card className="overflow-hidden p-0" key={`${feature.app}:${feature.key}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/60 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="break-all font-mono text-xs font-semibold text-foreground">
                        {feature.key}
                      </code>
                      <StatusBadge variant={feature.enabled ? "success" : "neutral"}>
                        {feature.enabled ? "Enabled" : "Disabled"}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 font-caption text-[10px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                      {feature.app}
                    </p>
                  </div>
                  <form action={toggleFeatureAction}>
                    <input name="app" type="hidden" value={feature.app} />
                    <input name="key" type="hidden" value={feature.key} />
                    <input name="enabled" type="hidden" value={String(!feature.enabled)} />
                    <Button size="sm" type="submit" variant={feature.enabled ? "secondary" : "default"}>
                      {feature.enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                </div>
                <form action={updateFeatureAction} className="grid gap-4 p-5">
                  <input name="app" type="hidden" value={feature.app} />
                  <input name="key" type="hidden" value={feature.key} />
                  <Field htmlFor={`${feature.app}-${feature.key}-name`} label="Display name" required>
                    <Input defaultValue={feature.name} name="name" required />
                  </Field>
                  <Field htmlFor={`${feature.app}-${feature.key}-description`} label="Description" required>
                    <Textarea defaultValue={feature.description} name="description" required />
                  </Field>
                  <Button className="justify-self-end" size="sm" type="submit">
                    Save changes
                  </Button>
                </form>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          description="Register a feature key in code to manage its app-specific override and rollout state here."
          icon={<Flag aria-hidden="true" />}
          title="No feature flags yet"
        />
      )}
    </>
  );
}
