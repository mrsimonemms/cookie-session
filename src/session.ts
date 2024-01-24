import { CookieSession } from 'cookieSession';
import { callback, Data, RequestSession } from 'interfaces';

export class Session {
  readonly id: string;

  constructor(
    private cookieSession: CookieSession,
    private req: RequestSession,
    private data: Data = {},
  ) {
    this.id = req.sessionID;
  }

  destroy(cb: callback): Session {
    console.log(cb);
    return this;
  }

  regenerate(cb: callback): Session {
    console.log(cb);
    return this;
  }

  reload(cb: callback): Session {
    console.log(cb);
    return this;
  }

  resetMaxAge(): Session {
    return this;
  }

  save(cb?: callback): Session {
    console.log(cb);
    return this;
  }

  touch() {}
}
