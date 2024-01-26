/*
 * Copyright 2024 Simon Emms <simon@simonemms.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Cookies from 'cookies';
import { NextFunction, RequestHandler, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { ICookieSessionOpts, RequestSession } from 'interfaces';
import { randomUUID } from 'node:crypto';

export class CookieSession {
  private readonly cookies: Cookies;

  // Session data is stored here
  public data: Record<string, unknown>;

  public readonly sessionId: string;

  constructor(
    private opts: ICookieSessionOpts,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    this.applyDefaultOpts();
    this.validate();
    this.sessionId = randomUUID();

    this.cookies = new Cookies(req, res);

    this.data = {};
  }

  private applyDefaultOpts(): void {
    this.opts.cookie = this.opts.cookie ?? {};
    this.opts = {
      ...this.opts,
      duration: this.opts.duration ?? 24 * 60 * 60 * 1000,
      flash: this.opts.flash ?? false,
      name: this.opts.name ?? 'session',
      cookie: {
        ...this.opts.cookie,
        path: this.opts.cookie.path ?? '/',
      },
    };
  }

  private validate(): void {
    if (!this.opts.secret || this.opts.secret.length < 16) {
      throw new Error('Secret must be at least 16 characters long');
    }
  }

  static express(opts: ICookieSessionOpts): RequestHandler {
    return async (req: RequestSession, res: Response, next: NextFunction) => {
      if (req.session) {
        next(new Error('Cannot redeclare session'));
        return;
      }

      const cookieSession = new CookieSession(opts, req, res);

      req.sessionID = cookieSession.sessionId; // Not really used here, but provides backwards compatibility with express-session
      req.session = cookieSession.data;
      req.session.id = cookieSession.sessionId;

      next();
    };
  }
}
