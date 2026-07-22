import {
  getAvailableToolBySlug,
  getPublishedTemplates,
} from "@smarttools/control-plane";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (
      !(await getAvailableToolBySlug("paperwork", "invoice-generator"))
    ) {
      return NextResponse.json({ error: "Tool not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      templates: await getPublishedTemplates(),
    });
  } catch (error) {
    console.error("Failed to fetch published invoice templates", error);
    return NextResponse.json(
      { error: "Templates are temporarily unavailable." },
      { status: 500 },
    );
  }
}
