package com.obraclara.backend.document.processing;

import io.temporal.client.WorkflowClient;
import io.temporal.serviceclient.WorkflowServiceStubs;
import io.temporal.serviceclient.WorkflowServiceStubsOptions;
import io.temporal.worker.WorkerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "obraclara.temporal.enabled", havingValue = "true")
@EnableConfigurationProperties(TemporalProperties.class)
public class TemporalConfiguration {
    @Bean(destroyMethod = "shutdown")
    WorkflowServiceStubs workflowServiceStubs(TemporalProperties properties) {
        return WorkflowServiceStubs.newServiceStubs(WorkflowServiceStubsOptions.newBuilder()
                .setTarget(properties.connectionTarget()).build());
    }

    @Bean
    WorkflowClient workflowClient(WorkflowServiceStubs serviceStubs) {
        return WorkflowClient.newInstance(serviceStubs);
    }

    @Bean(destroyMethod = "shutdown")
    WorkerFactory temporalWorkerFactory(WorkflowClient client, TemporalProperties properties,
                                        DocumentProcessingActivity activity) {
        WorkerFactory factory = WorkerFactory.newInstance(client);
        var worker = factory.newWorker(properties.taskQueue());
        worker.registerWorkflowImplementationTypes(DocumentProcessingWorkflowImpl.class);
        worker.registerActivitiesImplementations(activity);
        factory.start();
        return factory;
    }
}
