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
import { ICookieSessionOpts, RequestSession } from 'interfaces';
import { EventEmitter } from 'node:events';



export class CookieSession extends EventEmitter {
  constructor(private opts: ICookieSessionOpts) {
    super();

    this.applyDefaultOpts();
    this.validate();
  }

  private applyDefaultOpts(): void {
    this.opts.cookie = this.opts.cookie ?? {};
    this.opts = {
      ...this.opts,
      duration: this.opts.duration ?? 24 * 60 * 60 * 1000,
      flash: this.opts.flash ?? false,
      name: this.opts.name ?? 'session',
      cookie: {
        // @todo(sje): these might not be correct
        path: this.opts.cookie.path ?? '/',
      },
    };
  }

  private validate(): void {
    if (!this.opts.secret || this.opts.secret.length < 16) {
      throw new Error('Secret must be at least 16 characters long');
    }
  }

  /**
   * express
   *
   * Middleware function for express
   *
   * @param opts ICookieSessionOpts
   * @returns RequestHandler
   */
  static express(opts: ICookieSessionOpts): RequestHandler {
    const cookieSession = new CookieSession(opts);

    return function (req: RequestSession, res: Response, next: NextFunction) {
      const cookies = new Cookies(req, res);

      cookieSession.on('update', () => {});
      console.log(cookies.get(cookieSession.opts.name));

      if (req.session) {
        throw new Error('Cannot redeclare session');
      }

      // cookies.set(cookieSession.opts.name);
      // cookies.set(cookieSession.opts.name, `hello-${id}`);

      next();
    };
  }
}
