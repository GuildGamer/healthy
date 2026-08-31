import { All, Controller, Req, Res } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { toNodeHandler } from 'better-auth/node';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { adminAuth } from './admin-auth.js';

const handleAdminAuth = toNodeHandler(adminAuth);

@Controller()
@Public()
export class AdminAuthController {
  @All('admin/auth/*path')
  async handle(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ): Promise<void> {
    await handleAdminAuth(request, response);
  }
}
