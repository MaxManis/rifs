import { NextFunction, Request, RequestHandler, Response } from 'express';

export type RifHttpRequestOptions = {
  dataType?: 'json' | 'text' | 'blob';
  body?: string;
  headers?: Record<string, string>;
};

type RifHttpRequestFunction = <T>(
  route: string,
  options?: RifHttpRequestOptions,
) => Promise<T>;

export type Rif = {
  get: RifHttpRequestFunction;
  post: RifHttpRequestFunction;
  put: RifHttpRequestFunction;
  patch: RifHttpRequestFunction;
  delete: RifHttpRequestFunction;
  getAllRoutes: () => string[];
};

export type RifsUtils = {
  setStatusCode: (newStatusCode: number) => void;
  rif: (port: number) => Rif | null;
};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RifsMiddleware = (
  req: Request,
  next: NextFunction,
) => unknown | Promise<unknown>;

export type RouteConfig = {
  method: HttpMethod;
  response: (
    req: Request,
    next: NextFunction,
    rifsUtils: RifsUtils,
  ) => unknown | Promise<unknown>;
  responseDelay?: number;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  middlewares?: RifsMiddleware[];
};

export type ServerRoutes = Record<string, RouteConfig>;

export type ServerConfig = {
  serviceName?: string;
  serviceType?: 'express';
  port: number;
  routes: ServerRoutes;
};
