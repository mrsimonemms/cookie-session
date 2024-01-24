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
import { EventEmitter } from 'node:events';

export class CookieSession extends EventEmitter {
  private readonly cookies: Cookies;

  // Session data is stored here
  public data: Record<string, unknown>;

  public readonly sessionId: string;

  constructor(
    private opts: ICookieSessionOpts,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    super();

    this.applyDefaultOpts();
    this.validate();
    this.sessionId = randomUUID();

    this.cookies = new Cookies(req, res);

    this.data = new Proxy<Record<string, unknown>>(
      {},
      {
        get: (target, prop: string, receiver: Record<string, unknown>) =>
          this.getDataItem(target, prop, receiver),
      },
    );
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

  private getDataItem(
    target: unknown,
    prop: string,
    receiver: Record<string, unknown>,
  ): any {
    const value = target[prop];
    if (this.opts.flash) {
      delete receiver[prop];
    }

    return value;
  }

  private validate(): void {
    if (!this.opts.secret || this.opts.secret.length < 16) {
      throw new Error('Secret must be at least 16 characters long');
    }
  }

  protected async decryptData(input: string): Promise<string> {
    return input;
  }

  protected async encryptData(): Promise<string | undefined> {
    return JSON.stringify(this.data);
  }

  async loadData(): Promise<void> {
    // Get the data from the cookie
    const encData = this.cookies.get(this.opts.name, {
      signed: this.opts.cookie.signed,
    });
    if (!encData) {
      return;
    }

    // Decrypt the data
    const strData = await this.decryptData(encData);
    if (!strData) {
      return;
    }

    const cookieData = JSON.parse(strData);
    if (cookieData) {
      // Load the data
      this.data = { ...cookieData };
    }
  }

  async saveCookieData(): Promise<void> {
    this.cookies.set(
      this.opts.name,
      await this.encryptData(), // This is destructive if using flash sessions
      this.opts.cookie,
    );
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
    return async (req: RequestSession, res: Response, next: NextFunction) => {
      if (req.session) {
        throw new Error('Cannot redeclare session');
      }

      // Invoke the CookieSession class
      const cookieSession = new CookieSession(opts, req, res);

      try {
        await cookieSession.loadData();
      } catch (err) {
        next(err);
        return;
      }

      req.sessionID = cookieSession.sessionId; // Not really used here, but provides backwards compatibility with express-session
      req.session = cookieSession.data;

      const { end } = res;
      res.end = (async (
        chunk: any,
        encoding: BufferEncoding,
        cb: () => void,
      ): Promise<void> => {
        await cookieSession.saveCookieData();

        end.call(res, chunk, encoding, cb);
      }) as any;

      next();
    };
  }
}
