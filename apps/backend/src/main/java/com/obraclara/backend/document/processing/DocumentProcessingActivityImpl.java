package com.obraclara.backend.document.processing;

import com.obraclara.backend.document.DocumentProcessingService;
import com.obraclara.backend.document.DocumentStatus;
import com.obraclara.backend.security.DemoPrincipal;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "obraclara.temporal.enabled", havingValue = "true")
public class DocumentProcessingActivityImpl implements DocumentProcessingActivity {
    private final DocumentProcessingService processingService;

    public DocumentProcessingActivityImpl(DocumentProcessingService processingService) {
        this.processingService = processingService;
    }

    @Override
    public DocumentProcessingResult process(DocumentProcessingWorkflowInput input) {
        DemoPrincipal principal = new DemoPrincipal(input.userId(), input.organizationId(), input.displayName(), input.role());
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, "temporal-workflow",
                List.of(new SimpleGrantedAuthority("ROLE_" + input.role()))));
        SecurityContextHolder.setContext(context);
        try {
            var document = processingService.process(input.documentId());
            if (document.getStatus() == DocumentStatus.FAILED) {
                throw new IllegalStateException("Document processing failed: " + document.getFailureReason());
            }
            return DocumentProcessingResult.from(document);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
