package com.obraclara.backend.document.processing;

import io.temporal.workflow.WorkflowInterface;
import io.temporal.workflow.WorkflowMethod;

@WorkflowInterface
public interface DocumentProcessingWorkflow {
    @WorkflowMethod
    DocumentProcessingResult process(DocumentProcessingWorkflowInput input);
}
