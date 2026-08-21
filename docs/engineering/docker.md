# Docker

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: PLATFORM USER

Official Golden Paths ship a Dockerfile and, where useful, Docker Compose.
The Control Plane does not build or host the Data Product runtime image.
CI runs the Docker build as part of the quality gate.

Do not copy MQTT or REST product Docker pages here. After you create a
product, use the generated TechDocs:

- MQTT Temperature → product `docs/docker.md`
- REST Equipment → product `docs/docker.md`

Local run: [Development environment](../developer/local-development.md).  
Hosted Control Plane: [Portainer](../deployment/portainer.md).  
CI: [CI/CD](ci-cd.md).
