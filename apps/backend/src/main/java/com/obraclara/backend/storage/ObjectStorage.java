package com.obraclara.backend.storage;

import java.io.IOException;
import java.io.InputStream;

public interface ObjectStorage {
    String store(String organizationId, String projectId, String documentId, InputStream content) throws IOException;
    byte[] read(String storageKey) throws IOException;
}
