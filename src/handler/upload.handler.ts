import type { Context } from 'hono';
import type { UploadRequest, UploadResponse } from '../types/api.js';
import { fileService } from '../services/document/document-service.js';
import { prisma } from '../core/database.js';


async function upload(c: Context<{}, '/upload', { out: { form: UploadRequest; }; }>) {
  try {
    const { name, cv, projectReport } = c.req.valid('form') as UploadRequest;


    const cvValidation = fileService.validateFile(cv);
    const projectValidation = fileService.validateFile(projectReport);

    if (!cvValidation.isValid || !projectValidation.isValid) {
      return c.json({
        error: 'File validation failed',
        cvError: cvValidation.error,
        projectError: projectValidation.error
      }, 400);
    }


    const [cvFileInfo, projectFileInfo] = await Promise.all([
      fileService.saveFile(cv, name, 'cv'),
      fileService.saveFile(projectReport, name, 'projectReport')
    ]);


    const [cvDocument, projectDocument] = await Promise.all([
      prisma.document.create({
        data: {
          author: name,
          type: 'CV',
          fileName: cvFileInfo.fileName,
          filePath: cvFileInfo.filePath,
          fileSize: cv.size,
          mimeType: cv.type,
        }
      }),
      prisma.document.create({
        data: {
          author: name,
          type: 'PROJECT_REPORT',
          fileName: projectFileInfo.fileName,
          filePath: projectFileInfo.filePath,
          fileSize: projectReport.size,
          mimeType: projectReport.type,
        }
      })
    ]);

    const response: UploadResponse = {
      author: name,
      cvDocumentId: cvDocument.id,
      projectDocumentId: projectDocument.id,
      message: 'Files uploaded successfully. Use these IDs to call /evaluate.'
    };

    return c.json(response, 200);

  } catch (error: any) {
    console.error('Upload failed:', error);
    return c.json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
}



export const uploadHandler = {
  upload
};

