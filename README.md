# cookie-session

Drop-in replacement for Express session using a cookie

<!-- toc -->

* [Getting started](#getting-started)
  * [Install](#install)
  * [Use](#use)
* [What's the purpose of this library?](#whats-the-purpose-of-this-library)
  * [Similar libraries](#similar-libraries)
* [Options](#options)
* [Contributing](#contributing)
  * [Open in Gitpod](#open-in-gitpod)
  * [Open in a container](#open-in-a-container)

<!-- Regenerate with "pre-commit run -a markdown-toc" -->

<!-- tocstop -->

## Getting started

### Install

```shell
npm i -S @mrsimonemms/cookie-session
```

### Use

> There is a fully-worked example in the [example](./example/) directory

```typescript
import express from 'express';
import { CookieSession } from '@mrsimonemms/cookie-session';

const app = express();

app
  .use(
    CookieSession.express({
      flash: true, // This will delete the data once read
      secret: 'this-is-a-secret-signing-key', // Must be minimum of 16 characters
    }),
  )
  .get('/', (req, res) => {
    // If done using "flash", this will delete the "date" session, but not "date2"
    const { date } = req.session;

    res.json({ sessionId: req.sessionID, getter: { date } });
  })
  .get('/set', (req, res) => {
    const date = new Date();
    req.session.date = date;
    req.session.data2 = date;

    res.json({ setter: { date } });
  })
  .listen(3000, () => {
    console.log('Lisening');
  });
```

## What's the purpose of this library?

I was recently building an API for an application that used OIDC for managing
its authentication. RESTful API should **ALWAYS** be build in a stateless manner.
However, the OIDC workflow requires a session to link data between sending and
verification.

Using a fully-blown [Express Session](https://expressjs.com/en/resources/middleware/cookie-session.html)
wasn't necessary for my purposes - I didn't want to have to add a Redis backend
to store the session data. The amount of data stored will always be under
[4kb](https://support.convert.com/hc/en-us/articles/4511582623117-Cookie-size-limits-and-the-impact-on-the-use-of-Convert-goals)
so a cookie is more than adequate.

I also wanted to have the concept of "flash" data - that is a piece of data that
is immediately deleted once read. As my use-case is an API and exists purely
as link data, enforcing flash sessions prevents the data from being relied upon
by my application.

### Similar libraries

* [Client sessions](https://github.com/mozilla/node-client-sessions) - this was my
  previous library, but it seems unmaintained (last release in 2014) and doesn't
  have flash data. Also, no TypeScript support
* [Cookie-session](https://github.com/expressjs/cookie-session) - the official
  Express method of achieving this. As above, this doesn't have flash data.

## Options

| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `secret` | string | Y | - | The secret that signs the cookie data. Min of 16 characters |
| `duration` | number | N | `86400000` | Duration of the JSON web token in milliseconds - the cookie age is controlled in `cookie` |
| `flash` | boolean | N | `false` | If `true`, data will be deleted once read |
| `name` | string | N | `session` | Name of the cookie |
| `cookie` | `Cookies.SetOption` | N | `{ path: '/' }` | See [Cookies.SetOption](https://github.com/pillarjs/cookies?tab=readme-ov-file#cookiessetname--values--options) |

## Contributing

### Open in Gitpod

* [Open in Gitpod](https://gitpod.io/from-referrer/)

### Open in a container

* [Open in a container](https://code.visualstudio.com/docs/devcontainers/containers)
