package com.obraclara.backend.document.processing;

import com.obraclara.backend.document.Document;
import com.obraclara.backend.document.DocumentService;
import com.obraclara.backend.security.TenantContext;
import io.temporal.api.enums.v1.WorkflowIdReusePolicy;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@ConditionalOnProperty(name = "obraclara.temporal.enabled", havingValue = "true")
public class TemporalDocumentProcessingLauncher implements DocumentProcessingLauncher {
    private final WorkflowClient client;
    private final TemporalProperties properties;
    private final DocumentService documents;

    public TemporalDocumentProcessingLauncher(WorkflowClient client, TemporalProperties properties,
                                              DocumentService documents) {
        this.client = client;
        this.properties = properties;
        this.documents = documents;
    }

    @Override
    public Document process(String documentId) {
        Document document = documents.get(documentId);
        var principal = TenantContext.current();
        String workflowId = "document-processing-" + document.getId() + "-" + UUID.randomUUID();
        var workflow = client.newWorkflowStub(DocumentProcessingWorkflow.class, WorkflowOptions.newBuilder()
                .setWorkflowId(workflowId)
                .setWorkflowIdReusePolicy(WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE)
                .setTaskQueue(properties.taskQueue()).build());
        workflow.process(new DocumentProcessingWorkflowInput(documentId, principal.organizationId(),
                principal.userId(), principal.displayName(), principal.role()));
        return documents.get(documentId);
    }
}
