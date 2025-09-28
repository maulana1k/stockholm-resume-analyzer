import fs from 'fs/promises';
import path from 'path';
import { config } from '@/core/config.js';


const uploadDir = config.UPLOAD_DIR;


function validateFile(file: File, maxSize: number = config.MAX_FILE_SIZE): { isValid: boolean; error?: string; } {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (!allowedTypes.some(t => file.type.startsWith(t))) {
    return {
      isValid: false,
      error: `File type ${file.type} not supported. Please upload PDF, DOCX, or TXT files.`
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty'
    };
  }

  return { isValid: true };
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfString = buffer.toString('binary');

    const textMatches = pdfString.match(/\(([^)]+)\)/g) || pdfString.match(/BT[\s\S]*?ET/g) || [];

    let extractedText = '';

    for (const match of textMatches) {
      let text = match;

      text = text.replace(/^\(|\)$/g, '').replace(/BT|ET/g, '');

      text = text.replace(/\\(\d{1,3})/g, (match, charCode) => {
        return String.fromCharCode(parseInt(charCode, 8));
      });

      text = text.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

      if (text.trim().length > 2) {
        extractedText += text + ' ';
      }
    }

    if (extractedText.length < 100) {
      const utf8Text = buffer.toString('utf8');
      const words = utf8Text.match(/\b[a-zA-Z]{3,}\b/g) || [];
      if (words.length > 10) {
        extractedText = words.slice(0, 200).join(' ');
      }
    }

    return extractedText.trim() || '[PDF content extracted but no readable text found]';

  } catch (error: any) {
    console.error('PDF extraction failed:', error);
    return '[Error processing PDF file]';
  }
}


async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {

    const docxString = buffer.toString('binary');


    const textMatches = docxString.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
      || docxString.match(/<text[^>]*>([^<]+)<\/text>/g)
      || docxString.match(/>([a-zA-Z][^<>{}\[\]]{2,})</g)
      || [];

    let extractedText = '';

    for (const match of textMatches) {

      const text = match.replace(/<[^>]*>/g, '').trim();
      if (text.length > 2 && /[a-zA-Z]/.test(text)) {
        extractedText += text + ' ';
      }
    }


    if (extractedText.length < 100) {
      const utf8Text = buffer.toString('utf8');
      const words = utf8Text.match(/\b[a-zA-Z]{3,}\b/g) || [];
      if (words.length > 10) {
        extractedText = words.slice(0, 200).join(' ');
      }
    }

    return extractedText.trim() || '[DOCX content extracted but no readable text found]';

  } catch (error: any) {
    console.error('DOCX extraction failed:', error);
    return '[Error processing DOCX file]';
  }
}


async function extractText(file: File, filePath?: string): Promise<string> {
  try {
    let buffer: Buffer;

    if (filePath) {
      buffer = await fs.readFile(filePath);
    } else {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    let extractedText: string;

    switch (file.type) {
      case 'application/pdf':
        extractedText = await extractTextFromPDF(buffer);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extractedText = await extractTextFromDOCX(buffer);
        break;

      case 'text/plain':
        extractedText = await file.text();
        break;

      default:

        extractedText = buffer.toString('utf8');
        if (extractedText.length < 50 || !/[a-zA-Z]{3,}/.test(extractedText)) {
          extractedText = `[Unsupported file type: ${file.type}]`;
        }
        break;
    }


    return cleanExtractedText(extractedText);

  } catch (error: any) {
    console.error('Text extraction failed:', error);
    return `[Error extracting text: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}


function cleanExtractedText(text: string): string {
  if (!text || text.trim().length === 0) {
    return '[No text content found]';
  }


  const MAX_TEXT_LENGTH = 50000;
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.substring(0, MAX_TEXT_LENGTH) + '\n... [content truncated]';
  }


  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}


async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
}


async function saveFile(file: File, author: string, type: 'cv' | 'projectReport'): Promise<{ filePath: string; fileName: string; }> {
  await ensureUploadDir();

  const safeAuthor = author.replace(/[^a-zA-Z0-9.-]/g, '-');
  const extension = path.extname(file.name) || getDefaultExtension(file.type);
  const timestamp = Date.now();
  const fileName = `${safeAuthor}-${type}-${timestamp}${extension}`;
  const filePath = path.join(uploadDir, fileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(filePath, buffer);

  return { filePath, fileName };
}


function getDefaultExtension(mimeType: string): string {
  const extensions: { [key: string]: string; } = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt'
  };

  return extensions[mimeType] || '.bin';
}


export const fileService = {
  validateFile,
  extractText,
  saveFile,
};