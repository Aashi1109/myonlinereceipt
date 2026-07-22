"use server";

import {
  archiveInvoiceTemplate,
  assignUserRoles,
  createCustomRole,
  createInvoiceTemplate,
  deleteCustomRole,
  duplicateInvoiceTemplate,
  importInvoiceTemplate,
  publishInvoiceTemplate,
  reorderManagedTools,
  setDefaultInvoiceTemplate,
  setFeatureEnabled,
  setManagedToolArchived,
  setManagedToolEnabled,
  setUserStatus,
  updateAndPublishInvoiceTemplate,
  updateCustomRole,
  updateFeature,
  updateInvoiceTemplate,
  updateManagedTool,
  type InvoiceTemplateContent,
} from "../lib/adminMutations";
import { featureManifest } from "@smarttools/control-plane";
import {
  getDefaultTemplateConfigByFamily,
  type LayoutFamily,
  type TemplateCategory,
} from "@smarttools/invoice-templates";
import type { ToolApp } from "@smarttools/tool-catalog";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActorUserId } from "../lib/access";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function json<T>(formData: FormData, key: string, label: string, maxLength: number): T {
  const value = text(formData, key);
  if (value.length > maxLength) throw new Error(`${label} is too large.`);
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

export async function updateToolAction(formData: FormData) {
  const actor = await getActorUserId();
  const slug = text(formData, "slug");
  await updateManagedTool(actor, text(formData, "toolId"), {
    ...(formData.has("slug") ? { slug: slug || null } : {}),
    name: text(formData, "name"),
    description: text(formData, "description"),
  });
  revalidatePath("/tools");
}

export async function reorderToolsAction(app: ToolApp, toolIds: string[]) {
  await reorderManagedTools(await getActorUserId(), app, toolIds);
  revalidatePath("/tools");
}

export async function toggleToolAction(formData: FormData) {
  await setManagedToolEnabled(
    await getActorUserId(),
    text(formData, "toolId"),
    text(formData, "enabled") === "true",
  );
  revalidatePath("/tools");
}

export async function archiveToolAction(formData: FormData) {
  await setManagedToolArchived(
    await getActorUserId(),
    text(formData, "toolId"),
    text(formData, "archived") === "true",
  );
  revalidatePath("/tools");
}

export async function updateFeatureAction(formData: FormData) {
  await updateFeature(
    await getActorUserId(),
    text(formData, "app") as "paperwork" | "devtools",
    text(formData, "key"),
    { name: text(formData, "name"), description: text(formData, "description") },
    featureManifest,
  );
  revalidatePath("/features");
}

export async function toggleFeatureAction(formData: FormData) {
  await setFeatureEnabled(
    await getActorUserId(),
    text(formData, "app") as "paperwork" | "devtools",
    text(formData, "key"),
    text(formData, "enabled") === "true",
    featureManifest,
  );
  revalidatePath("/features");
}

export async function assignRolesAction(formData: FormData) {
  await assignUserRoles(
    await getActorUserId(),
    text(formData, "userId"),
    formData.getAll("roles").map(String),
  );
  revalidatePath("/users");
}

export async function setUserStatusAction(formData: FormData) {
  await setUserStatus(
    await getActorUserId(),
    text(formData, "userId"),
    text(formData, "status") as "active" | "suspended",
  );
  revalidatePath("/users");
}

export async function createRoleAction(formData: FormData) {
  const role = await createCustomRole(await getActorUserId(), {
    name: text(formData, "name"),
    description: text(formData, "description"),
  });
  redirect(`/roles/${role.id}`);
}

export async function updateRoleAction(formData: FormData) {
  const access: Record<string, Record<string, boolean>> = {};
  for (const [key] of formData) {
    if (!key.startsWith("permission:")) continue;
    const [, resource, action] = key.split(":");
    (access[resource] ??= {})[action] = true;
  }
  await updateCustomRole(
    await getActorUserId(),
    text(formData, "roleId"),
    {
      name: text(formData, "name"),
      description: text(formData, "description"),
      access,
    },
  );
  revalidatePath("/roles");
  revalidatePath(`/roles/${text(formData, "roleId")}`);
}

export async function deleteRoleAction(formData: FormData) {
  await deleteCustomRole(await getActorUserId(), text(formData, "roleId"));
  redirect("/roles");
}

export async function createTemplateAction(formData: FormData) {
  const layoutFamily = text(formData, "layoutFamily") as LayoutFamily;
  const template = await createInvoiceTemplate(await getActorUserId(), {
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    category: text(formData, "category") as TemplateCategory,
    layoutFamily,
    config: getDefaultTemplateConfigByFamily(layoutFamily),
  });
  redirect(`/templates/${template.id}`);
}

export async function duplicateTemplateAction(formData: FormData) {
  const template = await duplicateInvoiceTemplate(
    await getActorUserId(),
    text(formData, "templateId"),
    { name: text(formData, "name"), slug: text(formData, "slug") },
  );
  redirect(`/templates/${template.id}`);
}

export async function importTemplateAction(formData: FormData) {
  const template = await importInvoiceTemplate(
    await getActorUserId(),
    json(formData, "template", "Template JSON", 500_000),
  );
  redirect(`/templates/${template.id}`);
}

export async function updateTemplateAction(formData: FormData) {
  const templateId = text(formData, "templateId");
  await updateInvoiceTemplate(
    await getActorUserId(),
    templateId,
    json<Partial<InvoiceTemplateContent>>(formData, "template", "Template changes", 200_000),
  );
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
}

export async function updateAndPublishTemplateAction(formData: FormData) {
  const templateId = text(formData, "templateId");
  await updateAndPublishInvoiceTemplate(
    await getActorUserId(),
    templateId,
    json<Partial<InvoiceTemplateContent>>(formData, "template", "Template changes", 200_000),
  );
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  redirect("/templates");
}

async function templateStateAction(
  formData: FormData,
  operation: (actor: string, id: string) => Promise<unknown>,
) {
  await operation(await getActorUserId(), text(formData, "templateId"));
  revalidatePath("/templates");
}

export async function publishTemplateAction(formData: FormData) {
  return templateStateAction(formData, publishInvoiceTemplate);
}

export async function archiveTemplateAction(formData: FormData) {
  return templateStateAction(formData, archiveInvoiceTemplate);
}

export async function defaultTemplateAction(formData: FormData) {
  return templateStateAction(formData, setDefaultInvoiceTemplate);
}
