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
import { debug as debugLib } from 'debug';
import { NextFunction, RequestHandler, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { ICookieSessionOpts, RequestSession, callback } from 'interfaces';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
export { ICookieSessionOpts, RequestSession } from 'interfaces';

const debug = debugLib('cookie-session');

const callbackify = async (
  fn: () => Promise<void> | void,
  cb?: callback,
): Promise<void> => {
  let error: Error | undefined;
  try {
    await fn();
  } catch (err) {
    error = err;
  }

  if (cb) {
    cb(error);
    return;
  }

  if (error) {
    throw error;
  }
};

const noop = () => {};

export type Data = { id?: string } & Record<string, unknown>;

export class CookieSession {
  private readonly cookies: Cookies;

  // Session data is stored here
  public data: Data;

  constructor(
    private opts: ICookieSessionOpts,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    this.applyDefaultOpts();
    this.validate();

    this.cookies = new Cookies(req, res);

    this.data = {};
  }

  get sessionId(): string {
    if (!this.data.id) {
      this.data.id = randomUUID();
    }
    return this.data.id;
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

  private getDataItem(
    target: Record<string, unknown>,
    prop: string,
    receiver: Record<string, unknown>,
  ): any {
    debug(`Retrieving data: ${prop}`);

    const value = target[prop];
    if (this.opts.flash && prop !== 'id') {
      debug(`Deleting flash data after reading: ${prop}`);
      delete receiver[prop];
    }

    return value;
  }

  private proxyData(): void {
    // Wrap the data in a Proxy, so we can intercept the getters
    this.data = new Proxy<Data>(this.data, {
      get: (target, prop: string, receiver: Record<string, unknown>) =>
        this.getDataItem(target, prop, receiver),
    });
  }

  private validate(): void {
    if (!this.opts.secret || this.opts.secret.length < 16) {
      throw new Error('Secret must be at least 16 characters long');
    }
  }

  /**
   * Decrypt Data
   *
   * Decrypt the cookie data into an object. The
   * default function isn't actually asynchronous, but
   * use an async method to allow for extension
   * with different encryption algorithms
   *
   * @param input string
   * @returns Promise<Record<string, unknown>>
   */
  async decryptData(input: string): Promise<Record<string, unknown>> {
    try {
      const { session } = jwt.verify(input, this.opts.secret) as {
        session: Record<string, unknown>;
      };
      return session;
    } catch (err) {
      debug(`Error decrypting data: ${err?.message ?? 'Unknown error'}`);
      return {};
    }
  }

  /**
   * Encrypt Data
   *
   * Encrypt the session data into a string. The
   * default function isn't actually asynchronous, but
   * use an async method to allow for extension
   * with different encryption algorithms
   *
   * @returns Promise<string>
   */
  async encryptData(): Promise<string> {
    return jwt.sign({ session: this.data }, this.opts.secret, {
      notBefore: 0,
      expiresIn: Math.round(this.opts.duration / 1000),
    });
  }

  async loadCookieData(): Promise<void> {
    // Get the data from the cookie
    debug('Loading data from cookie');
    const encData = this.cookies.get(this.opts.name, {
      signed: this.opts.cookie.signed,
    });
    if (encData) {
      // Decrypt the data
      debug('Decrypting cookie data');
      const cookieData = await this.decryptData(encData);
      if (cookieData) {
        // Load the data
        debug('Data successfully decrypted - loading');
        this.data = { ...cookieData };
      }
    } else {
      debug('No data in cookie');
    }

    this.proxyData();
  }

  /**
   * Regenerate
   *
   * This resets the data back to empty and regenerates
   * the sessionId
   */
  regenerate(newId = false): undefined {
    debug(`Regenerating session: newId=${newId}`);
    this.data = {
      id: newId ? randomUUID() : this.sessionId,
    };
    this.proxyData();
  }

  async saveCookieData(): Promise<void> {
    this.cookies.set(
      this.opts.name,
      await this.encryptData(),
      this.opts.cookie,
    );
  }

  static express(opts: ICookieSessionOpts): RequestHandler {
    return async (req: RequestSession, res: Response, next: NextFunction) => {
      if (req.session) {
        next(new Error('Cannot redeclare session'));
        return;
      }

      debug('Creating cookie-session instance');

      req.cookieSession = new CookieSession(opts, req, res);

      try {
        debug('Loading session from cookies');
        await req.cookieSession.loadCookieData();
      } catch (err) {
        debug('Error loading session data', { err });
        next(err);
        return;
      }

      // Make the session behave like express-session
      // @link https://expressjs.com/en/resources/middleware/session.html
      function createSessionObject(): void {
        req.sessionID = req.cookieSession.sessionId; // Not really used here, but provides backwards compatibility with express-session
        req.session = req.cookieSession.data;

        req.session.destroy = (cb?: callback) => {
          callbackify(() => {
            req.cookieSession.regenerate(false);

            createSessionObject();
          }, cb);
        };
        req.session.regenerate = (cb?: callback) => {
          callbackify(() => {
            req.cookieSession.regenerate(true);

            createSessionObject();
          }, cb);
        };
        req.session.reload = (cb?: callback) => callbackify(noop, cb);
        req.session.save = (cb?: callback) => callbackify(noop, cb);
        req.session.touch = (cb?: callback) => callbackify(noop, cb);
      }

      createSessionObject();

      // Intercept the middleware before final send to add cookie data
      const { end } = res;
      res.end = (async (
        chunk: any,
        encoding: BufferEncoding,
        cb: () => void,
      ): Promise<void> => {
        debug('Saving session to cookie');
        // Save the cookie data to the HTTP header
        await req.cookieSession.saveCookieData();

        debug('Continuing middleware execution chain');
        // Continue executing the middleware chain
        end.call(res, chunk, encoding, cb);
      }) as any;

      next();
    };
  }
}
