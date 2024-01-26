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

import { randomBytes } from 'crypto';
import { ICookieSessionOpts } from 'interfaces';
import { CookieSession } from './session';

// Set the UUID for the tests
const uuid = '3a4f8ded-cce5-47d7-9772-246aa3807375';

jest.mock('node:crypto', () => ({
  randomUUID: () => uuid,
}));

describe('Session tests', () => {
  describe('#constructor', () => {
    it('should create an instance with default values', () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      const obj = new CookieSession(opts, req, res);

      expect(obj.sessionId).toBe(uuid);
      expect((obj as any).opts).toEqual({
        secret: opts.secret,
        duration: 24 * 60 * 60 * 1000,
        flash: false,
        name: 'session',
        cookie: {
          path: '/',
        },
      });
    });

    it('should create an instance with specified values', () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
        duration: 12345,
        flash: true,
        name: 'session-name',
        cookie: {
          path: '/path',
        },
      };

      const obj = new CookieSession(opts, req, res);

      expect(obj.sessionId).toBe(uuid);
      expect((obj as any).opts).toEqual(opts);
    });

    describe('validation', () => {
      it('should error if no secret set', () => {
        const req: any = {};
        const res: any = {};

        let hasErrored = false;
        try {
          new CookieSession({} as any, req, res);
        } catch (err) {
          hasErrored = true;
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toEqual(
            'Secret must be at least 16 characters long',
          );
        } finally {
          expect(hasErrored).toBe(true);
        }
      });

      it('should error if secret less than 16 characters', () => {
        for (let i = 0; i < 16; i++) {
          const req: any = {};
          const res: any = {};

          let hasErrored = false;
          try {
            new CookieSession(
              {
                secret: randomBytes(16).toString('hex').slice(0, i),
              },
              req,
              res,
            );
          } catch (err) {
            hasErrored = true;
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toEqual(
              'Secret must be at least 16 characters long',
            );
          } finally {
            expect(hasErrored).toBe(true);
          }
        }
      });
    });
  });

  describe('Static methods', () => {
    describe('#express', () => {
      it('should throw an error if session already exists on the request object', async () => {
        const req: any = {
          session: {},
        };
        const res: any = {};
        const next = jest.fn();

        const opts: any = {};

        const middleware = CookieSession.express(opts);

        expect(await middleware(req, res, next)).toBeUndefined();

        expect(next).toHaveBeenCalledWith(
          new Error('Cannot redeclare session'),
        );
      });

      it('should create express middleware instance', async () => {
        const req: any = {};
        const res: any = {};
        const next = jest.fn();

        const opts: any = {
          secret: 'this-is-a-super-secret-key',
        };

        const middleware = CookieSession.express(opts);

        expect(await middleware(req, res, next)).toBeUndefined();

        expect(next).toHaveBeenCalledWith();

        expect(req.sessionID).toBe(uuid);
        expect(req.session).toEqual({
          id: uuid,
        });
      });
    });
  });
});
