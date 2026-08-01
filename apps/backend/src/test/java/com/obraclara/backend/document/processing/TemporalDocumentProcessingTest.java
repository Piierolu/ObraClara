package com.obraclara.backend.document.processing;

import com.obraclara.backend.document.Document;
import com.obraclara.backend.document.DocumentProcessingService;
import com.obraclara.backend.security.TenantContext;
import io.temporal.client.WorkflowOptions;
import io.temporal.testing.TestWorkflowEnvironment;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TemporalDocumentProcessingTest {
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void workflowRunsActivityInTemporalTestEnvironment() {
        try (TestWorkflowEnvironment environment = TestWorkflowEnvironment.newInstance()) {
            var worker = environment.newWorker("document-processing-test");
            worker.registerWorkflowImplementationTypes(DocumentProcessingWorkflowImpl.class);
            worker.registerActivitiesImplementations((DocumentProcessingActivity) input ->
                    new DocumentProcessingResult(input.documentId(), "PROCESSED", "TEST", null, null));
            environment.start();
            var workflow = environment.getWorkflowClient().newWorkflowStub(DocumentProcessingWorkflow.class,
                    WorkflowOptions.newBuilder().setTaskQueue("document-processing-test")
                            .setWorkflowId("document-processing-test-1").build());

            DocumentProcessingResult result = workflow.process(new DocumentProcessingWorkflowInput(
                    "doc-1", "org-1", "user-1", "Temporal Test", "ADMIN"));

            assertThat(result.documentId()).isEqualTo("doc-1");
            assertThat(result.status()).isEqualTo("PROCESSED");
        }
    }

    @Test
    void activityEstablishesTenantPrincipalAndClearsItAfterProcessing() {
        DocumentProcessingService service = mock(DocumentProcessingService.class);
        when(service.process("doc-1")).thenAnswer(invocation -> {
            assertThat(TenantContext.current().organizationId()).isEqualTo("org-1");
            assertThat(TenantContext.current().userId()).isEqualTo("user-1");
            Document document = new Document("doc-1", "org-1", "project-1", "invoice.txt",
                    "text/plain", 10, "storage-key");
            document.markProcessed("PAYMENT_APPLICATION", "TEST");
            return document;
        });
        var activity = new DocumentProcessingActivityImpl(service);

        DocumentProcessingResult result = activity.process(new DocumentProcessingWorkflowInput(
                "doc-1", "org-1", "user-1", "Temporal Test", "REVIEWER"));

        assertThat(result.status()).isEqualTo("PROCESSED");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
