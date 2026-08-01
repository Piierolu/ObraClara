package com.obraclara.backend.storage;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

@Component
@ConditionalOnProperty(name = "obraclara.storage.type", havingValue = "minio")
public class MinioObjectStorage implements ObjectStorage {
    private final MinioClient client;
    private final String bucket;

    public MinioObjectStorage(MinioStorageProperties properties) {
        if (isBlank(properties.getEndpoint()) || isBlank(properties.getAccessKey()) || isBlank(properties.getSecretKey())) {
            throw new IllegalArgumentException("MinIO endpoint, access key and secret key are required");
        }
        this.client = MinioClient.builder().endpoint(properties.getEndpoint())
                .credentials(properties.getAccessKey(), properties.getSecretKey()).build();
        this.bucket = properties.getBucket();
    }

    @Override
    public String store(String organizationId, String projectId, String documentId, InputStream content) throws IOException {
        String key = organizationId + "/" + projectId + "/" + documentId + "/content";
        try {
            ensureBucket();
            client.putObject(PutObjectArgs.builder().bucket(bucket).object(key)
                    .stream(content, -1, 10 * 1024 * 1024).build());
            return key;
        } catch (Exception exception) {
            throw new IOException("Could not store object in MinIO", exception);
        }
    }

    @Override
    public byte[] read(String storageKey) throws IOException {
        try (var response = client.getObject(GetObjectArgs.builder().bucket(bucket).object(storageKey).build())) {
            return response.readAllBytes();
        } catch (Exception exception) {
            throw new IOException("Could not read object from MinIO", exception);
        }
    }

    private void ensureBucket() throws Exception {
        if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
