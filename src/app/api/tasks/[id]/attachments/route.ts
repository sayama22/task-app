import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let fileType: string;
    if (file.type.startsWith("image/")) fileType = "image";
    else if (file.type === "application/pdf") fileType = "pdf";
    else if (file.type.includes("spreadsheet") || file.type.includes("excel")) fileType = "excel";
    else fileType = "file";

    let blobUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(file.name, file, { access: "public" });
      blobUrl = blob.url;
    } else {
      // Fallback: base64 data URL for local dev
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      blobUrl = `data:${file.type};base64,${base64}`;
    }

    const s = await store();
    const attachment = await s.createAttachment({ taskId, fileName: file.name, fileType, blobUrl });
    return NextResponse.json(attachment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) {
      return NextResponse.json({ error: "attachmentId required" }, { status: 400 });
    }
    const s = await store();
    await s.deleteAttachment(attachmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
