import * as Cookies from 'cookies';
import { Request,  } from 'express';

export interface ICookieSessionOpts {
  duration?: number; // Life of the session in milliseconds - defaults to 24 hours
  flash?: boolean; // Session data will be deleted once it's been read - defaults to false
  name?: string; // Name of the cookie sent to the request - defaults to "session"
  secret: string; // Large, unguessable string that the data is encrypted with
  cookie?: Cookies.SetOption;
}

export interface RequestSession extends Request {
  session?: Record<string, any>;
}
