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

/* eslint-disable @typescript-eslint/no-var-requires */

const express = require('express');
const { CookieSession } = require('cookie-session');

const config = {
  session: {
    // flash: process.env.SESSION_FLASH !== 'false',
    secret: process.env.SESSION_SECRET ?? 'some-super-secret-key',
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
  },
};

const app = express();

app
  .use(CookieSession.express(config.session))
  .get('/', (req, res) => {
    // If done using "flash", this will delete the "date" session, but not "date2"
    const { date } = req.session;

    res.json({ sessionId: req.sessionID, getter: { date } });
  })
  .get('/clear', (req, res) => {
    req.session.destroy();

    res.json({
      clear: true,
    });
  })
  .get('/reset', (req, res) => {
    req.session.regenerate();

    res.json({
      reset: true,
    });
  })
  .get('/set', (req, res) => {
    const date = new Date();
    req.session.date = date;
    req.session.data2 = date;

    res.json({ setter: { date } });
  })
  .listen(config.server.port, () => {
    console.log(`Listening on port ${config.server.port}`);
  });
