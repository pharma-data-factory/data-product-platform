# Unified Namespace

Owner: Platform Team  
Status: DEVELOPMENT  
Version: 1.0.0  
Category: integration

Governed MQTT Unified Namespace. Catalog entity lives in
catalog/entities.yaml as component:default/unified-namespace.
Runnable service: uns/. Create template: templates/unified-namespace/.

Do not duplicate the Catalog entity here. Future Data Products such as
OEE, Cold Chain, and Equipment Monitoring may depend on this component.
UNS may conceptually depend on MQTT Consumer / Producer. Kafka is deferred.
