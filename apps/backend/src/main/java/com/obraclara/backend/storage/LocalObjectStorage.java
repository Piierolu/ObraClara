package com.obraclara.backend.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Component
@ConditionalOnProperty(name = "obraclara.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalObjectStorage implements ObjectStorage {
    private final Path root;

    public LocalObjectStorage(@Value("${obraclara.storage.local-directory:./data/uploads}") String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public String store(String organizationId, String projectId, String documentId, InputStream content) throws IOException {
        String key = organizationId + "/" + projectId + "/" + documentId + "/content";
        Path destination = resolve(key);
        Files.createDirectories(destination.getParent());
        Files.copy(content, destination, StandardCopyOption.REPLACE_EXISTING);
        return key;
    }

    @Override
    public byte[] read(String storageKey) throws IOException {
        return Files.readAllBytes(resolve(storageKey));
    }

    private Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return resolved;
    }
}
