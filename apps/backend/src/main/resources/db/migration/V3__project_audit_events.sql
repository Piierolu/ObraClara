alter table audit_events add column project_id varchar(36) references projects(id);
create index idx_audit_project_tenant_created on audit_events(project_id, organization_id, created_at);
