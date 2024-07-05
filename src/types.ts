import { Request, Response } from 'express';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RouteConfig = {
  method: HttpMethod;
  response: (req: Request, res: Response) => any | Promise<any>;
  responseDelay?: number;
};

export type ServerRoutes = Record<string, RouteConfig>;

export type ServerConfig = {
  serviceName?: string;
  serviceType?: 'express';
  port: number;
  routes: ServerRoutes;
};
