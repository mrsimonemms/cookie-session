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
import * as matchers from 'jest-extended';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { CookieSession } from './session';

expect.extend(matchers);

// Set the UUID for the tests
const uuid = '3a4f8ded-cce5-47d7-9772-246aa3807375';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

describe('Session tests', () => {
  beforeEach(() => {
    (randomUUID as any).mockReturnValue(uuid);
  });

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

  describe('#decryptData', () => {
    let obj: CookieSession;
    let opts: ICookieSessionOpts;

    beforeEach(() => {
      const req: any = {};
      const res: any = {};

      opts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      obj = new CookieSession(opts, req, res);
    });

    it('should decrypt the data', async () => {
      const input = 'some-input-data';
      const session = 'some-output-data';
      (jwt.verify as any).mockReturnValue({
        session,
      });

      expect(await obj.decryptData(input)).toEqual(session);

      expect(jwt.verify).toHaveBeenCalledWith(input, opts.secret);
    });

    it('should handle an error by creating a new data object', async () => {
      const input = 'some-input-data';
      const origErr = new Error('some error');
      (jwt.verify as any).mockImplementation(() => {
        throw origErr;
      });

      expect(await obj.decryptData(input)).toEqual({});

      expect(jwt.verify).toHaveBeenCalledWith(input, opts.secret);
    });
  });

  describe('#encryptData', () => {
    it('should encrypt the data with default duration', async () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      const obj = new CookieSession(opts, req, res);

      const data = {
        hello: 'world',
      };

      obj.data = { ...data };

      const output = 'some-signed-output';
      (jwt.sign as any).mockReturnValue(output);

      expect(await obj.encryptData()).toEqual(output);

      expect(jwt.sign).toHaveBeenCalledWith(
        { session: obj.data },
        opts.secret,
        {
          notBefore: 0,
          expiresIn: 86400,
        },
      );
    });

    it('should encrypt the data with specified duration', async () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
        duration: 1234567890,
      };

      const obj = new CookieSession(opts, req, res);

      const data = {
        hello: 'world',
      };

      obj.data = { ...data };

      const output = 'some-signed-output';
      (jwt.sign as any).mockReturnValue(output);

      expect(await obj.encryptData()).toEqual(output);

      expect(jwt.sign).toHaveBeenCalledWith(
        { session: obj.data },
        opts.secret,
        {
          notBefore: 0,
          expiresIn: Math.round(opts.duration / 1000),
        },
      );
    });
  });

  describe('#getDataItem', () => {
    it('should keep the data when retrieved if flash not set', () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      const obj: any = new CookieSession(opts, req, res);

      const target = 'this-is-target-data';
      const other = 'this-is-other-data';
      const data = {
        id: uuid,
        target,
        other,
      };

      expect(obj.getDataItem(data, 'target', data)).toBe(target);
      expect(Object.keys(data)).toContainAllValues(['target', 'other', 'id']);
      expect(data.target).toEqual(target);
      expect(data.other).toEqual(other);

      expect(obj.getDataItem(data, 'id', data)).toEqual(uuid);
      expect(data.id).toEqual(uuid);
    });

    it('should delete the data when retrieved if flash disabled', () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
        flash: false,
      };

      const obj: any = new CookieSession(opts, req, res);

      const target = 'this-is-target-data';
      const other = 'this-is-other-data';
      const data = {
        id: uuid,
        target,
        other,
      };

      expect(obj.getDataItem(data, 'target', data)).toBe(target);
      expect(Object.keys(data)).toContainAllValues(['target', 'other', 'id']);
      expect(data.target).toEqual(target);
      expect(data.other).toEqual(other);

      expect(obj.getDataItem(data, 'id', data)).toEqual(uuid);
      expect(data.id).toEqual(uuid);
    });

    it('should keep the data when retrieved if flash enabled', () => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
        flash: true,
      };

      const obj: any = new CookieSession(opts, req, res);

      const target = 'this-is-target-data';
      const other = 'this-is-other-data';
      const data = {
        id: uuid,
        target,
        other,
      };

      expect(obj.getDataItem(data, 'target', data)).toBe(target);
      expect(Object.keys(data)).toContainAllValues(['other', 'id']);
      expect(data.target).toBeFalsy();
      expect(data.other).toEqual(other);

      expect(obj.getDataItem(data, 'id', data)).toEqual(uuid);
      expect(data.id).toEqual(uuid);
    });
  });

  describe('#loadCookieData', () => {
    let obj: any;

    beforeEach(() => {
      const req: any = {};
      const res: any = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      obj = new CookieSession(opts, req, res);
      obj.cookies = {
        get: jest.fn(),
      };
      obj.decryptData = jest.fn();
    });

    it('should handle no cookie data', async () => {
      obj.cookies.get.mockReturnValue();

      expect(await obj.loadCookieData()).toBeUndefined();

      expect(JSON.stringify(obj.data)).toEqual('{}');

      expect(obj.decryptData).not.toHaveBeenCalled();
    });

    it('should handle no unencrypted data', async () => {
      const cookieData = 'some-cookie-data';
      obj.cookies.get.mockReturnValue(cookieData);

      obj.decryptData.mockResolvedValue();

      expect(await obj.loadCookieData()).toBeUndefined();

      expect(obj.decryptData).toHaveBeenCalledWith(cookieData);

      expect(JSON.stringify(obj.data)).toEqual('{}');

      expect(obj.decryptData).toHaveBeenCalledWith(cookieData);
    });

    it('should handle no parse data', async () => {
      const cookieData = 'some-cookie-data2';
      obj.cookies.get.mockReturnValue(cookieData);

      const decodedData = {};
      obj.decryptData.mockResolvedValue(decodedData);

      expect(await obj.loadCookieData()).toBeUndefined();

      expect(obj.decryptData).toHaveBeenCalledWith(cookieData);

      expect(JSON.stringify(obj.data)).toEqual('{}');
    });

    it('should handle some data', async () => {
      const cookieData = 'some-cookie-data2';
      obj.cookies.get.mockReturnValue(cookieData);

      const decodedData = { hello: 'world' };
      obj.decryptData.mockResolvedValue(decodedData);

      expect(await obj.loadCookieData()).toBeUndefined();

      expect(obj.decryptData).toHaveBeenCalledWith(cookieData);

      expect(JSON.stringify(obj.data)).toEqual(JSON.stringify(decodedData));
    });
  });

  describe('#regenerate', () => {
    let obj: any;
    let res: any;

    beforeEach(() => {
      const req: any = {};
      res = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      obj = new CookieSession(opts, req, res);
    });

    it('should regenerate the session and retain the new ID if no arguments', () => {
      const key = 'key';
      const value = 'value';

      obj.data[key] = value;
      expect(obj.sessionId).toBe(uuid);
      expect(obj.data).toBeObject();
      expect(obj.data).toContainEntries([[key, value]]);

      expect(obj.regenerate()).toBeUndefined();

      expect(obj.sessionId).toBe(uuid);
      expect(obj.data).toBeObject();
      expect(obj.data).not.toContainEntries([[key, value]]);
    });

    it('should regenerate the session and retain the new ID if false passed', () => {
      const key = 'key';
      const value = 'value';

      obj.data[key] = value;
      expect(obj.sessionId).toBe(uuid);
      expect(obj.data).toBeObject();
      expect(obj.data).toContainEntries([[key, value]]);

      expect(obj.regenerate(false)).toBeUndefined();

      expect(obj.sessionId).toBe(uuid);
      expect(obj.data).toBeObject();
      expect(obj.data).not.toContainEntries([[key, value]]);
    });

    it('should regenerate the session and get a new ID if true passed', () => {
      const key = 'key';
      const value = 'value';

      obj.data[key] = value;
      expect(obj.sessionId).toBe(uuid);
      expect(obj.data).toBeObject();
      expect(obj.data).toContainEntries([[key, value]]);

      const newUUID = 'some-new-uuid';
      (randomUUID as any).mockReturnValue(newUUID);

      expect(obj.regenerate(true)).toBeUndefined();

      expect(obj.sessionId).toBe(newUUID);
      expect(obj.data).toBeObject();
      expect(obj.data).not.toContainEntries([[key, value]]);
    });
  });

  describe('#saveCookieData', () => {
    let obj: any;
    let res: any;

    beforeEach(() => {
      const req: any = {};
      res = {};

      const opts: ICookieSessionOpts = {
        secret: randomBytes(16).toString('hex').slice(0, 16),
      };

      obj = new CookieSession(opts, req, res);
      obj.cookies = {
        set: jest.fn(),
      };
      obj.encryptData = jest.fn();
    });

    it('should set the data to a cookie', async () => {
      const data = 'some-data';
      obj.encryptData.mockResolvedValue(data);

      expect(await obj.saveCookieData()).toBeUndefined();

      expect(obj.cookies.set).toHaveBeenCalledWith(
        obj.opts.name,
        data,
        obj.opts.cookie,
      );
      expect(obj.encryptData).toHaveBeenCalledWith();
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
        const origEnd: any = jest.fn();
        const req: any = {};
        const res: any = {
          end: origEnd,
        };
        const next = jest.fn();

        const opts: any = {
          secret: 'this-is-a-super-secret-key',
        };

        const loadCookieData = jest
          .spyOn(CookieSession.prototype, 'loadCookieData')
          .mockResolvedValue();

        const middleware = CookieSession.express(opts);

        expect(await middleware(req, res, next)).toBeUndefined();

        expect(next).toHaveBeenCalledWith();

        expect(loadCookieData).toHaveBeenCalledWith();

        expect(req.sessionID).toBe(uuid);
        expect(req.session).toEqual(
          expect.objectContaining({
            id: uuid,
          }),
        );

        expect(req.session.destroy).toBeFunction();
        expect(req.session.regenerate).toBeFunction();
        expect(req.session.reload).toBeFunction();
        expect(req.session.save).toBeFunction();
        expect(req.session.touch).toBeFunction();

        // Check that the saveCookieData command is called at the end of res.end
        expect(typeof res.end).toBe('function');

        req.cookieSession = jest.fn(req.cookieSession);
        req.cookieSession.saveCookieData = jest.fn();

        const chunk: any = jest.fn();
        const encoding: any = jest.fn();
        const cb: any = jest.fn();

        expect(await res.end(chunk, encoding, cb)).toBeUndefined();

        expect(origEnd).toHaveBeenCalledWith(chunk, encoding, cb);

        expect(req.cookieSession.saveCookieData).toHaveBeenCalledWith();
      });

      it('should handle an error when loading cookie data', async () => {
        const origEnd: any = jest.fn();
        const req: any = {};
        const res: any = {
          end: origEnd,
        };
        const next = jest.fn();

        const opts: any = {
          secret: 'this-is-a-super-secret-key',
        };

        const origErr = 'some-error';
        const loadCookieData = jest
          .spyOn(CookieSession.prototype, 'loadCookieData')
          .mockRejectedValue(origErr);

        const middleware = CookieSession.express(opts);

        expect(await middleware(req, res, next)).toBeUndefined();

        expect(next).toHaveBeenCalledWith(origErr);

        expect(loadCookieData).toHaveBeenCalledWith();

        req.cookieSession = jest.fn(req.cookieSession);
        req.cookieSession.saveCookieData = jest.fn();

        const chunk: any = jest.fn();
        const encoding: any = jest.fn();
        const cb: any = jest.fn();

        expect(await res.end(chunk, encoding, cb)).toBeUndefined();

        expect(origEnd).toHaveBeenCalledWith(chunk, encoding, cb);
      });
    });
  });
});
