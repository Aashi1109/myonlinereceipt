import { ResetPasswordForm } from "./ResetPasswordForm";
import { ProductHeader } from "@smarttools/ui";
import { resolveConfiguredReturnTo } from "../_lib/security";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const returnTo = resolveConfiguredReturnTo(first(params.returnTo));

  return (
    <>
      <ProductHeader href="/" name="SmartTools" />
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-background px-4 py-12 sm:px-6">
        <ResetPasswordForm returnTo={returnTo} token={first(params.token)} />
      </main>
    </>
  );
}
