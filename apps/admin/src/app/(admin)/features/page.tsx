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
import { requirePagePermission } from "../../../lib/access";
import { toggleFeatureAction, updateFeatureAction } from "../../actions";

export default async function FeaturesPage() {
  await requirePagePermission("features", "view");
  const features = await getFeatures(featureManifest);

  return (
    <>
      <ToolPageHeader
        description="Global per-application overrides. New code registrations start disabled."
        title="Feature flags"
      />
      {features.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {features.map((feature) => (
            <Card className="space-y-6" key={`${feature.app}:${feature.key}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {feature.name}
                </h2>
                <StatusBadge variant={feature.enabled ? "success" : "neutral"}>
                  {feature.enabled ? "Enabled" : "Disabled"}
                </StatusBadge>
              </div>
              <code className="block break-all font-mono text-xs text-muted-foreground">
                {feature.app}:{feature.key}
              </code>
              <form action={updateFeatureAction} className="grid gap-4">
                <input name="app" type="hidden" value={feature.app} />
                <input name="key" type="hidden" value={feature.key} />
                <Field
                  htmlFor={`${feature.app}-${feature.key}-name`}
                  label="Name"
                  required
                >
                  <Input
                    defaultValue={feature.name}
                    id={`${feature.app}-${feature.key}-name`}
                    name="name"
                    required
                  />
                </Field>
                <Field
                  htmlFor={`${feature.app}-${feature.key}-description`}
                  label="Description"
                  required
                >
                  <Textarea
                    defaultValue={feature.description}
                    id={`${feature.app}-${feature.key}-description`}
                    name="description"
                    required
                  />
                </Field>
                <Button className="justify-self-start" type="submit">
                  Save metadata
                </Button>
              </form>
              <form action={toggleFeatureAction}>
                <input name="app" type="hidden" value={feature.app} />
                <input name="key" type="hidden" value={feature.key} />
                <input name="enabled" type="hidden" value={String(!feature.enabled)} />
                <Button type="submit" variant="secondary">
                  {feature.enabled ? "Disable" : "Enable"}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Feature controls appear here after their keys are registered in code."
          title="No feature keys registered"
        />
      )}
    </>
  );
}
