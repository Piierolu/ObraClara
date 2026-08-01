package com.obraclara.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BackendApiIntegrationTest {
    private static final String PROJECT_ID = "00000000-0000-0000-0000-000000000010";
    private static String createdProjectId;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    @Order(1)
    void authenticationIsRequiredAndSeededProjectIsAvailable() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("demo-admin"));
        mvc.perform(get("/api/projects").header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(PROJECT_ID))
                .andExpect(jsonPath("$[0].code").value("RA-2026-014"));
    }

    @Test
    @Order(2)
    void uploadAutomaticallyProcessesAndExposesEvidenceAndAudit() throws Exception {
        String fixture = """
                contract_amount: 1000
                contract_rate: 10
                billed_rate: 12
                billed_quantity: 20
                progress_quantity: 15
                retention_percent: 12
                prior_payments: 900
                current_payment: 200
                subtotal: 100
                tax_amount: 16
                retention_amount: 5
                total_amount: 120
                """;
        var file = new MockMultipartFile("file", "../payment.txt", "text/plain",
                fixture.getBytes(StandardCharsets.UTF_8));
        String uploadJson = mvc.perform(multipart("/api/projects/{projectId}/documents", PROJECT_ID)
                        .file(file).header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalFileName").value("payment.txt"))
                .andExpect(jsonPath("$.status").value("PROCESSED"))
                .andExpect(jsonPath("$.processingMode").value("IN_PROCESS_FALLBACK"))
                .andReturn().getResponse().getContentAsString();
        JsonNode upload = objectMapper.readTree(uploadJson);
        String documentId = upload.get("id").asText();

        mvc.perform(get("/api/projects/{id}/anomalies", PROJECT_ID)
                        .header("Authorization", "Bearer demo-reviewer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'RATE_MISMATCH')]").exists())
                .andExpect(jsonPath("$[?(@.type == 'RATE_MISMATCH')].evidence[0].documentFileName").exists())
                .andExpect(jsonPath("$[?(@.type == 'RATE_MISMATCH')].evidence[0].quote").isNotEmpty());
        mvc.perform(get("/api/projects/{id}/questions", PROJECT_ID).param("field", "contract_amount")
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers[0].value").value("1000"))
                .andExpect(jsonPath("$.answers[0].evidence[0].quote").value("contract_amount: 1000"));
        mvc.perform(post("/api/projects/{id}/questions", PROJECT_ID)
                        .header("Authorization", "Bearer demo-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"¿Cuál es el monto del contrato?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answered").value(true))
                .andExpect(jsonPath("$.value").value("1000"))
                .andExpect(jsonPath("$.evidence[0].documentFileName").value("payment.txt"));
        mvc.perform(post("/api/projects/{id}/questions", PROJECT_ID)
                        .header("Authorization", "Bearer demo-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"¿Quién es el arquitecto?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answered").value(false))
                .andExpect(jsonPath("$.evidence").isEmpty())
                .andExpect(jsonPath("$.answer").value("No puedo responder con la evidencia disponible."));
        mvc.perform(get("/api/projects/{id}/audit-events", PROJECT_ID)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.entityId == '" + documentId + "')]").exists())
                .andExpect(jsonPath("$[?(@.action == 'DOCUMENT_UPLOADED')]").exists())
                .andExpect(jsonPath("$[?(@.action == 'DOCUMENT_PROCESSED')]").exists());
    }

    @Test
    @Order(3)
    void evaluatesPythonAliasesAcrossProjectDocuments() throws Exception {
        upload("contract.txt", """
                contract_limit: 1000
                contract_rate: 8
                contract_retention_percent: 5
                """);
        String invoiceJson = upload("invoice.txt", """
                unit_rate: 10
                quantity: 12
                certified_quantity: 10
                billed_retention_percent: 7
                subtotal: 1100
                tax: 100
                total: 1200
                """);
        String invoiceId = objectMapper.readTree(invoiceJson).get("id").asText();

        mvc.perform(get("/api/projects/{id}/anomalies", PROJECT_ID)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.documentId == '" + invoiceId + "' && @.type == 'RATE_MISMATCH')]").exists())
                .andExpect(jsonPath("$[?(@.documentId == '" + invoiceId + "' && @.type == 'QUANTITY_EXCEEDS_PROGRESS')]").exists())
                .andExpect(jsonPath("$[?(@.documentId == '" + invoiceId + "' && @.type == 'INVALID_RETENTION')]").exists())
                .andExpect(jsonPath("$[?(@.documentId == '" + invoiceId + "' && @.type == 'CONTRACT_BALANCE_EXCEEDED')]").exists());
    }

    @Test
    @Order(4)
    void createsValidatedProjectsAndRejectsDuplicateOrganizationCodes() throws Exception {
        String request = """
                {
                  "name": "Centro Civico Norte",
                  "code": "CCN-2026-001",
                  "location": "Valencia",
                  "contractAmount": 750000.00
                }
                """;
        String response = mvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer demo-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Centro Civico Norte"))
                .andExpect(jsonPath("$.code").value("CCN-2026-001"))
                .andExpect(jsonPath("$.approvedProgress").value(0))
                .andExpect(jsonPath("$.documentCount").value(0))
                .andExpect(jsonPath("$.openAnomalies").value(0))
                .andExpect(jsonPath("$.criticalAnomalies").value(0))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.lastActivity").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        createdProjectId = objectMapper.readTree(response).get("id").asText();
        UUID.fromString(createdProjectId);

        mvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer demo-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Project code already exists for this organization"));
        mvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer demo-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"code\":\"BAD\",\"location\":\"Madrid\",\"contractAmount\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(5)
    void exposesProjectCountersAndAllowsInReviewThenOpenTransitions() throws Exception {
        String uploadJson = upload(createdProjectId, "critical-payment.txt", """
                contract_amount: 1000
                current_payment: 1200
                """);
        String documentId = objectMapper.readTree(uploadJson).get("id").asText();

        mvc.perform(post("/api/documents/{id}/process", documentId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));
        mvc.perform(get("/api/projects/{id}", createdProjectId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentCount").value(1))
                .andExpect(jsonPath("$.openAnomalies").value(1))
                .andExpect(jsonPath("$.criticalAnomalies").value(1))
                .andExpect(jsonPath("$.lastActivity").isNotEmpty());
        mvc.perform(get("/api/projects").header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + createdProjectId + "')].documentCount").exists())
                .andExpect(jsonPath("$[?(@.id == '" + createdProjectId + "')].openAnomalies").exists())
                .andExpect(jsonPath("$[?(@.id == '" + createdProjectId + "')].criticalAnomalies").exists());

        String anomaliesJson = mvc.perform(get("/api/projects/{id}/anomalies", createdProjectId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].severity").value("CRITICAL"))
                .andReturn().getResponse().getContentAsString();
        String anomalyId = objectMapper.readTree(anomaliesJson).get(0).get("id").asText();

        mvc.perform(post("/api/anomalies/{id}/review", anomalyId)
                        .header("Authorization", "Bearer demo-reviewer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"IN_REVIEW\",\"comment\":\"Reviewing source evidence\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_REVIEW"));

        mvc.perform(post("/api/documents/{id}/process", documentId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));
        mvc.perform(get("/api/projects/{id}/anomalies", createdProjectId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(anomalyId))
                .andExpect(jsonPath("$[0].status").value("IN_REVIEW"));
        mvc.perform(get("/api/projects/{id}", createdProjectId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openAnomalies").value(1))
                .andExpect(jsonPath("$.criticalAnomalies").value(1));
        mvc.perform(get("/api/dashboard").header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criticalFindings").isNumber());

        mvc.perform(post("/api/anomalies/{id}/review", anomalyId)
                        .header("Authorization", "Bearer demo-reviewer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"OPEN\",\"comment\":\"Returned to the open queue\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));
        mvc.perform(get("/api/projects/{id}/audit-events", createdProjectId)
                        .header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action == 'ANOMALY_REVIEWED' && @.details == 'IN_REVIEW')]").exists())
                .andExpect(jsonPath("$[?(@.action == 'ANOMALY_REVIEWED' && @.details == 'OPEN')]").exists());
    }

    private String upload(String filename, String fixture) throws Exception {
        return upload(PROJECT_ID, filename, fixture);
    }

    private String upload(String projectId, String filename, String fixture) throws Exception {
        var file = new MockMultipartFile("file", filename, "text/plain", fixture.getBytes(StandardCharsets.UTF_8));
        return mvc.perform(multipart("/api/projects/{projectId}/documents", projectId)
                        .file(file).header("Authorization", "Bearer demo-admin"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PROCESSED"))
                .andReturn().getResponse().getContentAsString();
    }
}
