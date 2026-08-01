insert into organizations (id, name, created_at) values
    ('00000000-0000-0000-0000-000000000001', 'Constructora Horizonte Demo', current_timestamp);

insert into app_users (id, organization_id, email, display_name, role, created_at) values
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ana@demo.obraclara.local', 'Ana Demo', 'ADMIN', current_timestamp),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'rafael@demo.obraclara.local', 'Rafael Revisor', 'REVIEWER', current_timestamp);

insert into projects (id, organization_id, name, code, location, contract_amount, approved_progress, created_at) values
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
     'Residencial Alameda', 'RA-2026-014', 'Madrid', 120000.00, 45.00, current_timestamp);
