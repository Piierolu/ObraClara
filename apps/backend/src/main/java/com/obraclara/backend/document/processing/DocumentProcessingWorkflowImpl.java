package com.obraclara.backend.document.processing;

import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.workflow.Workflow;

import java.time.Duration;

public class DocumentProcessingWorkflowImpl implements DocumentProcessingWorkflow {
    private final DocumentProcessingActivity activity = Workflow.newActivityStub(
            DocumentProcessingActivity.class,
            ActivityOptions.newBuilder()
                    .setStartToCloseTimeout(Duration.ofMinutes(5))
                    .setRetryOptions(RetryOptions.newBuilder()
                            .setInitialInterval(Duration.ofSeconds(2))
                            .setBackoffCoefficient(2.0)
                            .setMaximumInterval(Duration.ofSeconds(15))
                            .setMaximumAttempts(3)
                            .build())
                    .build());

    @Override
    public DocumentProcessingResult process(DocumentProcessingWorkflowInput input) {
        return activity.process(input);
    }
}
