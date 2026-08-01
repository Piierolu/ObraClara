package com.obraclara.backend.document.processing;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "obraclara.temporal")
public record TemporalProperties(boolean enabled, String target, String address, String taskQueue) {
    public String connectionTarget() {
        return address == null || address.isBlank() ? target : address;
    }
}
