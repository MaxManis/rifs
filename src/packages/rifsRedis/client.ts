import { Socket } from 'net';
import { config as globalConfig } from '../../config';
import { randomUUID } from 'crypto';
import { colors, consoleColors, sleep } from '../../utils';
import { ResponseData } from './types';

const APP_NAME = 'RIFS_REDIS_CLIENT';
const GET_RETRIES_COUNT = 100;
const GET_RETRIES_TIMEOUT_MS = 100;

export class RifsRedisClient {
  private readonly PORT: number;
  private readonly HOST: string;

  private readonly context: string;
  private client: Socket;

  constructor(port: number) {
    this.PORT = port;
    this.HOST = 'RIFS_REDIS';
    this.client = new Socket();
    this.context = `[${APP_NAME}]:`;
  }

  private logData(
    message: string,
    color: keyof typeof consoleColors = 'green',
  ) {
    console.log(consoleColors[color], this.context, message, colors.Reset);
  }

  public init() {
    this.client.connect(this.PORT, globalConfig.LOCAL_HOST, () => {
      this.logData(`Connected to ${this.HOST}:${this.PORT}`, 'white');
    });

    // Handle data received from the server
    //this.client.on('data', (data) => {
    //console.log(this.context, `Received data from server: ${data}`);
    //});

    // Handle the connection being closed
    this.client.on('close', () => {
      this.logData(`Connection to ${this.HOST}:${this.PORT} closed`, 'red');
    });

    // Handle errors
    this.client.on('error', (err) => {
      this.logData(`Error: ${err.message}`, 'red');
    });

    return this;
  }

  public terminate() {
    this.client.destroy();
    this.logData(`Connection to ${this.HOST}:${this.PORT} terminated!`, 'red');
  }

  public sendData(data: string) {
    return this.client.write(data);
  }

  public set(key: string, value: string) {
    const data = {
      action: 'SET',
      key,
      value,
      messageId: randomUUID(),
    };

    return this.sendData(JSON.stringify(data));
  }
  public async get(key: string) {
    const requestData = {
      action: 'GET',
      key,
      value: '',
      messageId: randomUUID(),
    };

    this.sendData(JSON.stringify(requestData));

    let response: ResponseData | null = null;
    let checker = GET_RETRIES_COUNT;

    this.client.on('data', (dataRaw) => {
      const data = JSON.parse(dataRaw.toString()) as ResponseData;
      if (
        data &&
        data.messageId === requestData.messageId &&
        data.action === 'GET'
      ) {
        response = data;
      }
    });

    while (checker) {
      if (response) {
        checker = 0;
        break;
      } else {
        await sleep(GET_RETRIES_TIMEOUT_MS);
        checker -= 1;
      }
    }

    if (response) {
      return (response as ResponseData).response;
    }

    return null;
  }
}
