package com.obraclara.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class TenantContext {
    private TenantContext() {}

    public static DemoPrincipal current() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof DemoPrincipal principal)) {
            throw new IllegalStateException("Authenticated tenant is required");
        }
        return principal;
    }

    public static String organizationId() {
        return current().organizationId();
    }
}
