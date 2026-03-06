// POST /api/soul/preview - Render markdown to HTML
import { NextRequest, NextResponse } from "next/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Note: In a real Next.js App Router setup, we'd use a server component
    // or a different markdown rendering approach. For now, return the content
    // as-is and let the client handle rendering with react-markdown.
    return NextResponse.json({
      html: content, // Client will render this
      requiresClientRendering: true,
    });
  } catch (error: any) {
    console.error("Failed to preview markdown:", error);
    return NextResponse.json(
      { error: error.message || "Failed to preview" },
      { status: 500 }
    );
  }
}
