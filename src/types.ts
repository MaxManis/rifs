import { NextFunction, Request, Response } from 'express';

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
};

export type RifsUtils = {
  changeStatusCode: (newStatusCode: number) => void;
  rif: (port: number) => Rif | null;
};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RouteConfig = {
  method: HttpMethod;
  response: (
    req: Request,
    next: NextFunction,
    rifsUtils: RifsUtils,
  ) => unknown | Promise<unknown>;
  responseDelay?: number;
  statusCode?: number;
};

export type ServerRoutes = Record<string, RouteConfig>;

export type ServerConfig = {
  serviceName?: string;
  serviceType?: 'express';
  port: number;
  routes: ServerRoutes;
};
