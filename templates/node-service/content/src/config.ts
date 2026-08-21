export const config = {
  serviceName: process.env.SERVICE_NAME ?? '${{ values.name }}',
  serviceVersion: process.env.SERVICE_VERSION ?? '${{ values.version }}',
  port: Number(process.env.PORT ?? 8080),
  domain: '${{ values.domain }}',
  template: '${{ values.templateName }}',
};
