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
import { Request } from 'express';
import { CookieSession } from './session';

export type callback = (err: unknown) => void;

export interface ICookieSessionOpts {
  duration?: number; // Life of the session in milliseconds - defaults to 24 hours
  flash?: boolean; // Session data will be deleted once it's been read - defaults to false
  name?: string; // Name of the cookie sent to the request - defaults to "session"
  secret: string; // Large, unguessable string that the data is encrypted with
  cookie?: Cookies.SetOption;
}

export interface RequestSession extends Request {
  cookieSession?: CookieSession;
  sessionID?: string;
  session?: Record<string, any>;
}

export interface Data {
  [key: string]: unknown;
}
