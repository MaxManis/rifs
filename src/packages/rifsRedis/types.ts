export type RifsRedisAction = 'SET' | 'GET';

export type ParsedData = {
  action: RifsRedisAction;
  key: string;
  value: string;
  messageId: string;
};
export type ResponseData = {
  action: RifsRedisAction;
  response: string | null;
  success: boolean;
  messageId: string;
};
