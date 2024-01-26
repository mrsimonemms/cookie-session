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

import { NextFunction, RequestHandler, Response } from 'express';
import { ICookieSessionOpts, RequestSession } from 'interfaces';

export class CookieSession {
  static express(opts: ICookieSessionOpts): RequestHandler {
    return async (req: RequestSession, res: Response, next: NextFunction) => {
      if (req.session) {
        throw new Error('Cannot redeclare session');
      }

      // @todo(sje): temp
      req.session = {};

      // @todo(sje): remove
      console.log({
        opts,
        res,
      });

      next();
    };
  }
}
