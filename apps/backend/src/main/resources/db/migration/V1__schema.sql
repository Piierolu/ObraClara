create table organizations (
    id varchar(36) primary key,
    name varchar(200) not null,
    created_at timestamp with time zone not null
);

create table app_users (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    email varchar(255) not null,
    display_name varchar(200) not null,
    role varchar(30) not null,
    created_at timestamp with time zone not null,
    unique (organization_id, email)
);

create table projects (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    name varchar(200) not null,
    code varchar(60) not null,
    location varchar(255),
    contract_amount numeric(19,2) not null,
    approved_progress numeric(7,2) not null,
    created_at timestamp with time zone not null,
    unique (organization_id, code)
);

create table documents (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    project_id varchar(36) not null references projects(id),
    original_file_name varchar(255) not null,
    content_type varchar(150),
    size_bytes bigint not null,
    storage_key varchar(500) not null,
    status varchar(30) not null,
    document_type varchar(100),
    processing_mode varchar(50),
    failure_reason varchar(1000),
    created_at timestamp with time zone not null,
    processed_at timestamp with time zone
);

create table extracted_fields (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    project_id varchar(36) not null references projects(id),
    document_id varchar(36) not null references documents(id),
    name varchar(100) not null,
    raw_value varchar(2000),
    normalized_value varchar(1000),
    confidence double precision not null,
    page_number integer not null,
    quote_text varchar(4000)
);

create table evidences (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    project_id varchar(36) not null references projects(id),
    document_id varchar(36) not null references documents(id),
    page_number integer not null,
    quote_text varchar(4000),
    bounding_box varchar(1000)
);

create table anomalies (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    project_id varchar(36) not null references projects(id),
    document_id varchar(36) not null references documents(id),
    type varchar(60) not null,
    status varchar(30) not null,
    severity varchar(30) not null,
    message varchar(1000) not null,
    field_names varchar(500),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create table review_decisions (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    anomaly_id varchar(36) not null references anomalies(id),
    reviewer_user_id varchar(36) not null references app_users(id),
    decision varchar(30) not null,
    comment_text varchar(1000) not null,
    created_at timestamp with time zone not null
);

create table audit_events (
    id varchar(36) primary key,
    organization_id varchar(36) not null references organizations(id),
    actor_user_id varchar(36) not null references app_users(id),
    action varchar(80) not null,
    entity_type varchar(80) not null,
    entity_id varchar(36) not null,
    details varchar(2000),
    created_at timestamp with time zone not null
);

create index idx_projects_tenant on projects(organization_id);
create index idx_documents_project_tenant on documents(project_id, organization_id);
create index idx_fields_project_name on extracted_fields(project_id, organization_id, name);
create index idx_evidences_document on evidences(document_id, organization_id);
create index idx_anomalies_project_tenant on anomalies(project_id, organization_id);
create index idx_audit_tenant_created on audit_events(organization_id, created_at);
