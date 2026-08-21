import express from 'express';
import { config } from './config';

export const app = express();

app.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: config.serviceName,
    version: config.serviceVersion,
  });
});

app.get('/v1/info', (_req, res) => {
  res.json({
    name: config.serviceName,
    version: config.serviceVersion,
    domain: config.domain,
    template: config.template,
  });
});
