import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  // Do not log secrets. Port and service name are operational metadata only.
  console.log(`${config.serviceName} listening on ${config.port}`);
});
