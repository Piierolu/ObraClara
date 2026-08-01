package com.obraclara.backend.document.processing;

import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;

@ActivityInterface
public interface DocumentProcessingActivity {
    @ActivityMethod
    DocumentProcessingResult process(DocumentProcessingWorkflowInput input);
}
