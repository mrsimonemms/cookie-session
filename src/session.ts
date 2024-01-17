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

import { SessionData, Store } from 'express-session';

export class CookieSession extends Store {
  get(sid: string, callback: (err: any, session?: SessionData) => void): void {
    console.log({
      method: 'get',
      sid,
      callback,
    });
  }

  async getAsync(sid: string): Promise<SessionData> {
    console.log({
      sid,
    });

    return {
      cookie: {
        originalMaxAge: null,
      },
    };
  }

  set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
    console.log({
      method: 'set',
      sid,
      session,
      callback,
    });
  }

  async setAsync(sid: string, session: SessionData): Promise<void> {
    console.log({
      sid,
      session,
    });
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    console.log({
      method: 'destroy',
      sid,
      callback,
    });
  }

  async destroyAsync(sid: string): Promise<void> {
    console.log({
      sid,
    });
  }
}
