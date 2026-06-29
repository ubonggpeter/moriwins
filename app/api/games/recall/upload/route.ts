import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const filename = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (filename.endsWith('.pdf')) {
      // Import from lib path to avoid pdf-parse's test-file auto-detection triggering in Next.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const result = await pdfParse(buffer);
      text = (result.text as string)?.trim() ?? '';
    } else if (filename.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value?.trim() ?? '';
    } else {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Could not extract text from file — try a different file' }, { status: 400 });
    }

    return NextResponse.json({ text, filename: file.name });
  } catch (err) {
    console.error('[recall/upload]', err);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
